
import { io } from "socket.io-client";
import fetch from "node-fetch";

const SERVER_URL = "http://localhost:3001";

async function run() {
    // 1. Login to get Token & ID
    console.log("🔐 Logging in...");
    const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: "test_financial_user_" + Date.now(), password: "password123" }) // New user
    });

    let data = await loginRes.json();
    if (!loginRes.ok) {
        // Register if not exists (lazy method)
        console.log("📝 Registering new user...");
        const regRes = await fetch(`${SERVER_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: `money_${Date.now()}@test.com`, username: `Richie_${Date.now()}`, password: "password123" })
        });
        data = await regRes.json();
    }

    const { token, user } = data;
    const userId = user.id;
    console.log(`👤 User: ${user.username} (${userId})`);

    // 2. Check Initial Balance
    const balanceRes1 = await fetch(`${SERVER_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
    const balance1 = await balanceRes1.json();
    console.log(`💰 Initial Balance: ${balance1.balance} Coins`);

    // 3. Request Deposit (Buy Coins)
    const AMOUNT = 500;
    console.log(`🛒 Buying ${AMOUNT} Coins...`);
    const depositRes = await fetch(`${SERVER_URL}/api/wallet/deposit/buy-coins`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amountOfCoins: AMOUNT })
    });
    const depositData = await depositRes.json();

    if (!depositRes.ok) {
        console.error("❌ Deposit Request Failed:", depositData);
        process.exit(1);
    }

    console.log(`🔗 Checkout Link: ${depositData.sandbox_checkout_url}`);
    console.log(`💵 Price: $${depositData.price_ars} ARS`);

    // 4. Simulate Webhook
    console.log("⚡ Simulating Webhook...");
    const webhookPayload = {
        type: "payment",
        data: { id: `SIMULATED_${userId}_${AMOUNT}` },
        action: "payment.created",
        user_id: 12345
    };

    const webhookRes = await fetch(`${SERVER_URL}/api/webhooks/mercadopago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload)
    });

    if (webhookRes.ok) {
        console.log("✅ Webhook Delivered.");
    } else {
        console.error("❌ Webhook Failed");
    }

    // 5. Check Final Balance
    // Wait a bit for async db transaction? Usually fast.
    await new Promise(r => setTimeout(r, 1000));

    const balanceRes2 = await fetch(`${SERVER_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });
    const balance2 = await balanceRes2.json();
    console.log(`💰 Final Balance: ${balance2.balance} Coins`);

    if (balance2.balance === (balance1.balance + AMOUNT)) {
        console.log("🎉 SUCCESS: Wallet Credited Correctly!");
    } else {
        console.error("⚠️ FAILURE: Balance mismatch.");
    }
}

run();
