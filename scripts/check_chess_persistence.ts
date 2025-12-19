
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== Checking Chess Persistence ===");

    // Find latest Chess game
    const game = await prisma.game.findFirst({
        where: { typeCode: "CHESS" }, // Filter for Chess specifically if possible, or just latest
        orderBy: { updatedAt: 'desc' },
        include: { players: { include: { user: true } } }
    });

    if (!game) {
        console.log("No Chess games found.");
        return;
    }

    console.log(`Game ID: ${game.id}`);
    console.log(`Type: ${game.typeCode}`);
    console.log(`Status: ${game.status}`);
    console.log(`Updated at: ${game.updatedAt.toLocaleString()}`);

    const state = game.gameState as any;

    // Check for Chess specific fields
    if (game.typeCode === "CHESS") {
        console.log("\n♟️ Chess State:");
        console.log(`FEN: ${state.fen}`);
        console.log(`Turn: ${state.turn}`);
        console.log(`Is Checkmate: ${state.isCheckmate}`);
        console.log(`Winner (in State): ${state.winner}`);

        console.log("\n📜 Move History:");
        if (state.history && Array.isArray(state.history)) {
            if (state.history.length === 0) {
                console.log("No moves recorded in history array.");
            } else {
                state.history.forEach((move: string, index: number) => {
                    console.log(`${index + 1}. ${move}`);
                });
                console.log(`\n✅ Total moves recorded: ${state.history.length}`);
            }
        } else {
            console.log("⚠️ History field is missing or invalid in gameState.");
        }
    } else {
        console.log("Latest game is not Chess.");
    }
}

main();
