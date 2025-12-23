
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { username: { in: ['electro savage', 'El Dylan de Varela'], mode: 'insensitive' } },
        select: { username: true, elo: true }
    });
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
