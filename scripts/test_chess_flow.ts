import { io, Socket } from "socket.io-client";

const API_URL = process.env.API_URL || "http://localhost:4005";
const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:4005";

// Helper for HTTP requests
async function request(method: string, path: string, body?: any, token?: string) {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Request failed: ${method} ${path} ${res.status} - ${JSON.stringify(data)}`);
    }
    return data;
}

// Helper for Socket connection
function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket"], // Force websocket to avoid polling issues in scripts
        });

        socket.on("connect", () => {
            console.log(`Socket connected: ${socket.id}`);
            resolve(socket);
        });

        socket.on("connect_error", (err) => {
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log("=== CHESS FLOW TEST START ===");

        // 1. Setup Users
        const p1Creds = { email: `chess_p1_${Date.now()}@test.com`, username: `ChessP1_${Date.now()}`, password: "password123" };
        const p2Creds = { email: `chess_p2_${Date.now()}@test.com`, username: `ChessP2_${Date.now()}`, password: "password123" };

        console.log("Creating Users...");
        const p1Reg = await request("POST", "/api/auth/register", p1Creds);
        const p2Reg = await request("POST", "/api/auth/register", p2Creds);

        const token1 = p1Reg.token;
        const token2 = p2Reg.token;
        const id1 = p1Reg.user.id;
        const id2 = p2Reg.user.id; // Corrected from p1Reg.user.id

        // 2. Create Game (Chess)
        console.log("Creating Chess Game...");
        // Assuming 'CHESS' is the typeCode
        const game = await request("POST", "/api/games", { typeCode: "CHESS" }, token1);
        const gameId = game.id;
        console.log(`Game Created: ${gameId}`);

        // 3. P2 Joins
        console.log("P2 Joining...");
        await request("POST", `/api/games/${gameId}/join`, {}, token2);

        // 4. Connect Sockets
        console.log("Connecting Sockets...");
        const s1 = await connectSocket(token1);
        const s2 = await connectSocket(token2);

        // Join Room via Socket
        // Note: SocketServer usually handles join automatically or via explicit emit.
        // Based on SocketServer.ts, we need to emit 'join_game'.
        // GameType needs verification if it's required in emit
        s1.emit("join_game", { gameId, playerId: id1, gameType: "CHESS" });
        s2.emit("join_game", { gameId, playerId: id2, gameType: "CHESS" });

        // Wait for connection stability
        await new Promise(r => setTimeout(r, 1000));

        // Listen for game state
        let currentState: any = null;
        const onState = (data: any) => {
            currentState = data;
            console.log("State Update (FEN):", data.fen);
            console.log("State Status:", data.status);
            if (data.isGameOver) console.log("GAME OVER DETECTED via Event");
        };
        s1.on("game_state", onState);
        s2.on("game_state", onState);

        const onError = (err: any) => console.error("Socket Move Error:", err);
        s1.on("move_error", onError);
        s2.on("move_error", onError);

        // 5. Play Fool's Mate
        // White: f2 -> f3
        // Black: e7 -> e5
        // White: g2 -> g4
        // Black: d8 -> h4 # Checkmate

        const moves = [
            { id: id1, from: "f2", to: "f3" }, // White
            { id: id2, from: "e7", to: "e5" }, // Black
            { id: id1, from: "g2", to: "g4" }, // White
            { id: id2, from: "d8", to: "h4" }, // Black (Mate)
        ];

        for (const m of moves) {
            console.log(`Playing Move: ${m.from}->${m.to} (${m.id === id1 ? "White" : "Black"})`);
            const socket = m.id === id1 ? s1 : s2;
            socket.emit("play_move", {
                gameId,
                move: { from: m.from, to: m.to }
            });

            // Wait for update
            await new Promise(r => setTimeout(r, 1000));
        }

        // 6. Verify Game Over
        if (currentState?.status === "FINISHED" || currentState?.isGameOver) {
            console.log("SUCCESS: Game Finished!");
            console.log("Winner:", currentState.winner);
            if (currentState.winner === (currentState.players[1].playerId === id2 ? 'b' : 'w') || currentState.winner === 'b') {
                console.log("Correct Winner (Black)");
            } else {
                console.warn("Unexpected Winner:", currentState.winner);
            }
        } else {
            console.error("FAILURE: Game did not finish.", currentState);
            process.exit(1);
        }

        s1.disconnect();
        s2.disconnect();
        console.log("=== CHESS FLOW TEST PASSED ===");

    } catch (e: any) {
        console.error("TEST FAILED:", e.message);
        if (e.response) console.error(JSON.stringify(e.response));
        process.exit(1);
    }
}

main();
