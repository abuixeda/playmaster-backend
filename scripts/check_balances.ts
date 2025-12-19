
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== Checking User Balances ===");

    const users = await prisma.user.findMany({
        include: { wallet: true }
    });

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    users.forEach(u => {
        console.log(`User: ${u.username} (${u.id})`);
        console.log(`- Elo: ${u.elo}`);
        console.log(`- Balance: ${u.wallet?.balance}`);
    });
}

main();
