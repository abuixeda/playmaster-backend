
import React, { useState } from 'react';

interface StoreModalProps {
    onClose: () => void;
    token: string;
}

const COIN_PACKS = [
    { coins: 500, price: 500, label: "Pack Inicial" },
    { coins: 1000, price: 1000, label: "Pack Jugador" },
    { coins: 5000, price: 4500, label: "Pack Pro (10% OFF)" }, // Marketing trick
    { coins: 10000, price: 8000, label: "Pack Ballena (20% OFF)" }
];

export const StoreModal: React.FC<StoreModalProps> = ({ onClose, token }) => {
    const [loading, setLoading] = useState<number | null>(null);

    const handleBuy = async (amountOfCoins: number) => {
        setLoading(amountOfCoins);
        try {
            const res = await fetch("/api/wallet/deposit/buy-coins", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ amountOfCoins })
            });
            const data = await res.json();

            if (res.ok && data.sandbox_checkout_url) {
                // Redirect to MP
                window.location.href = data.sandbox_checkout_url;
            } else {
                alert("Error iniciando pago: " + (data.error || "Desconocido"));
                setLoading(null);
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-yellow-500/30 w-full max-w-lg shadow-2xl overflow-hidden relative">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>🏦</span> Banco de Fichas
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                {/* Content */}
                <div className="p-6 grid gap-4">
                    <p className="text-slate-300 text-sm mb-2 text-center">
                        Comprá fichas para apostar en tus juegos favoritos.<br />
                        <span className="text-xs text-slate-500">(Pagos procesados por MercadoPago)</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {COIN_PACKS.map(pack => (
                            <div key={pack.coins}
                                className="bg-slate-800 border border-white/10 rounded-xl p-4 hover:border-yellow-500/50 hover:bg-slate-700 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                onClick={() => !loading && handleBuy(pack.coins)}
                            >
                                {pack.label.includes("OFF") && (
                                    <div className="absolute top-2 right-2 bg-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold text-white">
                                        OFERTA
                                    </div>
                                )}
                                <div className="text-4xl mb-2">🪙</div>
                                <div className="text-2xl font-bold text-yellow-400">{pack.coins}</div>
                                <div className="text-sm text-slate-400 mb-4">Fichas</div>

                                <button
                                    disabled={loading !== null}
                                    className="mt-auto bg-blue-600 group-hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg w-full transition-colors flex justify-center items-center"
                                >
                                    {loading === pack.coins ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        `$${pack.price} ARS`
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
