
import { io } from "socket.io-client";
import { prisma } from "../src/lib/prisma";

const URL = "http://localhost:3001";
const GAME_ID = "TRUCO_TEST_" + Math.floor(Math.random() * 1000);

async function main() {
    console.log(`Starting Truco Persistence Test (Game: ${GAME_ID})...`);

    // 1. Create Game via Socket
    const socket1 = io(URL);
    const socket2 = io(URL);

    socket1.emit("join_game", { gameId: GAME_ID, playerId: "P1_TRUCO", gameType: "TRUCO" });
    socket2.emit("join_game", { gameId: GAME_ID, playerId: "P2_TRUCO", gameType: "TRUCO" });

    await new Promise(r => setTimeout(r, 1000));

    // 2. Play a Card (P1 is usually Hand in new game, check logs if needed, but we'll try P1)
    // We need to know who is turn. The server initializes P1 starts?
    // Let's just try emitting a move for P1.
    // In TrucoLogic, we need a valid card index.

    console.log("P1 playing card at index 0...");
    socket1.emit("play_move", {
        gameId: GAME_ID,
        move: {
            playerId: "P1_TRUCO",
            action: "PLAY_CARD",
            cardIndex: 0
        }
    });

    await new Promise(r => setTimeout(r, 2000));

    // 3. Verify Database
    console.log("Verifying Database Persistence...");
    const game = await prisma.game.findUnique({
        where: { id: GAME_ID }
    });

    if (!game) {
        console.error("FAIL: Game not found in DB.");
    } else {
        const state = game.gameState as any;
        // Check if a card was played. In TrucoState, 'currentTableCards' should not be empty, 
        // OR 'players[0].cards' should be fewer than 3?
        // Let's check 'currentTableCards'.

        console.log("DB Game State:", JSON.stringify(state, null, 2));

        const hasCardsOnTable = state.currentTableCards && state.currentTableCards.length > 0;
        const p1CardsPlayed = state.players?.find((p: any) => p.id === "P1_TRUCO")?.cards.length < 3;

        if (hasCardsOnTable || p1CardsPlayed) {
            console.log("SUCCESS: Truco move persisted to Database!");
        } else {
            console.log("WARNING: Move might not be persisted or P1 was not turn.");
        }
    }

    socket1.disconnect();
    socket2.disconnect();
}

main().catch(console.error);
