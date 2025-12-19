// src/routes/ranking.ts
import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../Plugin/requireAuth";
import { GameStatus } from "@prisma/client";

// util: dado un array de jugadores, devuelve userId ganador | "TIE" | null
function getWinnerFromPlayers(
  players: Array<{ userId: string; score: number }>
): string | "TIE" | null {
  if (!players || players.length === 0) return null;
  const sorted = [...players].sort((a, b) => b.score - a.score);

  if (sorted.length === 1) return sorted[0].userId;
  if (sorted[0].score === sorted[1].score) return "TIE";
  return sorted[0].userId;
}

export default async function rankingRoutes(app: FastifyInstance) {
  app.get(
    "/api/ranking/global",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const q = req.query as any;

      // parámetros
      const period: string = q?.period ?? "30d"; // 7d, 30d, 24h, all
      const limit: number = Math.min(parseInt(q?.limit ?? "100", 10) || 100, 500);

      // parseo del período
      let dateFilter: Date | undefined;
      if (period !== "all") {
        const num = parseInt(period, 10);
        if (Number.isFinite(num)) {
          if (period.endsWith("d")) {
            dateFilter = new Date(Date.now() - num * 24 * 60 * 60 * 1000);
          } else if (period.endsWith("h")) {
            dateFilter = new Date(Date.now() - num * 60 * 60 * 1000);
          }
        }
      }

      // buscamos SOLO partidas terminadas; si hay periodo, por fecha de creación
      const where: any = { status: GameStatus.FINISHED };
      if (dateFilter) {
        where.createdAt = { gte: dateFilter };
      }

      const games = await prisma.game.findMany({
        where,
        include: {
          players: {
            select: { userId: true, score: true },
          },
        },
      });

      // acumulamos victorias por userId
      const wins: Record<string, number> = {};
      for (const g of games) {
        const winner = getWinnerFromPlayers(g.players);
        if (winner && winner !== "TIE") {
          wins[winner] = (wins[winner] ?? 0) + 1;
        }
      }

      // armamos ranking ordenado
      const pairs = Object.entries(wins) // [userId, wins][]
        .map(([userId, w]) => ({ userId, wins: w }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, limit);

      // opcional: enriquecer con username/email
      const ids = pairs.map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true, email: true },
      });
      const byId = new Map(users.map((u) => [u.id, u]));

      const ranking = pairs.map((p) => ({
        userId: p.userId,
        wins: p.wins,
        username: byId.get(p.userId)?.username ?? null,
        email: byId.get(p.userId)?.email ?? null,
      }));

      return reply.send({
        period,
        limit,
        totalGames: games.length,
        ranking,
      });
    }
  );
}
