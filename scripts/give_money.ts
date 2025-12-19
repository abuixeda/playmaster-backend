
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== GIVING MONEY TO EVERYONE ===");

    // Update all wallets to have at least 10000
    // Actually just set everyone to 10000 to be safe/rich for testing.
    await prisma.wallet.updateMany({
        data: { balance: 10000 }
    });

    console.log("✅ All wallets set to 10,000 coins.");
}

main();
