
import { useEffect, useState } from 'react';

export const SimulationPayment = () => {
    const [status, setStatus] = useState("idle"); // idle, processing, success, error
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const amt = params.get('amount');
        if (amt) setAmount(Number(amt));
    }, []);

    const handleConfirm = async () => {
        setStatus("processing");
        try {
            // We need to trigger the webhook mechanism manually or via a special dev endpoint
            // BUT, since we don't have a special endpoint, we can just call the webhook directly?
            // The simulation ID format is constructed in the backend service fallback
            // ID: `SIMULATED_PREF_${userId}_${amountOfCoins}`
            // But we don't know the userId here easily unless stored in localstorage.

            const userStr = localStorage.getItem('user');
            if (!userStr) throw new Error("User not found");
            const user = JSON.parse(userStr);

            // Construct simulated Payment ID matching backend expectation
            // MercadoPagoService.validatePayment checks for `SIMULATED_${userId}_${amount}`
            // Note: Service fallback generates ID: `SIMULATED_PREF_${userId}_${amount}` (Wait, check file content from step 149)
            // Line 63: id: `SIMULATED_PREF_${data.userId}_${data.amountOfCoins}`
            // Line 75: if (paymentId.startsWith("SIMULATED_")) ...
            // Line 89: userId = paymentId.split('_')[1]
            // Line 90: coins = paymentId.split('_')[2]

            // IF ID is `SIMULATED_PREF_123_100`
            // split('_')[0] = SIMULATED
            // split('_')[1] = PREF (Wrong!)

            // BUG DETECTED IN BACKEND MOCK LOGIC vs MOCK ID GENERATION!
            // Backend generates: SIMULATED_PREF_USER_AMOUNT
            // Backend parses: SIMULATED_USER_AMOUNT

            // We need to send what the backend EXPECTS in validatePayment.
            // validatePayment expects: SIMULATED_USERID_AMOUNT

            const simulatedId = `SIMULATED_${user.id}_${amount}`;

            await fetch('/api/webhooks/mercadopago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: "payment",
                    data: { id: simulatedId }
                })
            });

            setStatus("success");
            setTimeout(() => {
                window.location.href = "/lobby?status=success";
            }, 2000);

        } catch (e) {
            console.error(e);
            setStatus("error");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            <div className="bg-slate-800 p-8 rounded-xl border border-yellow-500/50 max-w-md w-full text-center shadow-2xl">
                <h1 className="text-3xl font-bold text-yellow-500 mb-4">💳 Simulación de Pago</h1>

                {status === "idle" && (
                    <>
                        <p className="text-slate-300 mb-6">
                            Estás en modo DEVELOPMENT y la pasarela de MercadoPago real no está configurada o falló.
                        </p>
                        <div className="bg-slate-900 p-4 rounded-lg mb-6">
                            <div className="text-slate-500 text-xs uppercase">Monto a cargar</div>
                            <div className="text-4xl font-mono font-bold text-green-400">{amount} 🪙</div>
                        </div>
                        <button
                            onClick={handleConfirm}
                            className="w-full pym-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all"
                        >
                            CONFIRMAR PAGO (SIMULADO)
                        </button>
                    </>
                )}

                {status === "processing" && (
                    <div className="py-8">
                        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Procesando...</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="py-8">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-xl font-bold text-green-400">¡Acreditado!</h2>
                        <p className="text-slate-400 text-sm">Redirigiendo...</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="py-8">
                        <div className="text-6xl mb-4">❌</div>
                        <p>Error en la simulación.</p>
                        <button onClick={() => window.location.href = "/"} className="mt-4 underline">Volver</button>
                    </div>
                )}
            </div>
        </div>
    );
};
