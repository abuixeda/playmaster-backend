
import { ChessLogic } from '../src/services/chess/ChessLogic';
import { ChessState, ChessMove } from '../src/services/chess/ChessTypes';

async function main() {
    console.log("--- Chess Repro Start ---");

    // 1. Initial State
    let state = ChessLogic.createInitialState();
    console.log("Initial FEN:", state.fen);

    // 2. Make some moves
    const moves: ChessMove[] = [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e5' },
        { from: 'g1', to: 'f3' }
    ];

    for (const m of moves) {
        const err = ChessLogic.validateMove(state, m);
        if (err) {
            console.error("Validation Error:", err);
            process.exit(1);
        }
        state = ChessLogic.applyMove(state, m);
        console.log(`Applied ${m.from}-${m.to}. FEN: ${state.fen}`);

        // Simulate JSON serialization (DB trip)
        state = JSON.parse(JSON.stringify(state));
    }

    // 3. Try to reproduce "Invalid move rule" (Exception)
    // Hypothesis: Passing 'q' as promotion for a standard move (b8-c6) causes exception in chess.js
    const badMove: ChessMove = { from: 'b8', to: 'c6', promotion: 'q' };

    console.log("Testing potential bad move (Standard move with promotion='q'):", badMove);
    const err = ChessLogic.validateMove(state, badMove);
    if (err) {
        console.log("--> Result Error:", err);
    } else {
        console.log("--> Move Validated OK");
        state = ChessLogic.applyMove(state, badMove);
        console.log("New FEN:", state.fen);
    }

    // 4. Try with promotion explicit undefined (simulating clean JSON)
    const cleanMove: ChessMove = { from: 'b8', to: 'c6' }; // No promotion key
    console.log("Testing clean move:", cleanMove);
    // (Note: we need to reset state or apply this instead if above failed)

}

main();
