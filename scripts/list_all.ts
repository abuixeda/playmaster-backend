
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { wallet: true }
    });
    console.log(`--- TOTAL USUARIOS: ${users.length} ---`);
    users.forEach(u => {
        console.log(`User: [${u.username}] | Balance: $${u.wallet?.balance || 0}`);
    });
}
main().finally(() => prisma.$disconnect());
