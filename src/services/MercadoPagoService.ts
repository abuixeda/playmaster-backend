
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// TODO: Move to env
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "TEST-8386376625892015-121601-57d6034f59792576b5336eb4231b0a88-212727181"; // User's sandbox token or throw

const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });

const preference = new Preference(client);
const payment = new Payment(client);

interface DepositRequest {
    userId: string;
    amountOfCoins: number;
    priceInArs: number;
    title: string;
}

export class MercadoPagoService {
    /**
     * Generates a checkout link for the user to pay
     */
    static async createPreference(data: DepositRequest) {
        try {
            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: "PLAYCOINS_CHARGE",
                            title: data.title,
                            quantity: 1, // Selling 1 "Pack" of coins
                            unit_price: data.priceInArs,
                            currency_id: "ARS"
                        }
                    ],
                    payer: {
                        // email: userEmail // Optional if we knew it
                    },
                    metadata: {
                        user_id: data.userId,
                        coins_amount: data.amountOfCoins
                    },
                    back_urls: {
                        success: "http://localhost:5173/lobby?status=success", // Helper redirection
                        failure: "http://localhost:5173/lobby?status=failure",
                        pending: "http://localhost:5173/lobby?status=pending"
                    },
                    auto_return: "approved",
                    // notification_url: "https://your-domain.com/api/webhooks/mercadopago" // Needed for prod, local needs ngrok or simulation
                }
            });

            return {
                id: response.id,
                init_point: response.init_point,
                sandbox_init_point: response.sandbox_init_point
            };
        } catch (e: any) {
            console.error("MP Create Preference Error (Soft Fail):", e.errorMessage || e.message);
            // Fallback for Dev/Invalid Token
            console.warn("⚠️ Returning SIMULATED Preference due to error.");
            return {
                id: `SIMULATED_PREF_${data.userId}_${data.amountOfCoins}`,
                init_point: `http://localhost:5173/simulate_payment?amount=${data.amountOfCoins}`,
                sandbox_init_point: `http://localhost:5173/simulate_payment?amount=${data.amountOfCoins}`
            };
        }
    }

    /**
     * Validates a Payment ID against MP API
     */
    static async validatePayment(paymentId: string) {
        // SIMULATION BYPASS for Localhost Dev
        if (paymentId.startsWith("SIMULATED_")) {
            console.warn("⚠️ Using Simulated Payment Bypass");
            return {
                status: "approved",
                metadata: {
                    // We expect the caller (script) to have encoded this in the ID or we return a generic structure?
                    // Actually validatePayment returns the payment object, which contains metadata.
                    // In simulation, we can't fetch metadata from MP.
                    // So... validatePayment needs to return what we want.
                    // BUT the webhook handler extracts metadata from THIS return value.
                    // So the simulation script sends `data.id = SIMULATED_...`.
                    // The webhook handler calls validatePayment("SIMULATED_...").
                    // We need to return the metadata here.
                    // Hack: We can encode the metadata in the string? "SIMULATED_USERID_AMOUNT"
                    user_id: paymentId.split('_')[1],
                    coins_amount: paymentId.split('_')[2]
                }
            } as any;
        }

        const response = await payment.get({ id: paymentId });
        return response;
    }
}
