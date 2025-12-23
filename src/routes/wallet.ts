// src/routes/wallet.ts
import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../Plugin/requireAuth";
import { MercadoPagoService } from "../services/MercadoPagoService";

// Crea la wallet si no existe
async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    create: { userId, balance: 0 },
    update: {},
    select: { id: true, userId: true, balance: true }
  });
}

// Valida y normaliza amount (centavos)
function parseAmount(input: unknown): number | null {
  const n = Number(input);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export default async function walletRoutes(app: FastifyInstance) {
  // INIT (idempotente): crea la wallet si no existe
  app.post("/api/wallet/init", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const wallet = await ensureWallet(userId);
    return reply.status(201).send({ balance: wallet.balance, currency: "cents" });
  });

  // BALANCE / ME: saldo + últimos movimientos
  app.get("/api/wallet/me", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    console.log(`[WALLET_DEBUG] Fetching balance for UserID: ${userId}`);
    const wallet = await ensureWallet(userId);

    const last = await prisma.walletLedger.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, amount: true, createdAt: true }
    });

    console.log(`[WALLET_DEBUG] Balance found: ${wallet.balance}`);
    return reply.send({ balance: wallet.balance, currency: "cents", last });
  });

  // Alias por si preferís /balance
  app.get("/api/wallet/balance", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const wallet = await ensureWallet(userId);
    return reply.send({ balance: wallet.balance, currency: "cents" });
  });

  // DEPOSIT (dev-only): suma saldo y registra movimiento
  app.post("/api/wallet/deposit", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const amount = parseAmount((req.body as any)?.amount);
    if (amount == null) return reply.status(400).send({ error: "amount entero (>0) en centavos es requerido" });

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.upsert({
        where: { userId },
        create: { userId, balance: 0 },
        update: {},
        select: { id: true, balance: true }
      });

      const res = await tx.wallet.update({
        where: { id: w.id },
        data: { balance: { increment: amount } },
        select: { id: true, balance: true }
      });

      await tx.walletLedger.create({
        data: { walletId: w.id, userId, amount, type: "DEPOSIT" }
      });

      return res;
    });

    return reply.status(201).send({ balance: updated.balance, currency: "cents" });
  });

  // WITHDRAW (dev-only): resta saldo si alcanza y registra movimiento
  app.post("/api/wallet/withdraw", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const amount = parseAmount((req.body as any)?.amount);
    if (amount == null) return reply.status(400).send({ error: "amount entero (>0) en centavos es requerido" });

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const w = await tx.wallet.upsert({
          where: { userId },
          create: { userId, balance: 0 },
          update: {},
          select: { id: true, balance: true }
        });

        if (w.balance < amount) {
          throw new Error("Saldo insuficiente");
        }

        const res = await tx.wallet.update({
          where: { id: w.id },
          data: { balance: { decrement: amount } },
          select: { id: true, balance: true }
        });

        await tx.walletLedger.create({
          data: { walletId: w.id, userId, amount, type: "WITHDRAW" }
        });

        return res;
      });

      return reply.status(201).send({ balance: updated.balance, currency: "cents" });
    } catch (e: any) {
      if (e?.message === "Saldo insuficiente") {
        return reply.status(400).send({ error: "Saldo insuficiente" });
      }
      throw e;
    }
  });

  // HISTORY: lista de movimientos (paginable simple)
  app.get("/api/wallet/history", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const wallet = await ensureWallet(userId);

    const q = req.query as any;
    const take = Math.min(Math.max(Number(q?.limit ?? 20), 1), 100);

    const rows = await prisma.walletLedger.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, type: true, amount: true, createdAt: true }
    });

    return reply.send({ balance: wallet.balance, currency: "cents", items: rows });
  });

  // MP: BUY COINS (Deposit)
  app.post("/api/wallet/deposit/buy-coins", { preHandler: [requireAuth] }, async (req, reply) => {
    const userId = req.user!.id;
    const body = req.body as any;
    const amountOfCoins = parseAmount(body.amountOfCoins); // Using parseAmount as integer validator

    if (!amountOfCoins) {
      return reply.status(400).send({ error: "amountOfCoins required (>0)" });
    }

    const COIN_PRICE_ARS = 1; // 1 Coin = 1 ARS
    const price = amountOfCoins * COIN_PRICE_ARS;

    const wallet = await ensureWallet(userId);

    // Create Preference in MP
    try {
      const preference = await MercadoPagoService.createPreference({
        userId,
        amountOfCoins,
        priceInArs: price,
        title: `Carga de ${amountOfCoins} PlayCoins`
      });

      // Record Pending Intent
      await prisma.walletLedger.create({
        data: {
          walletId: wallet.id,
          userId,
          amount: amountOfCoins,
          type: "PENDING_DEPOSIT" // Not adding balance yet
        }
      });

      return reply.send({
        status: "created",
        checkout_url: preference.init_point,
        sandbox_checkout_url: preference.sandbox_init_point,
        price_ars: price
      });

    } catch (e: any) {
      console.error("MP Error:", e);
      return reply.status(500).send({ error: "Error creating payment preference" });
    }
  });
}


