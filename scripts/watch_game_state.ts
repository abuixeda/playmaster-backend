
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const gameIdArg = process.argv[2];
    let gameId = gameIdArg;

    if (!gameId) {
        // Find latest active TRUCO game
        const latestInfo = await prisma.game.findFirst({
            orderBy: { updatedAt: 'desc' },
            // where: { typeCode: "TRUCO" } // Optional
        });

        if (latestInfo) {
            console.log(`Auto-selecting latest game: ${latestInfo.id} (${latestInfo.typeCode})`);
            gameId = latestInfo.id;
        } else {
            console.log("No games found.");
            process.exit(0);
        }
    }

    console.log(`\nWatching Game ${gameId}... (Ctrl+C to stop)\n`);

    let lastUpdate = 0;

    setInterval(async () => {
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            console.log("Game not found.");
            process.exit(0);
        }

        const updatedTime = new Date(game.updatedAt).getTime();
        // Always print first time or on update
        if (updatedTime > lastUpdate || lastUpdate === 0) {
            lastUpdate = updatedTime;
            const state = game.gameState as any;

            console.log(`--- Game State Updated at ${new Date().toLocaleTimeString()} ---`);
            console.log(`Status: ${game.status}`);
            console.log(`Round: ${state.currentRound}`);
            console.log(`Score: ${state.scoreA} - ${state.scoreB}`);
            console.log(`Turn: ${state.turn}`);
            console.log(`Cards on Table: ${state.currentTableCards?.length || 0}`);
            if (state.lastMove) {
                console.log(`Last Move: ${state.lastMove.action} - Player: ${state.lastMove.playerId}`);
            }
            if (state.pendingChallenge) {
                console.log(`PENDING CHALLENGE: ${state.pendingChallenge.type}`);
            }
        }
    }, 1000);
}

main();
