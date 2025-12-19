
import { FastifyInstance } from "fastify";
import prisma from "../lib/prisma";
import { MercadoPagoService } from "../services/MercadoPagoService";

export default async function webhookRoutes(app: FastifyInstance) {

    // Public Endpoint for MP Notifications
    app.post("/api/webhooks/mercadopago", async (req, reply) => {
        const body = req.body as any;
        const { type, data } = body;

        // Log for debugging
        console.log("⚡ Webhook MP Received:", JSON.stringify(body));

        if (type === "payment" && data?.id) {
            try {
                // 1. Verify real status with MP
                const payment = await MercadoPagoService.validatePayment(data.id);

                if (payment.status === "approved") {
                    const metadata = payment.metadata as any;
                    const userId = metadata.user_id;
                    const coinsAmount = Number(metadata.coins_amount); // Parse just in case

                    if (userId && coinsAmount > 0) {
                        console.log(`✅ Payment Approved for User ${userId}: ${coinsAmount} Coins`);

                        // 2. Transaction: Credit User
                        // We look for the OLDEST Pending Deposit for this amount to avoid "eating" new requests? 
                        // No, usually we want to match correct one. 
                        // Let's just find ANY Pending Deposit for this user and amount.

                        await prisma.$transaction(async (tx) => {
                            // Find a pending ledger to "confirm"
                            const pending = await tx.walletLedger.findFirst({
                                where: {
                                    userId: userId,
                                    amount: coinsAmount,
                                    type: "PENDING_DEPOSIT"
                                },
                                orderBy: { createdAt: 'asc' } // Consume oldest first? Or latest? Oldest makes sense to clear queue.
                            });

                            if (pending) {
                                // Convert PENDING -> DEPOSIT
                                await tx.walletLedger.update({
                                    where: { id: pending.id },
                                    data: { type: "DEPOSIT" }
                                });
                            } else {
                                // If no pending found (maybe direct link?), forcefully create a DEPOSIT record
                                // This ensures user gets coins even if flow was weird
                                console.warn("⚠️ No matches for PENDING_DEPOSIT. Creating new DEPOSIT record.");
                                const wallet = await tx.wallet.findUnique({ where: { userId } });
                                if (wallet) {
                                    await tx.walletLedger.create({
                                        data: {
                                            walletId: wallet.id,
                                            userId,
                                            amount: coinsAmount,
                                            type: "DEPOSIT"
                                        }
                                    });
                                }
                            }

                            // Increment Balance
                            await tx.wallet.update({
                                where: { userId },
                                data: { balance: { increment: coinsAmount } }
                            });
                        });

                        console.log("💰 Coins Credited Successfully");
                    }
                }
            } catch (e) {
                console.error("❌ Error processing webhook:", e);
                // Do not return 500 to MP if it's our logic error, or they will retry indefinitely.
                // Return 200 to acknowledge receipt unless we want retry.
            }
        }

        return reply.status(200).send("OK");
    });
}
