
import { io } from "socket.io-client";

const URL = "http://localhost:3001";
const GAME_ID = "7JBX34"; // From Browser Output

async function main() {
    console.log(`Connecting P2 to Game ${GAME_ID}...`);
    const socket = io(URL);

    socket.emit("join_game", { gameId: GAME_ID, playerId: "ScriptBot", gameType: "RPS" });

    // Wait a bit
    await new Promise(r => setTimeout(r, 1000));

    // Play Move
    console.log("ScriptBot playing SCISSORS...");
    socket.emit("play_move", { gameId: GAME_ID, move: { playerId: "ScriptBot", choice: "SCISSORS" } });

    console.log("Move sent. Keeping connection alive for 10s...");
    await new Promise(r => setTimeout(r, 10000));

    socket.disconnect();
}

main();
