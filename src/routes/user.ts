import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../Plugin/requireAuth";

// Types for params/body
type UpdateProfileBody = {
    avatarUrl?: string;
    bio?: string;
    country?: string;
};

type IdParams = { id: string };

export default async function userRoutes(app: FastifyInstance) {

    // GET /api/users/me - Private Profile
    app.get("/api/users/me", { preHandler: [requireAuth] }, async (req, reply) => {
        try {
            const userId = (req as any).user.id;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { wallet: true }
            });

            if (!user) return reply.status(404).send({ error: "User not found" });

            console.log("Serving /me for user:", user.username, "Role:", (user as any).role);

            return reply.send({
                ...user,
                passwordHash: undefined,
                history: (await prisma.gamePlayer.findMany({
                    where: { userId },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        game: {
                            select: {
                                typeCode: true,
                                status: true,
                                createdAt: true,
                                players: {
                                    select: {
                                        userId: true,
                                        score: true,
                                        user: { select: { username: true } }
                                    }
                                },
                                bets: {
                                    where: { userId: userId },
                                    select: {
                                        amount: true,
                                        status: true
                                    }
                                }
                            }
                        }
                    }
                })).map(gp => {
                    // Calculate PnL based on BetLock
                    const bet = gp.game.bets[0]; // Should optionally exist
                    let pnl = 0;

                    if (bet) {
                        if (bet.status === 'WON') {
                            // Win logic: Net Profit = (Stake * 2 * 0.975) - Stake
                            // Simplified for display ~ Stake * 0.95
                            pnl = Math.floor(bet.amount * 0.95);
                        } else if (bet.status === 'LOST') {
                            pnl = -bet.amount;
                        } else {
                            // CANCELLED, REFUNDED, PENDING -> 0 PnL
                            pnl = 0;
                        }
                    }

                    const isWinner = gp.game.status === 'FINISHED' &&
                        gp.game.players.every(p => p.userId === userId ? true : p.score <= gp.score) &&
                        gp.game.players.some(p => p.userId !== userId && p.score < gp.score);

                    const opponent = gp.game.players.find(p => p.userId !== userId);

                    return {
                        id: gp.gameId,
                        gameType: gp.game.typeCode,
                        date: gp.game.createdAt,
                        status: gp.game.status,
                        outcome: pnl > 0 ? 'WIN' : (pnl < 0 ? 'LOSS' : 'DRAW'),
                        pnl: pnl,
                        score: gp.score,
                        opponentName: opponent ? opponent.user.username : 'Unknown'
                    };
                })
            });
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: "Server error" });
        }
    });

    // GET /api/users/me/profit - Financial Metrics (Private)
    app.get("/api/users/me/profit", { preHandler: [requireAuth] }, async (req, reply) => {
        try {
            const userId = (req as any).user.id;

            const ledger = await prisma.walletLedger.findMany({
                where: { userId }
            });

            let totalWagered = 0;
            let totalWon = 0;
            let netEarnings = 0;

            ledger.forEach(entry => {
                if (entry.type === "BET_LOCK") {
                    totalWagered += Math.abs(entry.amount);
                    netEarnings += entry.amount; // entry.amount is negative
                }
                if (entry.type === "BET_CREDIT") {
                    totalWon += entry.amount;
                    netEarnings += entry.amount;
                }
            });

            return reply.send({
                netEarnings,
                totalWagered,
                totalWon
            });
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: "Server error" });
        }
    });

    // PUT /api/users/me - Update Profile
    app.put<{ Body: UpdateProfileBody }>("/api/users/me", { preHandler: [requireAuth] }, async (req, reply) => {
        try {
            const userId = (req as any).user.id;
            const { avatarUrl, bio, country } = req.body;

            const updated = await prisma.user.update({
                where: { id: userId },
                data: {
                    avatarUrl,
                    bio,
                    country
                }
            });

            return reply.send({
                ...updated,
                passwordHash: undefined
            });
        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: "Update failed" });
        }
    });

    // GET /api/users/:id - Public Profile
    app.get<{ Params: IdParams }>("/api/users/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            // Handle 'me' alias if user sends it without auth header check (though better to use /me endpoint)
            // But if generic link profile/:id is used, we treat it as public.

            const user = await prisma.user.findUnique({
                where: { id }
            });

            if (!user) return reply.status(404).send({ error: "User not found" });

            // Calculate Stats (Dynamically)
            const totalGames = await prisma.gamePlayer.count({ where: { userId: id } });

            // Build Public Object (Exclude sensitive data)
            return reply.send({
                id: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                country: user.country,
                elo: user.elo,
                createdAt: user.createdAt,
                stats: {
                    totalGames,
                    wins: 0, // Placeholder
                    losses: 0 // Placeholder
                }
            });

        } catch (error) {
            console.error(error);
            return reply.status(500).send({ error: "Server error" });
        }
    });
}
