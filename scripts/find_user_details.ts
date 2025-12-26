
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const results = [];

    // Find amulak
    const userAmulak = await prisma.user.findFirst({
        where: { username: { contains: 'amulak', mode: 'insensitive' } }
    });

    if (userAmulak) {
        results.push({ name: 'amulak', username: userAmulak.username, email: userAmulak.email });
    }

    // Find electro
    const userElectro = await prisma.user.findFirst({
        where: { username: { contains: 'lectro', mode: 'insensitive' } }
    });

    if (userElectro) {
        results.push({ name: 'electro', username: userElectro.username, email: userElectro.email });
    }

    console.log(JSON.stringify(results, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
