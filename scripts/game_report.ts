
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Find latest active or finished game
    const game = await prisma.game.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: { players: { include: { user: true } } }
    });

    if (!game) {
        console.log("No games found.");
        return;
    }

    console.log(`\n📊 GAME REPORT: ${game.id}`);
    console.log(`Type: ${game.typeCode}`);
    console.log(`Status: ${game.status}`);
    console.log(`Updated: ${game.updatedAt.toLocaleString()}`);

    const state = game.gameState as any;

    // Players Stats
    console.log("\n👥 Players:");
    // We map users to A/B based on ID or Order
    // TrucoLogic uses players[0] as A? Usually.

    // We can try to look at state.players
    if (state.players) {
        state.players.forEach((p: any, idx: number) => {
            const user = game.players.find(gp => gp.userId === p.playerId)?.user.username || "Unknown";
            const score = idx === 0 ? state.scoreA : state.scoreB; // Assumption
            console.log(`   Player ${idx + 1} (${user}): ${score} pts`);
        });
    }

    // Winner
    if (game.status === "FINISHED") {
        let winnerId = (state.winner || state.winnerId);
        if (!winnerId) {
            // Infer from score
            if (state.scoreA >= 30) winnerId = state.players[0].playerId;
            else if (state.scoreB >= 30) winnerId = state.players[1].playerId;
        }

        const winnerName = game.players.find(p => p.userId === winnerId)?.user.username || winnerId;
        const diff = Math.abs(state.scoreA - state.scoreB);

        console.log(`\n🏆 WINNER: ${winnerName}`);
        console.log(`📈 Score Difference: ${diff}`);
    } else {
        console.log("\n⏳ Game IN PROGRESS");
        const diff = Math.abs(state.scoreA - state.scoreB);
        console.log(`Current Gap: ${diff}`);
    }

    // Pardas?
    // We can only see pardas in the CURRENT hand if it's stored in roundWinners
    // But historical pardas are lost unless logged.
    console.log("\n⚠️ Note: 'Pardas' history is not stored permanently in DB, only current hand state is visible.");
}

main();
