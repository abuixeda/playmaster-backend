
import React from 'react';
import { Card } from './Card';
import type { Suit } from './Card';

interface HandProps {
    cards: { number: number; suit: Suit, value: number }[];
    onPlayCard: (card: { number: number; suit: Suit }) => void;
    isCurrentTurn: boolean;
}

export const Hand: React.FC<HandProps> = ({ cards, onPlayCard, isCurrentTurn }) => {
    return (
        <div className={`flex justify-center space-x-2 -space-x-4 transition-opacity ${isCurrentTurn ? 'opacity-100' : 'opacity-70 grayscale'}`}>
            {cards.map((card, _idx) => (
                <div key={`${card.number}-${card.suit}`} className="transform transition-transform hover:z-10">
                    <Card
                        number={card.number}
                        suit={card.suit as Suit}
                        onClick={() => isCurrentTurn && onPlayCard(card)}
                        className={isCurrentTurn ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-green-900" : ""}
                    />
                </div>
            ))}
        </div>
    );
};
