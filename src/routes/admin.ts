
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { adminMiddleware } from "../middleware/admin";
import { GameService } from "../services/GameService";

const prisma = new PrismaClient();

export async function adminRoutes(fastify: FastifyInstance) {
    // Apply middleware to all routes in this context
    fastify.addHook("preHandler", adminMiddleware);

    // DASHBOARD STATS
    fastify.get("/stats", async (req, reply) => {
        console.log("AdminRoutes: Hitting /stats");
        const totalUsers = await prisma.user.count();
        const activeGames = await prisma.game.count({ where: { status: "ACTIVE" } });
        const recentBets = await prisma.betLock.aggregate({
            _sum: { amount: true },
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        });

        return {
            totalUsers,
            activeGames,
            volume24h: recentBets._sum.amount || 0
        };
    });

    // USERS MANAGEMENT
    fastify.get("/users", async (req, reply) => {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, email: true, role: true, elo: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return users;
    });

    // BAN / ROLE CHANGE
    fastify.post("/users/:id/role", async (req, reply) => {
        const { id } = req.params as any;
        const { role } = req.body as any; // ADMIN, USER, BANNED

        await prisma.user.update({
            where: { id },
            data: { role }
        });

        return { success: true };
    });

    // ADJUST BALANCE
    fastify.post("/users/:id/balance", async (req, reply) => {
        const { id } = req.params as any;
        const { amount, type } = req.body as any; // amount: number, type: "CREDIT" | "DEBIT"

        const wallet = await prisma.wallet.findUnique({ where: { userId: id } });
        if (!wallet) return reply.status(404).send("Wallet not found");

        const newBalance = type === "CREDIT" ? wallet.balance + amount : wallet.balance - amount;

        await prisma.wallet.update({
            where: { userId: id },
            data: { balance: newBalance }
        });

        // Log it? Ideally yes.
        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: id,
                amount: type === "CREDIT" ? amount : -amount,
                type: "ADMIN_ADJUSTMENT"
            }
        });

        return { success: true, newBalance };
    });

    // GAMES MANAGEMENT
    fastify.get("/games", async (req, reply) => {
        const games = await prisma.game.findMany({
            where: { status: "ACTIVE" },
            include: { players: true },
            orderBy: { createdAt: 'desc' }
        });
        return games;
    });

    fastify.post("/games/:id/finish", async (req, reply) => {
        const { id } = req.params as any;
        const { winnerId } = req.body as any;

        // Force finish via GameService
        await GameService.finishGame(id, winnerId);
        return { success: true };
    });
}
