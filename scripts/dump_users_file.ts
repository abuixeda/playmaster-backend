
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { wallet: true }
    });

    let content = `--- TOTAL USUARIOS: ${users.length} ---\n`;
    users.forEach(u => {
        content += `User: [${u.username}] (ID: ${u.id}) | Balance: $${u.wallet?.balance || 0}\n`;
    });

    fs.writeFileSync('users_dump.txt', content);
    console.log("Dump completado a users_dump.txt");
}
main().finally(() => prisma.$disconnect());
