
import { MercadoPagoConfig, Preference } from "mercadopago";

// Same token as in Service
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "TEST-8386376625892015-121601-57d6034f59792576b5336eb4231b0a88-212727181";

const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
const preference = new Preference(client);

async function run() {
    console.log("Testing MP Connection with Token:", MP_ACCESS_TOKEN.slice(0, 10) + "...");
    try {
        const response = await preference.create({
            body: {
                items: [{ id: "test", title: "Test Item", quantity: 1, unit_price: 10, currency_id: "ARS" }]
            }
        });
        console.log("✅ Success! Preference ID:", response.id);
    } catch (e: any) {
        console.error("❌ Failed:", e.message || e);
        if (e.cause) console.error("Cause:", e.cause);
    }
}

run();
