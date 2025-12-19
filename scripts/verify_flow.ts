const BASE_URL = "http://localhost:3000";

async function request(method: string, path: string, body?: any, token?: string) {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
    }

    return res.json();
}

async function main() {
    try {
        console.log("🚀 Starting Verification Flow...");

        // 1. Register Users
        const emailA = `playerA_${Date.now()}@test.com`;
        const emailB = `playerB_${Date.now()}@test.com`;

        console.log(`Creating users: ${emailA}, ${emailB}`);
        const resA = await request("POST", "/api/auth/register", {
            username: `userA_${Date.now()}`,
            email: emailA,
            password: "password123",
        });
        const tokenA = resA.token;
        const userIdA = resA.user.id;

        const resB = await request("POST", "/api/auth/register", {
            username: `userB_${Date.now()}`,
            email: emailB,
            password: "password123",
        });
        const tokenB = resB.token;
        const userIdB = resB.user.id;

        // 2. Deposit Money
        console.log("Depositing money...");
        await request("POST", "/api/wallet/deposit", { amount: 100000 }, tokenA);
        await request("POST", "/api/wallet/deposit", { amount: 100000 }, tokenB);

        // 3. Create Game
        console.log("Creating TRUCO game...");
        const gameRes = await request("POST", "/api/games", { typeCode: "TRUCO" }, tokenA);
        const gameId = gameRes.id;
        console.log(`Game created: ${gameId}`);

        // 4. Join Game
        console.log("Joining game...");
        await request("POST", `/api/games/${gameId}/join`, {}, tokenA);
        // User A joins automatically? Check logic. 
        // Usually the creator joins explicitly or auto. The endpoint games.ts join checks if already joined.
        // Let's try explicit join for A just in case, but usually creator needs to join.
        // Actually the current create endpoint DOES NOT auto-join. So A needs to join.
        // But verify_flow logic:
        // A created. Status waiting.
        // A joins.
        // B joins.

        await request("POST", `/api/games/${gameId}/join`, {}, tokenB);

        // 5. Place Bets (Optional but user wants it)
        console.log("Placing bets...");
        // A bets on A
        await request("POST", `/api/games/${gameId}/bets`, { amount: 5000, onPlayerId: userIdA }, tokenA);

        // B bets on B
        await request("POST", `/api/games/${gameId}/bets`, { amount: 5000, onPlayerId: userIdB }, tokenB);

        // 6. Make Moves (New Logic)
        console.log("Making moves...");
        const movePayload = { action: "PLAY_CARD", card: "1e" }; // 1 de espadas if Truco
        const moveRes = await request("POST", `/api/games/${gameId}/move`, movePayload, tokenA);
        console.log("Move result state:", moveRes.gameState);

        // 7. Finish Game
        console.log("Finishing game...");
        // Mock finish - winner A (score 30 vs 0)
        await request("POST", `/api/games/${gameId}/score`, { userId: userIdA, score: 30 }, tokenA);

        await request("POST", `/api/games/${gameId}/finish`, {}, tokenA);

        // 8. Check Wallets
        console.log("Checking wallets...");
        const walletA = await request("GET", "/api/wallet/me", undefined, tokenA);
        // A bet 5000, Won -> 10000 back. Initial 100000 - 5000 + 10000 = 105000
        console.log(`Wallet A: ${walletA.balance} (Expected ~105000)`);

        if (walletA.balance !== 105000) {
            console.error("❌ Wallet balance mismatch!");
        } else {
            console.log("✅ Wallet balance correct.");
        }

        console.log("✅ verification SUCCESS");

    } catch (error: any) {
        console.error("❌ Verification FAILED");
        console.error(error.message);
        process.exit(1); // Fail
    }
}

main();
export { };
