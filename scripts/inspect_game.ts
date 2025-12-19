
import { prisma } from '../src/lib/prisma';

async function main() {
    const gameId = "SJYAP3";
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true }
    });

    console.log("Game ID:", game?.id);
    console.log("Players:", game?.players.map(p => p.userId));
    console.log("State:", JSON.stringify(game?.gameState, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
