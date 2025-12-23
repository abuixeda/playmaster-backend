
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const U1 = "electro savage";
const U2 = "el dylan de varela"; // Need to find exact match

async function main() {
    console.log("🔍 Inspecting Users...");

    // Find precise IDs
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: "electro", mode: 'insensitive' } },
                { username: { contains: "dylan", mode: 'insensitive' } }
            ]
        },
        include: { wallet: true }
    });

    users.forEach(u => {
        console.log(`User: ${u.username}`);
        console.log(` - ID: ${u.id}`);
        console.log(` - Elo: ${u.elo}`);
        console.log(` - Balance: $${u.wallet?.balance}`);
        console.log("-------------------------");
    });
}

main().finally(() => prisma.$disconnect());
