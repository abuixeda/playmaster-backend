
import { PrismaClient } from "@prisma/client";
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const game = await prisma.game.findFirst({
        orderBy: { updatedAt: 'desc' },
        include: { players: { include: { user: true } } }
    });

    if (!game) {
        fs.writeFileSync('simple_report.log', "No games found.");
        return;
    }

    const state = game.gameState as any;
    let output = "";
    output += `ID: ${game.id}\n`;
    output += `Status: ${game.status}\n`;

    if (state.players) {
        state.players.forEach((p: any, idx: number) => {
            const user = game.players.find(gp => gp.userId === p.playerId)?.user.username || "Unknown";
            const score = idx === 0 ? state.scoreA : state.scoreB;
            output += `Player ${idx + 1} (${user}): ${score} pts\n`;
        });
    }

    if (game.status === "FINISHED") {
        let winnerId = (state.winner || state.winnerId);
        if (!winnerId) {
            if (state.scoreA >= 30) winnerId = state.players[0].playerId;
            else if (state.scoreB >= 30) winnerId = state.players[1].playerId;
        }
        const winnerName = game.players.find(p => p.userId === winnerId)?.user.username || winnerId;
        output += `WINNER: ${winnerName}\n`;
        output += `Difference: ${Math.abs(state.scoreA - state.scoreB)}\n`;
    } else {
        output += `IN PROGRESS\n`;
        output += `Difference: ${Math.abs(state.scoreA - state.scoreB)}\n`;
    }

    fs.writeFileSync('simple_report.log', output);
}

main();
