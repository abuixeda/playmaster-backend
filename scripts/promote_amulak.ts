
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const username = "amulak";
    console.log(`Searching for user: ${username}...`);

    const user = await prisma.user.findUnique({
        where: { username },
    });

    if (!user) {
        console.error(`User ${username} not found!`);
        return;
    }

    console.log(`User found: ${user.id} (Role: ${user.role})`);

    const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
    });

    console.log(`✅ User ${updated.username} is now currently: ${updated.role}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
