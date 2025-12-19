// import fetch from 'node-fetch'; // using global fetch

const API_URL = "http://localhost:3000"; // Adjust port of server (default 3000)

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

async function main() {
    try {
        console.log("1. Registering/Login User A...");
        const userAEmail = `userA_${Date.now()}@test.com`;
        const userAPass = "password123";
        let tokenA;
        try {
            const regA = await request("POST", "/api/auth/register", { email: userAEmail, username: `userA_${Date.now()}`, password: userAPass });
            tokenA = regA.token;
        } catch (e) {
            // Fallback login if exists (unlikely given random email)
            const logA = await request("POST", "/api/auth/login", { email: userAEmail, password: userAPass });
            tokenA = logA.token;
        }
        console.log("User A Token:", tokenA.substring(0, 10) + "...");

        console.log("2. Registering/Login User B...");
        const userBEmail = `userB_${Date.now()}@test.com`;
        const userBPass = "password123";
        let tokenB;
        try {
            const regB = await request("POST", "/api/auth/register", { email: userBEmail, username: `userB_${Date.now()}`, password: userBPass });
            tokenB = regB.token;
        } catch (e) {
            const logB = await request("POST", "/api/auth/login", { email: userBEmail, password: userBPass });
            tokenB = logB.token;
        }
        console.log("User B Token:", tokenB.substring(0, 10) + "...");

        console.log("3. User A creates Game (TRUCO)...");
        const game = await request("POST", "/api/games", { typeCode: "TRUCO" }, tokenA);
        const gameId = game.id;
        console.log("Game Created:", gameId);

        console.log("4. User B joins Game...");
        await request("POST", `/api/games/${gameId}/join`, {}, tokenB);
        console.log("User B Joined.");

        console.log("5. User A makes WINNING move...");
        const moveRes = await request("POST", `/api/games/${gameId}/move`, { action: "WIN_GAME_DEBUG" }, tokenA);
        console.log("Move Response:", moveRes);

        if (moveRes.status === "FINISHED") {
            console.log("SUCCESS: Game finished automatically!");
        } else {
            console.error("FAILURE: Game status is not FINISHED:", moveRes.status);
            process.exit(1);
        }

        // Determine winner logic if we want to be strict, but status check is primary goal.

    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    }
}

main();
export { };
