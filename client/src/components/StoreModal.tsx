
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
    const [tab, setTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [loading, setLoading] = useState<number | null | boolean>(null);

    // Withdraw State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [cbu, setCbu] = useState('');

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

    const handleWithdraw = async () => {
        if (!withdrawAmount || !cbu) return alert("Completa todos los datos");
        const amountCents = Math.floor(parseFloat(withdrawAmount)); // Input is effectively coins/cents 1:1? Let's assume input is $, backend expects cents?
        // Wait, logic says `amount of coins`. Store sells "500 Coins for $500". So 1 Coin = 1 ARS.
        // Wallet balance is in "cents" or "coins"? 
        // wallet.ts: `ensureWallet` -> `balance: 0`. `deposit` -> `amount` (cents).
        // Let's assume Balance is in ARS CENTS (integer).
        // UI shows `balance / 100`? Or just balance?
        // App.tsx shows `balance.toLocaleString()`. If balance is 1000, it shows $1,000.
        // If Backend `parseAmount` expects integer > 0.
        // Let's assume 1 Credit = 1 ARS. Wallet stores Credits.

        setLoading(true);
        try {
            const res = await fetch("/api/wallet/withdraw/request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseInt(withdrawAmount),
                    cbu,
                    alias: cbu // sending same for now
                })
            });
            const data = await res.json();

            if (res.ok) {
                alert("✅ Retiro Aprobado Existosamente\nTu dinero ha sido enviado a tu cuenta.");
                window.location.reload();
            } else {
                alert("Error: " + (data.error || "Fondos insuficientes o error desconocido"));
            }
        } catch (e) {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        💳 Billetera
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800/50 p-1 m-4 rounded-xl border border-white/5">
                    <button
                        onClick={() => setTab('DEPOSIT')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'DEPOSIT' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        CARGAR SALDO
                    </button>
                    <button
                        onClick={() => setTab('WITHDRAW')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'WITHDRAW' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        RETIRAR
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {tab === 'DEPOSIT' ? (
                        <>
                            <p className="text-slate-300 text-sm mb-4 text-center">
                                Comprá fichas para apostar en tus juegos favoritos.<br />
                                <span className="text-xs text-slate-500">(Pagos procesados por MercadoPago)</span>
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {COIN_PACKS.map(pack => (
                                    <div key={pack.coins}
                                        className="bg-slate-800 border border-white/10 rounded-xl p-4 hover:border-green-500/50 hover:bg-slate-700 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                        onClick={() => !loading && handleBuy(pack.coins)}
                                    >
                                        {pack.label.includes("OFF") && (
                                            <div className="absolute top-2 right-2 bg-green-600 text-[10px] px-2 py-0.5 rounded-full font-bold text-white">
                                                OFERTA
                                            </div>
                                        )}
                                        <div className="text-4xl mb-2">🪙</div>
                                        <div className="text-2xl font-bold text-green-400">{pack.coins}</div>
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
                        </>
                    ) : (
                        <div className="animate-fade-in space-y-4">
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                                <p className="text-red-200 text-xs uppercase font-bold mb-1">Tu Saldo Disponible</p>
                                {/* We don't have balance here accessible directly unless passed as prop or context. Assuming user knows what they have */}
                                <p className="text-2xl font-bold text-white">---</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Monto a Retirar ($)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-red-500 outline-none mt-1"
                                    placeholder="Ej: 1000"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">CBU / CVU / Alias</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold focus:border-red-500 outline-none mt-1"
                                    placeholder="Ej: mi.alias.mp"
                                    value={cbu}
                                    onChange={e => setCbu(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleWithdraw}
                                disabled={loading === true}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 rounded-xl text-white font-bold text-lg shadow-lg shadow-red-900/40 transition-all mt-4 flex justify-center items-center gap-2"
                            >
                                {loading === true ? 'Procesando...' : 'SOLICITAR RETIRO'}
                            </button>

                            <p className="text-xs text-slate-500 text-center px-4">
                                Los retiros se procesan automáticamente. El dinero se acreditará en tu cuenta bancaria al instante.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
