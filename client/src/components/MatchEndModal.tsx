import React, { useEffect, useState } from 'react';

interface MatchEndModalProps {
    winnerName: string;
    isWinner: boolean;
    onRematch: () => void;
    onExit: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({ winnerName, isWinner, onRematch, onExit }) => {
    const [secondsLeft, setSecondsLeft] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onExit(); // Auto-exit
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onExit]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border-2 border-yellow-500/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl transform scale-100 transition-all">
                <h2 className={`text-5xl font-black mb-2 ${isWinner ? 'text-yellow-400 drop-shadow-glow' : 'text-slate-400'}`}>
                    {isWinner ? '¡GANASTE!' : 'PERDISTE'}
                </h2>
                <div className="text-xl text-slate-300 mb-8 font-medium">
                    {isWinner ? `¡Felicitaciones ${winnerName}! Has dominado la mesa.` : `Ganador: ${winnerName}. Suerte para la próxima.`}
                </div>

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={onRematch}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                    >
                        <span>⚔️</span>
                        <span>REVANCHA</span>
                    </button>

                    <button
                        onClick={onExit}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-lg transition-all"
                    >
                        VOLVER A LA SALA ({secondsLeft}s)
                    </button>
                </div>
            </div>
        </div>
    );
};
