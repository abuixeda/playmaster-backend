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
}
