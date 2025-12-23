
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const names = ['electro savage', 'el dylan de varela', 'eldylandevarela']; // variants
    const users = await prisma.user.findMany({
        where: {
            OR: names.map(n => ({ username: { contains: n, mode: 'insensitive' } }))
        },
        select: { id: true, username: true }
    });
    console.log("--- KNOWN USERS ---");
    users.forEach(u => console.log(`${u.id} -> ${u.username}`));
}
main().finally(() => prisma.$disconnect());
