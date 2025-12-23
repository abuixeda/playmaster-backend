
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(today.getHours() - 24); // Last 24h

    const users = await prisma.user.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
        include: { wallet: true }
    });

    console.log(`--- USUARIOS DE HOY (${users.length}) ---`);
    users.forEach(u => {
        console.log(`User: [${u.username}] - Balance: $${u.wallet?.balance || 0}`);
    });
}
main().finally(() => prisma.$disconnect());
