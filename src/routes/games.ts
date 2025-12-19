// src/routes/games.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../Plugin/requireAuth";

// ---------- Tipos de request ----------
type CreateGameBody = {
  typeCode: string;
  options?: { // Opciones específicas de Truco
    targetScore?: 15 | 30;
    withFlor?: boolean;
  }
};
type IdParam = { id: string };
type JoinParams = { id: string };
type ScoreParams = { id: string };
type ScoreBody = { userId: string; score: number };
type HistoryQuery = { me?: string; limit?: string; cursor?: string };

// ---------- Helpers ----------
// (Moved logic to GameService)

export default async function gamesRoutes(app: FastifyInstance) {
  // ------------------------------------
  // Crear sala
  // ------------------------------------
  app.post<{ Body: CreateGameBody }>(
    "/api/games",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const body = req.body ?? ({} as CreateGameBody);
      const typeCode = (body.typeCode ?? "").toUpperCase().trim();

      if (!typeCode) {
        return reply.status(400).send({ error: "typeCode requerido" });
      }

      const def = await prisma.gameDefinition.findUnique({
        where: { code: typeCode },
      });

      if (!def || !def.isActive) {
        return reply.status(400).send({ error: "Juego no disponible" });
      }

      const userId = req.user!.id;

      const game = await prisma.$transaction(async (tx: any) => {
        const newGame = await tx.game.create({
          data: {
            typeCode,
            status: "WAITING",
            gameState: { options: body.options }, // Guardar opciones iniciales
          },
          select: { id: true, typeCode: true, status: true, createdAt: true },
        });

        await tx.gamePlayer.create({
          data: {
            gameId: newGame.id,
            userId,
          },
        });

        // Initialize State if Truco
        let initialGameState = null;
        if (typeCode === "TRUCO") {
          const { TrucoLogic } = await import("../services/truco/TrucoLogic");
          // Assuming 2 players for now locally, but we need the player IDs.
          // Wait, at creation time we only have the creator. 
          // Truco state needs ALL players to deal cards.
          // PROBLEM: We cannot create the full card state until the second player joins.
          // SOLUTION: Create game with status WAITING and null state. Initialize state when game becomes ACTIVE (when 2nd player joins).
        }

        return newGame;
      });

      return reply.status(201).send(game);
    }
  );

  // ------------------------------------
  // Historial de partidas finalizadas
  //  - /api/games/history?me=true&limit=10&cursor=xxx
  // ------------------------------------
  app.get<{ Querystring: HistoryQuery }>(
    "/api/games/history",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const userId = req.user!.id;
      const { me, limit = "10", cursor } = req.query ?? {};
      const take = Math.max(1, Math.min(50, Number(limit) || 10));

      const whereBase = { status: "FINISHED" as const };
      const where =
        me === "true" || me === "1" || (me as any) === true
          ? { ...whereBase, players: { some: { userId } } }
          : whereBase;

      const items = await prisma.game.findMany({
        where,
        take,
        ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          typeCode: true,
          createdAt: true,
          status: true,
        },
      });

      const nextCursor = items.length === take ? items[items.length - 1].id : null;
      return reply.send({ items, nextCursor });
    }
  );

  // ------------------------------------
  // Unirse a una sala
  // ------------------------------------
  app.post<{ Params: JoinParams }>(
    "/api/games/:id/join",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params;
      const userId = req.user!.id;

      const game = await prisma.game.findUnique({ where: { id } });
      if (!game) return reply.status(404).send({ error: "Sala no encontrada" });

      if (game.status !== "WAITING") {
        return reply.status(400).send({ error: "La sala no acepta más jugadores" });
      }

      const def = await prisma.gameDefinition.findUnique({
        where: { code: game.typeCode },
      });
      const count = await prisma.gamePlayer.count({ where: { gameId: id } });
      if (def && count >= def.maxPlayers) {
        return reply.status(400).send({ error: "Sala llena" });
      }

      const already = await prisma.gamePlayer.findFirst({
        where: { gameId: id, userId },
      });
      if (already) return reply.status(200).send(already);

      const gp = await prisma.gamePlayer.create({
        data: { gameId: id, userId },
        select: { id: true, gameId: true, userId: true, score: true },
      });

      // activar si llega al mínimo
      if (def && count + 1 >= def.minPlayers) {
        // LOGIC FOR STARTING TRUCO GAME
        let updateData: any = { status: "ACTIVE" };

        if (def && def.code === "TRUCO") {
          const { TrucoLogic } = await import("../services/truco/TrucoLogic");
          const allPlayers = await prisma.gamePlayer.findMany({ where: { gameId: id }, select: { userId: true } });
          const playerIds = allPlayers.map(p => p.userId);

          // Read options from previously saved gameState
          const currentGameState = (await prisma.game.findUnique({ where: { id }, select: { gameState: true } }))?.gameState as any;
          const savedOptions = currentGameState?.options || {};

          const options = {
            targetScore: savedOptions.targetScore || 30,
            withFlor: savedOptions.withFlor !== undefined ? savedOptions.withFlor : true
          };

          const initialState = TrucoLogic.createInitialState(playerIds, options);
          updateData.gameState = initialState;
        }

        await prisma.game.update({
          where: { id },
          data: updateData,
        });
      }

      return reply.status(201).send(gp);
    }
  );

  // ------------------------------------
  // Obtener sala con sus jugadores
  // ------------------------------------
  app.get<{ Params: IdParam }>(
    "/api/games/:id",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params;

      const data = await prisma.game.findUnique({
        where: { id },
        include: {
          players: {
            select: { id: true, userId: true, score: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!data) return reply.status(404).send({ error: "Sala no encontrada" });
      return reply.send(data);
    }
  );

  // ------------------------------------
  // Actualizar score (dev / admin)
  // ------------------------------------
  app.post<{ Params: ScoreParams; Body: ScoreBody }>(
    "/api/games/:id/score",
    { preHandler: [requireAuth] },
    async (
      req: FastifyRequest<{ Params: ScoreParams; Body: ScoreBody }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params;
      const { userId, score } = req.body;

      if (!id) return reply.status(400).send({ error: "id requerido" });
      if (!userId || typeof score !== "number") {
        return reply
          .status(400)
          .send({ error: "userId y score numérico son requeridos" });
      }

      const game = await prisma.game.findUnique({ where: { id } });
      if (!game) return reply.status(404).send({ error: "Sala no encontrada" });

      const gp = await prisma.gamePlayer.findFirst({
        where: { gameId: id, userId },
      });
      if (!gp)
        return reply
          .status(404)
          .send({ error: "Ese usuario no está en la sala" });

      const updated = await prisma.gamePlayer.update({
        where: { id: gp.id },
        data: { score },
        select: { id: true, userId: true, score: true },
      });

      return reply.send({ ok: true, player: updated });
    }
  );

  // ------------------------------------
  // Apostar en una sala (crear BetLock)
  // ------------------------------------
  app.post<{
    Params: { id: string };
    Body: { amount: number; onPlayerId: string };
  }>(
    "/api/games/:id/bets",
    { preHandler: [requireAuth] },
    async (
      req: FastifyRequest<{
        Params: { id: string };
        Body: { amount: number; onPlayerId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = req.params; // gameId
      const { amount, onPlayerId } = req.body;
      const userId = req.user!.id;

      // 1. Validaciones básicas
      if (!amount || !onPlayerId) {
        return reply
          .status(400)
          .send({ error: "amount y onPlayerId son requeridos" });
      }

      // 2. Chequear que la sala exista
      const game = await prisma.game.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!game) {
        return reply.status(404).send({ error: "Sala no encontrada" });
      }

      // No permitir apuestas en sala finalizada
      if (game.status === "FINISHED") {
        return reply
          .status(400)
          .send({ error: "No se puede apostar en una sala finalizada" });
      }

      // 3. Chequear que el user al que apuesto esté en la sala
      const targetPlayer = await prisma.gamePlayer.findFirst({
        where: {
          gameId: id,
          userId: onPlayerId,
        },
      });

      if (!targetPlayer) {
        return reply
          .status(400)
          .send({ error: "onPlayerId no pertenece a esta sala" });
      }

      // 4. Chequear / asegurar que el apostador tenga wallet
      const wallet = await prisma.wallet.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: {},
        select: { id: true, balance: true },
      });

      // 5. Chequear saldo suficiente
      if (wallet.balance < amount) {
        return reply
          .status(400)
          .send({ error: "Saldo insuficiente para apostar" });
      }

      // 6. Transacción: descontar saldo + registrar movimiento + crear BetLock
      const bet = await prisma.$transaction(async (tx: any) => {
        // Restar del wallet
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } },
        });

        // Registrar en ledger (movimiento de apuesta)
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            userId,
            amount: amount * -1,
            type: "BET_PLACED",
          },
        });

        // Guardar la apuesta como "PENDING"
        const newBet = await tx.betLock.create({
          data: {
            gameId: id,
            userId, // quién apostó
            onPlayerId,
            amount,
            status: "PENDING",
          },
          select: {
            id: true,
            gameId: true,
            userId: true,
            onPlayerId: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        });

        return newBet;
      });

      return reply.status(201).send(bet);
    }
  );

  // ------------------------------------
  // Finalizar sala + liquidar apuestas BetLock
  // ------------------------------------
  app.post<{ Params: IdParam }>(
    "/api/games/:id/finish",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params;
      const { GameService } = await import("../services/GameService");

      try {
        const result = await GameService.finishGame(id);
        return reply.send(result);
      } catch (e: any) {
        if (e.message === "Game not found") {
          return reply.status(404).send({ error: "Sala no encontrada" });
        }
        console.error(e);
        return reply.status(500).send({ error: "Error finalizando partida" });
      }
    }
  );

  // ------------------------------------
  // Realizar Movimiento (Juego)
  // ------------------------------------
  app.post<{ Params: IdParam; Body: any }>(
    "/api/games/:id/move",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params;
      const userId = req.user!.id;
      const move = req.body;

      const game = await prisma.game.findUnique({ where: { id } });
      if (!game) return reply.status(404).send({ error: "Sala no encontrada" });
      if (game.status !== "ACTIVE") {
        return reply.status(400).send({ error: "La sala no está activa" });
      }

      // Validar que el usuario sea jugador de la sala
      const gp = await prisma.gamePlayer.findFirst({
        where: { gameId: id, userId },
      });
      if (!gp) return reply.status(403).send({ error: "No eres jugador de esta sala" });

      // Validar movimiento con GameEngine
      const { GameEngine } = await import("../services/GameEngine");
      const error = GameEngine.validateMove(game.typeCode, (game as any).gameState, move, userId);

      if (error) {
        return reply.status(400).send({ error });
      }

      // Aplicar movimiento
      const { state: newState, isGameOver, winnerId } = GameEngine.applyMove(game.typeCode, (game as any).gameState, move, userId);

      // Actualizar estado en DB
      let updated = await prisma.game.update({
        where: { id },
        data: { gameState: newState } as any,
        select: { id: true, gameState: true, status: true } as any,
      });

      // Si el juego termina con este movimiento, finalizarlo
      if (isGameOver) {
        const { GameService } = await import("../services/GameService");
        // Llamamos a finishGame. Si winnerId viene de applyMove, lo usamos.
        await GameService.finishGame(id, winnerId);
        // Recargamos estado para devolverlo actualizado (opcional, pero útil)
        updated = (await prisma.game.findUnique({
          where: { id },
          select: { id: true, gameState: true, status: true }
        })) as any;
      }

      return reply.send(updated);
    }
  );
}
