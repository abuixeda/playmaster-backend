import { describe, it, expect } from 'vitest';
import { TrucoLogic } from '../../../src/services/truco/TrucoLogic';
import { Card } from '../../../src/services/truco/TrucoTypes';

// Helpers
const card = (number: number, suit: 'ESPADA' | 'BASTO' | 'ORO' | 'COPA'): Card => ({
    suit,
    number,
    value: 0 // Power will be calculated if using deck generation or ignored for Envido
});

describe('TrucoLogic', () => {

    describe('calculateEnvidoPoints', () => {
        it('should return 0 for empty hand', () => {
            expect(TrucoLogic.calculateEnvidoPoints([])).toBe(0);
        });

        it('should calculate Envido for two cards of same suit', () => {
            // 7 oro + 6 oro = 20 + 7 + 6 = 33
            const hand = [card(7, 'ORO'), card(6, 'ORO'), card(1, 'ESPADA')];
            expect(TrucoLogic.calculateEnvidoPoints(hand)).toBe(33);
        });

        it('should handle face cards (10, 11, 12) as 0 for Envido base', () => {
            // 11 copa (0) + 5 copa (5) = 20 + 0 + 5 = 25
            const hand = [card(11, 'COPA'), card(5, 'COPA'), card(1, 'BASTO')];
            expect(TrucoLogic.calculateEnvidoPoints(hand)).toBe(25);
        });

        it('should only count highest pair if 3 cards have same suit', () => {
            // 7 oro, 6 oro, 5 oro -> 7+6+20 = 33 (Highest pair)
            const hand = [card(7, 'ORO'), card(6, 'ORO'), card(5, 'ORO')];
            // 7+6+20=33 is the highest combination
            expect(TrucoLogic.calculateEnvidoPoints(hand)).toBe(33);
        });

        it('should handle hands with different suits (only highest value)', () => {
            // 7 oro, 1 espada, 4 basto. No pair. Highest is 7.
            const hand = [card(7, 'ORO'), card(1, 'ESPADA'), card(4, 'BASTO')];
            // 7 is highest single
            expect(TrucoLogic.calculateEnvidoPoints(hand)).toBe(7);
        });
    });

    describe('calculateFlorPoints', () => {
        // Assuming Flor is 3 cards same suit
        it('should return score for 3 cards of same suit', () => {
            // 5 oro + 2 oro + 1 oro = 20 + 5 + 2 + 1 = 28?
            // Standard Flor: 20 + sum of all values (face=0)
            const hand = [card(5, 'ORO'), card(2, 'ORO'), card(1, 'ORO')];
            expect(TrucoLogic.calculateFlorPoints(hand)).toBe(28);
        });
    });
});
