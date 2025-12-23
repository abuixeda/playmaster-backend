import { Chess } from 'chess.js';
import { ChessState, ChessMove } from './ChessTypes';

export class ChessLogic {

    static createInitialState(): ChessState {
        const chess = new Chess();
        return this.mapState(chess);
    }

    static validateMove(stateJSON: ChessState, move: ChessMove): string | null {
        try {
            const chess = this.recoverGame(stateJSON);
            let result = null;

            // 1. Try exact move
            try {
                // console.log("Trying exact move:", move);
                result = chess.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion
                });
            } catch (e) {
                // console.log("Exact move threw exception");
            }

            // 2. Fallback: If failed (null or threw) and promotion was provided, try without it
            if (!result && move.promotion) {
                // console.log("Attempting fallback without promotion");
                try {
                    result = chess.move({
                        from: move.from,
                        to: move.to
                    });
                    // console.log("Fallback result:", result);
                } catch (e2) {
                    // console.log("Fallback threw exception:", e2);
                    result = null;
                }
            }

            if (!result) {
                console.error("ChessLogic: result is null for move", move);
                // console.error("Valid moves:", chess.moves());
                return "Invalid move";
            }
            return null;

        } catch (e) {
            console.error("ChessLogic Validate Exception:", e);
            console.error("ChessLogic State passed:", JSON.stringify(stateJSON));
            return "Invalid move rule";
        }
    }

    static applyMove(stateJSON: ChessState, move: ChessMove): ChessState {
        const chess = this.recoverGame(stateJSON);
        let moveResult = null;

        try {
            moveResult = chess.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion
            });
        } catch (e) {
            // Ignore exception
        }

        // Fallback: Retrying without promotion if it failed
        if (!moveResult && move.promotion) {
            try {
                moveResult = chess.move({
                    from: move.from,
                    to: move.to
                });
            } catch (e2) {
                console.error("ChessLogic ApplyMove Fallback Error:", e2);
            }
        } else if (!moveResult) {
            // It failed and we didn't have promotion, or we threw above. 
            // Logic below handles !moveResult
        }

        if (!moveResult) {
            console.error("ChessLogic: Failed to apply move even with fallback", move);
            return stateJSON;
        }

        const newState = this.mapState(chess);
        console.log("ChessLogic Applied Move:", JSON.stringify(move));
        console.log("New FEN:", newState.fen);
        return newState;
    }

    private static recoverGame(state: ChessState): Chess {
        const chess = new Chess();

        // Try replay history first for full state accuracy (draws etc)
        if (state.history && state.history.length > 0) {
            try {
                for (const moveSan of state.history) {
                    chess.move(moveSan);
                }
                return chess;
            } catch (e) {
                // If replay fails, fallback to FEN (lost history but playable)
            }
        }

        // Fallback or Empty
        return new Chess(state.fen);
    }

    private static mapState(chess: Chess): ChessState {
        // history() returns all moves if we replayed them.
        const history = chess.history();

        let winner: "w" | "b" | "draw" | undefined = undefined;
        let status: "ACTIVE" | "FINISHED" = "ACTIVE";

        if (chess.isGameOver()) {
            status = "FINISHED";
            if (chess.isCheckmate()) {
                winner = chess.turn() === 'w' ? 'b' : 'w';
            } else {
                winner = 'draw';
            }
        }

        return {
            fen: chess.fen(),
            turn: chess.turn(),
            isCheck: chess.isCheck(),
            isCheckmate: chess.isCheckmate(),
            isDraw: chess.isDraw(),
            isStalemate: chess.isStalemate(),
            winner,
            history,
            status
        };
    }
}
