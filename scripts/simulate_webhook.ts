
import fetch from "node-fetch";

// Hardcoded for testing. Use IDs from your DB if needed.
const SERVER_URL = "http://localhost:3001";
const USER_ID_TO_CREDIT = process.argv[2]; // Pass ID as arg
const AMOUNT_TO_CREDIT = process.argv[3] || "100";

if (!USER_ID_TO_CREDIT) {
    console.error("Usage: npx tsx scripts/simulate_webhook.ts <USER_ID> <AMOUNT>");
    process.exit(1);
}

// Constructed Simulated ID: SIMULATED_<USER_ID>_<AMOUNT>
// This matches the parsing logic we added to MercadoPagoService.ts
const paymentId = `SIMULATED_${USER_ID_TO_CREDIT}_${AMOUNT_TO_CREDIT}`;

async function run() {
    console.log(`🤖 Simulating Payment Webhook for User: ${USER_ID_TO_CREDIT}, Amount: ${AMOUNT_TO_CREDIT}`);
    console.log(`🔑 Generated Payment ID: ${paymentId}`);

    const payload = {
        type: "payment",
        data: {
            id: paymentId
        },
        action: "payment.created",
        api_version: "v1",
        date_created: new Date().toISOString(),
        id: 123456789,
        live_mode: false,
        user_id: USER_ID_TO_CREDIT
    };

    try {
        const res = await fetch(`${SERVER_URL}/api/webhooks/mercadopago`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            console.log("✅ Webhook Sent Successfully!");
        } else {
            console.error("❌ Webhook Failed:", res.status, await res.text());
        }
    } catch (e) {
        console.error("❌ Connection Error:", e);
    }
}

run();
