
import React from 'react';

export type Suit = "ESPADA" | "BASTO" | "ORO" | "COPA";

interface CardProps {
    number: number;
    suit: Suit;
    onClick?: () => void;
    className?: string; // For positioning in hand/table
    isFaceDown?: boolean;
}

const SuitIcon: React.FC<{ suit: Suit; className?: string }> = ({ suit, className }) => {
    switch (suit) {
        case "ORO":
            return (
                <svg viewBox="0 0 100 100" className={`text-yellow-500 ${className}`} fill="currentColor">
                    <circle cx="50" cy="50" r="40" stroke="orange" strokeWidth="5" />
                    <circle cx="50" cy="50" r="30" fill="gold" />
                    <path d="M50 20 L55 35 L70 35 L60 45 L65 60 L50 50 L35 60 L40 45 L30 35 L45 35 Z" fill="orange" opacity="0.5" />
                </svg>
            );
        case "COPA":
            return (
                <svg viewBox="0 0 100 100" className={`text-red-600 ${className}`} fill="currentColor">
                    <path d="M30 20 Q30 60 50 70 Q70 60 70 20 Z" fill="none" stroke="currentColor" strokeWidth="5" />
                    <rect x="45" y="70" width="10" height="20" fill="currentColor" />
                    <rect x="30" y="90" width="40" height="5" fill="currentColor" />
                    <path d="M30 25 Q50 35 70 25" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
            );
        case "ESPADA":
            return (
                <svg viewBox="0 0 100 100" className={`text-blue-600 ${className}`} fill="currentColor">
                    <path d="M50 10 L60 80 L50 95 L40 80 Z" stroke="currentColor" strokeWidth="2" />
                    <path d="M30 60 L70 60" stroke="currentColor" strokeWidth="6" />
                    <circle cx="50" cy="60" r="10" fill="currentColor" />
                </svg>
            );
        case "BASTO":
            return (
                <svg viewBox="0 0 100 100" className={`text-green-700 ${className}`} fill="currentColor">
                    <path d="M45 10 L55 10 L60 80 L40 80 Z" fill="currentColor" />
                    <circle cx="50" cy="20" r="5" fill="lightgreen" />
                    <circle cx="50" cy="40" r="5" fill="lightgreen" />
                    <circle cx="50" cy="60" r="5" fill="lightgreen" />
                    <path d="M40 80 Q50 95 60 80" fill="currentColor" />
                </svg>
            );
        default:
            return null;
    }
};

export const Card: React.FC<CardProps> = ({ number, suit, onClick, className = "", isFaceDown = false }) => {

    if (isFaceDown) {
        return (
            <div
                className={`w-24 h-36 bg-blue-900 border-2 border-white rounded-lg shadow-md flex items-center justify-center transform hover:scale-105 transition-transform cursor-default ${className}`}
            >
                <div className="w-20 h-32 border border-blue-400 opacity-30 pattern-grid-lg"></div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`
                w-24 h-36 bg-white border border-gray-300 rounded-lg shadow-lg relative select-none
                flex flex-col items-center justify-between p-2
                transform hover:-translate-y-4 hover:shadow-xl transition-all duration-200 cursor-pointer
                font-serif
                ${className}
            `}
        >
            {/* Top Left Corner */}
            <div className="absolute top-1 left-1 flex flex-col items-center">
                <span className="text-lg font-bold leading-none text-gray-800">{number}</span>
            </div>

            {/* Inner Frame */}
            <div className="w-full h-full border border-gray-200 flex items-center justify-center">
                <SuitIcon suit={suit} className="w-16 h-16 opacity-90" />
            </div>

            {/* Bottom Right Corner (Inverted) */}
            <div className="absolute bottom-1 right-1 flex flex-col items-center transform rotate-180">
                <span className="text-lg font-bold leading-none text-gray-800">{number}</span>
            </div>
        </div>
    );
};
