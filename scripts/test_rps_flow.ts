
import { io } from "socket.io-client";

const URL = "http://localhost:3001";

async function main() {
    console.log("Starting RPS System Test...");

    const socket1 = io(URL);
    const socket2 = io(URL);

    const gameId = "TEST_RPS_" + Math.floor(Math.random() * 1000);
    console.log("Game ID:", gameId);

    const waitForState = (socket: any, predicate: (s: any) => boolean) => {
        return new Promise<void>((resolve) => {
            const handler = (state: any) => {
                if (predicate(state)) {
                    socket.off("game_state", handler);
                    resolve();
                }
            };
            socket.on("game_state", handler);
        });
    };

    console.log("Connecting P1...");
    socket1.emit("join_game", { gameId, playerId: "P1", gameType: "RPS" });

    console.log("Connecting P2...");
    socket2.emit("join_game", { gameId, playerId: "P2", gameType: "RPS" });

    await new Promise(r => setTimeout(r, 1000));

    console.log("P1 plays ROCK");
    // FIXED: Correct Payload Structure
    socket1.emit("play_move", { gameId, move: { playerId: "P1", choice: "ROCK" } });

    console.log("P2 plays PAPER");
    socket2.emit("play_move", { gameId, move: { playerId: "P2", choice: "PAPER" } });

    console.log("Waiting for result...");
    try {
        await waitForState(socket1, (state) => {
            const p1Score = state.players["P1"]?.score;
            const p2Score = state.players["P2"]?.score;
            if ((p1Score > 0 || p2Score > 0) && state.roundWinner) {
                console.log(`Round Resolved! Winner: ${state.roundWinner}`);
                return true;
            }
            return false;
        });
        console.log("TEST PASSED: Round resolved successfully.");
    } catch (e) {
        console.log("TEST FAILED: Timeout waiting for resolution.");
    }

    socket1.disconnect();
    socket2.disconnect();
}

main();
