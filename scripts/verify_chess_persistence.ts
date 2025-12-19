
import { io } from "socket.io-client";
import { prisma } from "../src/lib/prisma";

const URL = "http://localhost:3001";
const GAME_ID = "CHESS_TEST_" + Math.floor(Math.random() * 1000);

async function main() {
    console.log(`Starting Chess Persistence Test (Game: ${GAME_ID})...`);

    const socket1 = io(URL);
    const socket2 = io(URL);

    // Join
    socket1.emit("join_game", { gameId: GAME_ID, playerId: "P1_CHESS", gameType: "CHESS" });
    socket2.emit("join_game", { gameId: GAME_ID, playerId: "P2_CHESS", gameType: "CHESS" });

    await new Promise(r => setTimeout(r, 1000));

    // Play Move (White Pawn e2 -> e4)
    console.log("P1 playing e2 -> e4...");
    socket1.emit("play_move", {
        gameId: GAME_ID,
        move: {
            playerId: "P1_CHESS",
            from: "e2",
            to: "e4",
            promotion: "q" // ignored for pawn move, but safe
        }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Verify DB
    console.log("Verifying Database Persistence...");
    const game = await prisma.game.findUnique({
        where: { id: GAME_ID }
    });

    if (!game) {
        console.error("FAIL: Game not found in DB.");
    } else {
        const state = game.gameState as any;
        console.log("DB Game State FEN:", state.fen);

        // Initial FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
        // After e2e4: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
        if (state.fen && state.fen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
            console.log("SUCCESS: Chess move persisted (FEN updated)!");
        } else {
            console.log("WARNING: FEN is initial or missing.");
        }
    }

    socket1.disconnect();
    socket2.disconnect();
}

main().catch(console.error);
