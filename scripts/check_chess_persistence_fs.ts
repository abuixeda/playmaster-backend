
import { PrismaClient } from "@prisma/client";
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    let log = "=== Checking Chess Persistence ===\n";

    // Find latest Chess game
    const game = await prisma.game.findFirst({
        where: { typeCode: "CHESS" },
        orderBy: { updatedAt: 'desc' },
        include: { players: { include: { user: true } } }
    });

    if (!game) {
        log += "No Chess games found.\n";
        fs.writeFileSync('chess_direct.log', log);
        return;
    }

    log += `Game ID: ${game.id}\n`;
    log += `Type: ${game.typeCode}\n`;
    log += `Status: ${game.status}\n`;

    const state = game.gameState as any;

    if (game.typeCode === "CHESS") {
        log += "\nChess State:\n";
        log += `FEN: ${state.fen}\n`;
        log += `Turn: ${state.turn}\n`;

        log += "\nMove History:\n";
        if (state.history && Array.isArray(state.history)) {
            state.history.forEach((move: string, index: number) => {
                log += `${index + 1}. ${move}\n`;
            });
            log += `\nTotal moves recorded: ${state.history.length}\n`;
        } else {
            log += "History field is missing or invalid in gameState.\n";
        }
    }

    fs.writeFileSync('chess_direct.log', log);
}

main();
