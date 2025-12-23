import prisma from "../lib/prisma";
import { BetRepository } from "../repositories/BetRepository";


export class GameService {
    /**
     * Creates bet locks for a match between two players.
     * Deducts funds and creates locks betting on themselves.
     */
    static async createMatchBets(gameId: string, p1Id: string, p2Id: string, amount: number) {
        console.log(`[GameService] Locking bets for ${gameId}: $${amount} from ${p1Id} and ${p2Id}`);
        if (amount <= 0) return true; // Free game

        try {
            // Attempt P1
            await BetRepository.placeBet(gameId, p1Id, p1Id, amount);

            try {
                // Attempt P2
                await BetRepository.placeBet(gameId, p2Id, p2Id, amount);
            } catch (p2Error) {
                console.error(`[GameService] Player 2 (${p2Id}) failed to bet. Refunding P1.`);
                await BetRepository.refundBets(gameId); // Safe to call, voids P1's pending bet
                throw p2Error;
            }

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

        // Settle Bets (Idempotent call)
        if (winnerId === null || winnerId === "TIE") {
            console.log(`[GameService] Refund logic for ${gameId}`);
            await BetRepository.refundBets(gameId);
        } else {
            console.log(`[GameService] Winner determined: ${winnerId} for game ${gameId}`);
            await BetRepository.settleBets(gameId, winnerId);
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // (Note: Bets settled outside this transaction via BetRepository)

            // Update scores logic remains here

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
