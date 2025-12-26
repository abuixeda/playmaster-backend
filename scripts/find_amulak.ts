
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find amulak
    const userAmulak = await prisma.user.findFirst({
        where: { username: { contains: 'amulak', mode: 'insensitive' } }
    });

    if (userAmulak) {
        console.log(`AMULAK_EMAIL: ${userAmulak.email}`);
    } else {
        console.log("Amulak not found.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
