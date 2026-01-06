
import React from 'react';
import { TrucoCard } from './TrucoCard';

import { useState } from 'react';

export const CardPreview = () => {
    const [scale, setScale] = useState(1.105);
    const [borderRadius, setBorderRadius] = useState(10);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-800 p-8 gap-8">
            <h1 className="text-3xl text-white font-bold mb-4">Preview: 1 de Espada (Alta Calidad)</h1>

            <div className="flex flex-col gap-4 bg-black/30 p-6 rounded-lg backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                    <label className="text-white font-medium flex justify-between">
                        Zoom / Escala
                        <span className="font-mono bg-black/50 px-2 rounded">{scale.toFixed(3)}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="1.5"
                        step="0.005"
                        value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-64 accent-yellow-500"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-white font-medium flex justify-between">
                        Radio de Borde (px)
                        <span className="font-mono bg-black/50 px-2 rounded">{borderRadius}</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={borderRadius}
                        onChange={(e) => setBorderRadius(parseFloat(e.target.value))}
                        className="w-64 accent-yellow-500"
                    />
                </div>
            </div>

            <div className="flex gap-12 items-center mt-8">
                {/* Visual Reference Container */}
                <div className="flex flex-col items-center gap-4">
                    <span className="text-white/60 text-sm">Preview (150%)</span>
                    <div className="transform scale-150 origin-top">
                        <TrucoCard
                            number={1}
                            suit="ESPADA"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <span className="text-white/60 text-sm">Tamaño Real</span>
                    <div>
                        <TrucoCard
                            number={1}
                            suit="ESPADA"
                        />
                    </div>
                </div>
            </div>

            <div className="text-white/40 text-sm mt-12 max-w-md text-center">
                Ajusta los deslizadores hasta que la carta se vea perfecta (sin bordes blancos y con las esquinas suaves).
                <br />
                Luego pásame los valores finales.
            </div>
        </div>
    );
};
