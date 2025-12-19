// src/services/GameEngine.ts
import { TrucoLogic } from "./truco/TrucoLogic";
import { ChessLogic } from "./chess/ChessLogic";

type GameState = any; // Placeholder for flexible state

export class GameEngine {
    /**
     * Validates if a move is legal for the given game type and current state.
     * Returns null if valid, or an error string if invalid.
     */
    static validateMove(
        gameType: string,
        currentState: any,
        move: any,
        playerId: string
    ): string | null {
        const type = gameType.toUpperCase();

        if (type === "TRUCO") {
            return TrucoLogic.validateMove(currentState, move, playerId);
        } else if (type === "CHESS") {
            return ChessLogic.validateMove(currentState, move);
        } else if (type === "POOL") {
            return this.validatePool(currentState, move, playerId);
        }

        return null;
    }

    static applyMove(
        gameType: string,
        currentState: any,
        move: any,
        playerId: string
    ): { state: any; isGameOver: boolean; winnerId?: string | "TIE" } {
        const type = gameType.toUpperCase();

        let state = currentState;

        if (type === "TRUCO") {
            // Assuming state is already initialized via createInitialState at game start
            state = TrucoLogic.applyMove(state, move, playerId);
            return {
                state,
                isGameOver: state.status === "FINISHED",
                winnerId: state.winnerId
            };
        } else if (type === "CHESS") {
            state = ChessLogic.applyMove(state, move);
            return {
                state,
                isGameOver: state.status === "FINISHED",
                winnerId: state.winner === "draw" ? "TIE" : state.winner // Map 'draw' to 'TIE' or keep as is? Engine seems to expect winnerId string or TIE.
            };
        }

        // ... Old logic for other games (fallback) ...
        // Initialize state if empty
        state = currentState || { history: [], turn: playerId };
        state.history.push({ playerId, move, timestamp: Date.now() });

        return { state, isGameOver: false };
    }





    private static validatePool(state: any, move: any, playerId: string): string | null {
        // Pool validation often complex (physics), maybe just verifying input format here
        return null;
    }
}
