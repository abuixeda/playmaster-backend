
import React from 'react';

interface ColorWheelProps {
    onSelect: (color: string) => void;
    onCancel: () => void;
}

export const ColorWheel: React.FC<ColorWheelProps> = ({ onSelect, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative transform transition-all scale-100 p-8 rounded-full bg-slate-900 border-4 border-white/10 shadow-2xl">
                <h3 className="absolute -top-16 left-1/2 -translate-x-1/2 text-2xl font-bold text-white whitespace-nowrap drop-shadow-md">
                    Elige un Color
                </h3>

                <div className="relative w-64 h-64 cursor-pointer hover:scale-105 transition-transform duration-200">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                        {/* RED (Top-Left) - bg-red-500 */}
                        <path
                            d="M 50 50 L 50 5 A 45 45 0 0 0 5 50 Z"
                            fill="#ef4444"
                            className="hover:brightness-110 transition-all origin-center hover:scale-105"
                            onClick={() => onSelect('RED')}
                        />
                        {/* BLUE (Top-Right) - bg-blue-500 */}
                        <path
                            d="M 50 50 L 95 50 A 45 45 0 0 0 50 5 Z"
                            fill="#3b82f6"
                            className="hover:brightness-110 transition-all origin-center hover:scale-105"
                            onClick={() => onSelect('BLUE')}
                        />
                        {/* GREEN (Bottom-Left) - bg-green-500 */}
                        <path
                            d="M 50 50 L 5 50 A 45 45 0 0 0 50 95 Z"
                            fill="#22c55e"
                            className="hover:brightness-110 transition-all origin-center hover:scale-105"
                            onClick={() => onSelect('GREEN')}
                        />
                        {/* YELLOW (Bottom-Right) - bg-yellow-400 */}
                        <path
                            d="M 50 50 L 50 95 A 45 45 0 0 0 95 50 Z"
                            fill="#facc15"
                            className="hover:brightness-110 transition-all origin-center hover:scale-105"
                            onClick={() => onSelect('YELLOW')}
                        />
                        {/* Center Hole/Decoration */}
                        <circle cx="50" cy="50" r="12" fill="#0f172a" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                        <text x="50" y="52" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">ÚNICO</text>
                    </svg>
                </div>

                <button
                    onClick={onCancel}
                    className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};
