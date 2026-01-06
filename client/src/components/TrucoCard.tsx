import React from 'react';

export type Suit = "ORO" | "BASTO" | "ESPADA" | "COPA";

interface TrucoCardProps {
    number: number;
    suit: Suit;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
    isFaceDown?: boolean;
}

export const TrucoCard: React.FC<TrucoCardProps> = ({ number, suit, onClick, className = "", style = {}, isFaceDown = false }) => {

    // Default size if not provided locally, but usually GameTable expects component to size itself or be sized by parent.
    // We stick to the previous dimensions.
    const baseStyle = {
        width: '6em',
        height: '9.2em',
        ...style
    };

    if (isFaceDown) {
        return (
            <div
                onClick={onClick}
                className={`
                    relative bg-blue-900 border-2 border-white rounded-md shadow-md select-none cursor-default
                    flex items-center justify-center overflow-hidden
                    ${className}
                `}
                style={baseStyle}
            >
                <div className="text-white/30 font-bold text-xs transform -rotate-45">TRUCO</div>
            </div>
        );
    }

    // Safe lookup
    let icon = '?';
    let colorClass = 'text-gray-800';

    if (suit === 'ORO') { icon = '🟡'; colorClass = 'text-yellow-600'; }
    else if (suit === 'COPA') { icon = '🍷'; colorClass = 'text-red-700'; }
    else if (suit === 'ESPADA') { icon = '⚔️'; colorClass = 'text-sky-700'; }
    else if (suit === 'BASTO') { icon = '🪵'; colorClass = 'text-green-800'; }

    return (
        <div
            onClick={onClick}
            className={`
                relative bg-white border border-gray-300 rounded-lg shadow-md select-none cursor-pointer
                flex flex-col items-center justify-between p-2
                ${className}
            `}
            style={baseStyle}
        >
            <div className={`text-lg font-bold ${colorClass} self-start leading-none`}>{number}</div>

            <div className="flex-1 flex items-center justify-center">
                <span className="text-4xl">{icon}</span>
            </div>

            <div className={`text-lg font-bold ${colorClass} self-end leading-none transform rotate-180`}>{number}</div>
        </div>
    );
};
