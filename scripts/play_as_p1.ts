
import { io } from "socket.io-client";

const URL = "http://localhost:3001";
const GAME_ID = "7JBX34"; // Same ID

async function main() {
    console.log(`Hijacking P1 (BrowserBot) for Game ${GAME_ID}...`);
    const socket = io(URL);

    // Reconnect as BrowserBot
    socket.emit("join_game", { gameId: GAME_ID, playerId: "BrowserBot", gameType: "RPS" });

    await new Promise(r => setTimeout(r, 1000));

    // Play Move
    console.log("BrowserBot playing ROCK...");
    socket.emit("play_move", { gameId: GAME_ID, move: { playerId: "BrowserBot", choice: "ROCK" } });

    console.log("Move sent. Waiting for 10s...");
    await new Promise(r => setTimeout(r, 10000));

    socket.disconnect();
}

main();
