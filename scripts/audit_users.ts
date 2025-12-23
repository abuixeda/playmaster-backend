
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("DB URL (masked):", process.env.DATABASE_URL?.substring(0, 15) + "...");
    const users = await prisma.user.findMany();
    console.log(`count: ${users.length}`);
    for (const u of users) {
        console.log(`[${u.username}] <${u.email}>`);
    }
}
main().finally(() => prisma.$disconnect());
