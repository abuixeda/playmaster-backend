
import { prisma } from '../src/lib/prisma';

async function main() {
    const userId = "43345421-8e30-4e8a-8018-f448ad1c855a";
    const gameId = "BHRW82";

    console.log(`Attempting to join Game ${gameId} with User ${userId}...`);

    try {
        const gp = await prisma.gamePlayer.create({
            data: {
                gameId,
                userId
            }
        });
        console.log("SUCCESS:", gp);
    } catch (e: any) {
        console.error("FAILURE:", e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
