import { prisma } from '../lib/prisma';
import { BetLock } from '@prisma/client';

export class BetRepository {

    /**
     * Places a bet by locking funds from user wallet.
     * Transactional: if wallet fails, bet is not placed.
     */
    static async placeBet(gameId: string, userId: string, onPlayerId: string, amount: number): Promise<BetLock> {
        return prisma.$transaction(async (tx) => {
            // 1. Check & Deduct Balance
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallet: true }
            });

            if (!user || !user.wallet) throw new Error("Wallet not found");
            if (user.wallet.balance < amount) throw new Error("Insufficient funds for bet");

            // Deduct
            await tx.wallet.update({
                where: { id: user.wallet.id },
                data: { balance: { decrement: amount } }
            });

            // Ledger
            await tx.walletLedger.create({
                data: {
                    walletId: user.wallet.id,
                    userId,
                    amount: -amount,
                    type: "BET_LOCK"
                }
            });

            // 2. Create Lock
            return tx.betLock.create({
                data: {
                    gameId,
                    userId,
                    onPlayerId,
                    amount,
                    status: 'LOCKED'
                }
            });
        });
    }

    static async findByGame(gameId: string): Promise<BetLock[]> {
        return prisma.betLock.findMany({
            where: { gameId }
        });
    }

    /**
     * Settles bets for a completed game.
     * Distributes winnings to those who bet on the winner.
     * Losers get nothing.
     * @param gameId 
     * @param winnerId 
     */
    static async settleBets(gameId: string, winnerId: string): Promise<void> {
        return prisma.$transaction(async (tx) => {
            const bets = await tx.betLock.findMany({
                where: { gameId, status: "PENDING" }
            });

            for (const b of bets) {
                if (b.onPlayerId === winnerId) {
                    // WINNER
                    // Commission: 2.5% of total pot (amount * 2)
                    // Payout: (amount * 2) * 0.975
                    const totalPot = b.amount * 2;
                    const commission = Math.floor(totalPot * 0.025);
                    const payout = totalPot - commission;

                    const w = await tx.wallet.upsert({
                        where: { userId: b.userId },
                        create: { userId: b.userId, balance: 0 },
                        update: {},
                        select: { id: true }
                    });

                    await tx.wallet.update({
                        where: { id: w.id },
                        data: { balance: { increment: payout } }
                    });

                    await tx.walletLedger.create({
                        data: {
                            walletId: w.id,
                            userId: b.userId,
                            amount: payout,
                            type: "BET_CREDIT"
                        }
                    });

                    await tx.betLock.update({
                        where: { id: b.id },
                        data: { status: "WON" }
                    });

                } else {
                    // LOSER
                    await tx.betLock.update({
                        where: { id: b.id },
                        data: { status: "LOST" }
                    });
                }
            }
        });
    }

    /**
     * Refunds all pending bets for a game.
     * Used for TIEs or cancelled games.
     * @param gameId 
     */
    static async refundBets(gameId: string): Promise<void> {
        return prisma.$transaction(async (tx) => {
            const bets = await tx.betLock.findMany({
                where: { gameId, status: "PENDING" }
            });

            for (const b of bets) {
                const w = await tx.wallet.upsert({
                    where: { userId: b.userId },
                    create: { userId: b.userId, balance: 0 },
                    update: {},
                    select: { id: true }
                });

                await tx.wallet.update({
                    where: { id: w.id },
                    data: { balance: { increment: b.amount } }
                });

                await tx.walletLedger.create({
                    data: {
                        walletId: w.id,
                        userId: b.userId,
                        amount: b.amount,
                        type: "BET_REFUND"
                    }
                });

                await tx.betLock.update({
                    where: { id: b.id },
                    data: { status: "VOID" }
                });
            }
        });
    }
}
