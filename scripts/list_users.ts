
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log("--- USUARIOS REGISTRADOS ---");
    users.forEach(u => console.log(`"${u.username}" (ID: ${u.id})`));
}

main().finally(() => prisma.$disconnect());
