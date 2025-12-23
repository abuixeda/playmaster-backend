// import fetch from 'node-fetch'; // using global fetch

const API_URL = "http://localhost:4001"; // Default port

async function request(method: string, path: string, body?: any, token?: string) {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Request failed: ${method} ${path} ${res.status} - ${JSON.stringify(data)}`);
    }
    return data;
}

async function getBalance(token: string) {
    const res = await request("GET", "/api/wallet/balance", undefined, token);
    return res.balance;
}

async function main() {
    try {
        console.log("=== STARTING BETTING FLOW TEST ===");

        // 1. REGISTER USERS
        console.log("1. Registering Users...");
        const userAEmail = `userA_${Date.now()}@test.com`;
        const userBEmail = `userB_${Date.now()}@test.com`;
        const pass = "password123";

        // Helper to auth
        async function auth(email: string, username: string) {
            try {
                const reg = await request("POST", "/api/auth/register", { email, username, password: pass });
                return { token: reg.token, id: reg.user.id };
            } catch (e) {
                const log = await request("POST", "/api/auth/login", { email, password: pass });
                return { token: log.token, id: log.user.id };
            }
        }

        const userA = await auth(userAEmail, "UserA");
        const userB = await auth(userBEmail, "UserB");
        console.log(`User A: ${userA.id}`);
        console.log(`User B: ${userB.id}`);

        // 2. FUND WALLETS
        console.log("2. Funding Wallets (Deposit 1000)...");
        await request("POST", "/api/wallet/deposit", { amount: 1000 }, userA.token);
        await request("POST", "/api/wallet/deposit", { amount: 1000 }, userB.token);

        console.log("Initial Balance A:", await getBalance(userA.token));
        console.log("Initial Balance B:", await getBalance(userB.token));

        // 3. CREATE GAME
        console.log("3. User A creates Game (TRUCO)...");
        const game = await request("POST", "/api/games", { typeCode: "TRUCO" }, userA.token);
        const gameId = game.id;
        console.log("Game Created:", gameId);

        // 4. USER A BETS 500
        console.log("4. User A places bet (500 on Self)...");
        await request("POST", `/api/games/${gameId}/bets`, { amount: 500, onPlayerId: userA.id }, userA.token);

        // 5. USER B JOINS
        console.log("5. User B joins Game...");
        await request("POST", `/api/games/${gameId}/join`, {}, userB.token);

        // 6. USER B BETS 500
        console.log("6. User B places bet (500 on Self)...");
        await request("POST", `/api/games/${gameId}/bets`, { amount: 500, onPlayerId: userB.id }, userB.token);

        // Verify Balances Deducted
        console.log("Balance A after bet (expect 500):", await getBalance(userA.token));
        console.log("Balance B after bet (expect 500):", await getBalance(userB.token));

        // 7. SET WINNER (A wins)
        console.log("7. Setting Scores (A=30, B=0)...");
        await request("POST", `/api/games/${gameId}/score`, { userId: userA.id, score: 30 }, userA.token);
        await request("POST", `/api/games/${gameId}/score`, { userId: userB.id, score: 0 }, userA.token);

        // 8. FINISH GAME
        console.log("8. Finishing Game...");
        const finishRes = await request("POST", `/api/games/${gameId}/finish`, {}, userA.token);
        console.log("Finish Result:", JSON.stringify(finishRes));

        // 9. VERIFY PAYOUTS
        // Pot = 500 + 500 = 1000.
        // Winner (A) gets 1000 * 0.975 = 975.
        // A Final Balance = 500 (remaining) + 975 = 1475.
        // B Final Balance = 500 (remaining) + 0 = 500.

        const finalBalA = await getBalance(userA.token);
        const finalBalB = await getBalance(userB.token);

        console.log(`Final Balance A: ${finalBalA} (Expected 1475)`);
        console.log(`Final Balance B: ${finalBalB} (Expected 500)`);

        if (finalBalA === 1475 && finalBalB === 500) {
            console.log("✅ SUCCESS: Betting Logic Verified!");
        } else {
            console.error("❌ FAILURE: Incorrect Balances.");
            process.exit(1);
        }

    } catch (err) {
        console.error("Test Failed:", err);
        process.exit(1);
    }
}

main();
