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

            try {
                const result = chess.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion || 'q'
                });
                if (!result) return "Invalid move";
            } catch (e) {
                return "Invalid move rule";
            }

            return null;
        } catch (e) {
            return "Invalid board state";
        }
    }

    static applyMove(stateJSON: ChessState, move: ChessMove): ChessState {
        const chess = this.recoverGame(stateJSON);

        try {
            chess.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || 'q'
            });
        } catch (e) {
            return stateJSON;
        }

        return this.mapState(chess);
    }

    private static recoverGame(state: ChessState): Chess {
        const chess = new Chess();

        // Try replay history first for full state accuracy (draws etc)
        if (state.history && state.history.length > 0) {
            try {
                for (const moveSan of state.history) {
                    chess.move(moveSan);
                }
                // Verify FEN matches? 
                // if (chess.fen() !== state.fen) console.warn("FEN Mismatch after replay");
                return chess;
            } catch (e) {
                // If replay fails, fallback to FEN (lost history but playable)
                // console.error("History replay failed, falling back to FEN", e);
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
