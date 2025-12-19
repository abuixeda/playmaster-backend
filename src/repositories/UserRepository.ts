import { prisma } from '../lib/prisma';
import { User, Wallet } from '@prisma/client';

export class UserRepository {

    static async create(email: string, username: string, passwordHash: string): Promise<User> {
        return prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                wallet: {
                    create: { balance: 0 } // Init wallet
                }
            }
        });
    }

    static async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { email } });
    }

    static async findByUsername(username: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { username } });
    }

    static async findByEmailOrUsername(identifier: string): Promise<User | null> {
        const where = identifier.includes("@")
            ? { email: identifier.trim().toLowerCase() }
            : { username: identifier.trim() };
        return prisma.user.findFirst({ where }); // findFirst because conditional where might not hit unique index directly in type system, though logic guarantees it
        // Actually best to try one or other if we can't do OR easily in findUnique.
        // Prisma findFirst is fine.
    }

    static async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id },
            include: { wallet: true }
        });
    }

    /**
     * Atomically update wallet balance.
     * @param userId 
     * @param amount Delta amount (positive to add, negative to subtract)
     * @param type Reason for transaction
     */
    static async updateBalance(userId: string, amount: number, type: string): Promise<Wallet> {
        return prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                include: { wallet: true }
            });

            if (!user || !user.wallet) throw new Error("User or Wallet not found");

            if (user.wallet.balance + amount < 0) {
                throw new Error("Insufficient funds");
            }

            // Create ledger entry
            await tx.walletLedger.create({
                data: {
                    walletId: user.wallet.id,
                    userId: user.id,
                    amount,
                    type
                }
            });

            // Update wallet
            return tx.wallet.update({
                where: { id: user.wallet.id },
                data: {
                    balance: { increment: amount }
                }
            });
        });
    }
}
