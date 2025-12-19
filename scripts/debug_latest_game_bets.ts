
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== Debugging Latest Game Bets ===");

    // Find latest game
    const game = await prisma.game.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: {
            players: { include: { user: true } }
        }
    });

    if (!game) {
        console.log("No games found.");
        return;
    }

    console.log(`Game ID: ${game.id}`);
    console.log(`Type: ${game.typeCode}`);
    console.log(`Status: ${game.status}`);
    console.log(`Updated: ${game.updatedAt.toLocaleString()}`);

    // Check Bets
    const bets = await prisma.betLock.findMany({
        where: { gameId: game.id }
    });

    console.log(`\nBets Found: ${bets.length}`);
    bets.forEach(b => {
        console.log(`- User: ${b.userId}, Amount: ${b.amount}, Status: ${b.status}, On: ${b.onPlayerId}`);
    });

    if (bets.length === 0) {
        console.log("\n⚠️ No bets recorded for this game. If this was a Private Room, the default bet is 0 (Free Play).");
        console.log("   To play for coins, please use 'BUSCAR PARTIDA' (Matchmaking) and select a bet amount.");
    } else {
        console.log("\n✅ Bets exist. If no payout occurred, check game status or winner.");
    }
}

main();
