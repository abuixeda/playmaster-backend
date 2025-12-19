import prisma from "../lib/prisma";

export class GameService {
    /**
     * Creates bet locks for a match between two players.
     * Deducts funds and creates locks betting on themselves.
     */
    static async createMatchBets(gameId: string, p1Id: string, p2Id: string, amount: number) {
        console.log(`[GameService] Locking bets for ${gameId}: $${amount} from ${p1Id} and ${p2Id}`);
        if (amount <= 0) return true; // Free game

        try {
            await prisma.$transaction(async (tx: any) => {
                // Process Player 1
                const w1 = await tx.wallet.findUnique({ where: { userId: p1Id } });
                if (!w1 || w1.balance < amount) throw new Error(`Player ${p1Id} insufficient funds`);

                await tx.wallet.update({
                    where: { userId: p1Id },
                    data: { balance: { decrement: amount } }
                });

                await tx.walletLedger.create({
                    data: {
                        walletId: w1.id,
                        userId: p1Id,
                        amount: -amount,
                        type: "BET_LOCK"
                    }
                });

                await tx.betLock.create({
                    data: {
                        gameId,
                        userId: p1Id,
                        onPlayerId: p1Id, // Betting on self
                        amount: amount,
                        status: "PENDING"
                    }
                });

                // Process Player 2
                const w2 = await tx.wallet.findUnique({ where: { userId: p2Id } });
                if (!w2 || w2.balance < amount) throw new Error(`Player ${p2Id} insufficient funds`);

                await tx.wallet.update({
                    where: { userId: p2Id },
                    data: { balance: { decrement: amount } }
                });

                await tx.walletLedger.create({
                    data: {
                        walletId: w2.id,
                        userId: p2Id,
                        amount: -amount,
                        type: "BET_LOCK"
                    }
                });

                await tx.betLock.create({
                    data: {
                        gameId,
                        userId: p2Id,
                        onPlayerId: p2Id, // Betting on self
                        amount: amount,
                        status: "PENDING"
                    }
                });
            });
            console.log(`[GameService] Bets locked successfully for ${gameId}`);
            return true;
        } catch (error) {
            console.error(`[GameService] Failed to lock bets: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * Finalizes a game, determining the winner and settling bets.
     * @param gameId The ID of the game to finish.
     * @param winnerId The ID of the winning user, "TIE", or null/undefined to auto-calculate based on score.
     */
    static async finishGame(gameId: string, winnerId?: string | "TIE" | null) {
        console.log(`[GameService] finishGame called for ${gameId} with winner ${winnerId}`);
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) throw new Error("Game not found");

        if (game.status === "FINISHED") {
            return { id: game.id, status: game.status, alreadyFinished: true };
        }

        // Auto-calculate winner if not provided
        if (winnerId === undefined || winnerId === null) {
            winnerId = await this.getWinnerUserId(gameId);
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const bets = await tx.betLock.findMany({
                where: { gameId: gameId, status: "PENDING" },
                select: { id: true, userId: true, amount: true, onPlayerId: true },
            });

            if (bets.length > 0) {
                console.log(`[GameService] Found ${bets.length} pending bets for game ${gameId}`);
                if (winnerId === null || winnerId === "TIE") {
                    console.log(`[GameService] Refund logic for ${gameId}`);
                    // Refund
                    for (const b of bets) {
                        const w = await tx.wallet.upsert({
                            where: { userId: b.userId },
                            create: { userId: b.userId, balance: 0 },
                            update: {},
                            select: { id: true },
                        });

                        await tx.wallet.update({
                            where: { id: w.id },
                            data: { balance: { increment: b.amount } },
                        });

                        await tx.walletLedger.create({
                            data: {
                                walletId: w.id,
                                userId: b.userId,
                                amount: b.amount,
                                type: "BET_REFUND",
                            },
                        });

                        await tx.betLock.update({
                            where: { id: b.id },
                            data: { status: "VOID" },
                        });
                    }
                } else {
                    console.log(`[GameService] Winner determined: ${winnerId} for game ${gameId}`);
                    // Winner determined
                    for (const b of bets) {
                        // Check if user bet on the winner
                        // Logic: if I bet on player X, and X is winnerId -> I win.
                        if (b.onPlayerId === winnerId) {
                            const w = await tx.wallet.upsert({
                                where: { userId: b.userId },
                                create: { userId: b.userId, balance: 0 },
                                update: {},
                                select: { id: true },
                            });

                            // COMMISSION LOGIC: 2.5% of the TOTAL POT (which is amount * 2)
                            // User receives: (amount * 2) * (1 - 0.025)
                            const totalPot = b.amount * 2;
                            const commission = Math.floor(totalPot * 0.025);
                            const payout = totalPot - commission;

                            await tx.wallet.update({
                                where: { id: w.id },
                                data: { balance: { increment: payout } },
                            });

                            await tx.walletLedger.create({
                                data: {
                                    walletId: w.id,
                                    userId: b.userId,
                                    amount: payout,
                                    type: "BET_CREDIT", // Maybe "WIN_PAYOUT" better? Keeping consistent.
                                },
                            });

                            // Optional: Record commission? For now just implicitly taken.


                            await tx.betLock.update({
                                where: { id: b.id },
                                data: { status: "WON" },
                            });
                        } else {
                            await tx.betLock.update({
                                where: { id: b.id },
                                data: { status: "LOST" },
                            });
                        }
                    }
                }
            }

            // ---------------------------------------------------------
            // PERSIEST PLAYER SCORES (New Logic for History)
            // ---------------------------------------------------------
            const state = game.gameState as any;
            if (state) {
                const type = game.typeCode;
                let scores: Record<string, number> = {};

                if (type === "TRUCO" && state.points) {
                    scores = state.points;
                } else if (type === "RPS" && state.scores) {
                    scores = state.scores;
                } else if (type === "CHESS" || type === "POOL") {
                    // Binary score: Winner gets 1, Loser 0
                    if (winnerId && winnerId !== "TIE") {
                        // Find loser? We don't know loser explicitly without iterating players.
                        // But we can just set Winner = 1.
                        scores[winnerId] = 1;
                    }
                }

                // Update GamePlayers
                // iterating over keys of scores might miss players with 0 score if not in map
                // Better to iterate known players if possible, but we don't have them in 'bets' list fully if they didn't bet?
                // Actually 'bets' are for betting. We need GamePlayers.

                // Fetch GamePlayers for this game to update them
                const players = await tx.gamePlayer.findMany({ where: { gameId } });

                for (const p of players) {
                    let finalScore = 0;
                    if (type === "CHESS" || type === "POOL") {
                        // Binary
                        if (p.userId === winnerId) finalScore = 1;
                    } else {
                        // Points based
                        finalScore = scores[p.userId] || 0;
                    }

                    await tx.gamePlayer.update({
                        where: { id: p.id },
                        data: { score: finalScore }
                    });
                }
            }
            // ---------------------------------------------------------

            const updated = await tx.game.update({
                where: { id: gameId },
                data: { status: "FINISHED" },
                select: { id: true, status: true },
            });

            return updated;
        });

        return result;
    }

    private static async getWinnerUserId(gameId: string): Promise<string | "TIE" | null> {
        const players = await prisma.gamePlayer.findMany({
            where: { gameId },
            orderBy: { score: "desc" },
            select: { userId: true, score: true },
        });

        if (players.length === 0) return null;
        if (players.length === 1) return players[0].userId;

        const top = players[0];
        const second = players[1];

        if (top.score === second.score) return "TIE";
        return top.userId;
    }
}
