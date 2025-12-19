
const API_URL = "http://localhost:3001";

async function request(method: string, path: string, body?: any, token?: string) {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
        const res = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: (body && method !== "GET" && method !== "HEAD") ? JSON.stringify(body) : undefined,
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }

        if (!res.ok) {
            throw new Error(`Request failed: ${method} ${path} ${res.status} - ${JSON.stringify(data)}`);
        }
        return data;
    } catch (e: any) {
        if (e.cause?.code === "ECONNREFUSED") {
            throw new Error(`Connection refused to ${API_URL}. Is the server running?`);
        }
        throw e;
    }
}

async function main() {
    try {
        console.log("💰 Testing Payment Flow...");

        // 1. Register User
        const email = `payer_${Date.now()}@test.com`;
        const username = `payer_${Date.now()}`;
        console.log(`1. Registering ${username}...`);

        const reg = await request("POST", "/api/auth/register", {
            email,
            username,
            password: "password123"
        });
        const token = reg.token;
        const userId = reg.user.id;
        console.log("User Created. Token acquired.");

        // 2. Initial Balance
        console.log("2. Checking Initial Balance...");
        const initial = await request("GET", "/api/wallet/balance", {}, token);
        console.log(`Initial Balance: ${initial.balance}`);
        if (initial.balance !== 0) throw new Error("Balance should be 0");

        // 3. Buy Coins
        const coins = 100;
        console.log(`3. Buying ${coins} Coins...`);
        const buyRes = await request("POST", "/api/wallet/deposit/buy-coins", {
            amountOfCoins: coins
        }, token);

        console.log("Buy Response:", typeof buyRes === 'string' ? buyRes : JSON.stringify(buyRes));

        // Expecting generated preference (simulated or real)
        const initPoint = buyRes.checkout_url || "";
        let paymentId = "";

        // Extract payment/preference ID for simulation
        // In MP Service Mock: id: `SIMULATED_PREF_${data.userId}_${data.amountOfCoins}`
        // But the init_point URL also contains it or we can construct it if we know logic.
        // Actually, the Service returns { id: ... }. But response might wrap it?
        // wallet.ts: return reply.send({ status: "created", checkout_url: ..., ... })
        // It DOES NOT return the ID explicitly in the JSON response shown in wallet.ts snippet?
        // Wait, wallet.ts returns:
        /*
        return reply.send({
            status: "created",
            checkout_url: preference.init_point,
            sandbox_checkout_url: preference.sandbox_init_point,
            price_ars: price
        });
        */
        // It does NOT return the preference ID needed for the webhook?
        // The webhook `data.id` is usually the PAYMENT ID (created after user pays).
        // But for SIMULATION, `validatePayment` checks if ID starts with `SIMULATED_`.
        // So we need to construct a FAKE Payment ID that matches the logic in `validatePayment`.
        // Logic: `if (paymentId.startsWith("SIMULATED_")) ... returns metadata from string split`
        // Format expected by `validatePayment`: `SIMULATED_USERID_AMOUNT` (implied by split logic `paymentId.split('_')[1]`)
        // Actually line 89: `user_id: paymentId.split('_')[1]`
        // Line 90: `coins_amount: paymentId.split('_')[2]`
        // So ID should be `SIMULATED_${userId}_${coins}`.

        const simulatedPaymentId = `SIMULATED_${userId}_${coins}`;
        console.log(`Simulating Payment ID: ${simulatedPaymentId}`);

        // 4. Send Webhook
        console.log("4. Sending Webhook...");
        const webhookBody = {
            type: "payment",
            data: { id: simulatedPaymentId }
        };

        await request("POST", "/api/webhooks/mercadopago", webhookBody);
        // Note: No token needed for webhook (public)
        console.log("Webhook Sent.");

        // 5. Verify Balance Again
        console.log("5. Checking Balance (should be credited)...");
        const final = await request("GET", "/api/wallet/balance", {}, token);
        console.log(`Final Balance: ${final.balance}`);

        if (final.balance === coins) {
            console.log("✅ SUCCESS: Balance updated correctly.");
        } else {
            console.error(`❌ FAILURE: Expected ${coins}, got ${final.balance}`);
            process.exit(1);
        }

    } catch (e: any) {
        console.error("❌ Test Failed:", e.message);
        process.exit(1);
    }
}

main();
