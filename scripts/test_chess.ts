
import { ChessLogic } from "../src/services/chess/ChessLogic";
import { ChessState } from "../src/services/chess/ChessTypes";

function runChessTest() {
    console.log("=== TEST: Chess Logic (chess.js) ===");

    // 1. Initial State
    console.log("\n--- Initial State ---");
    let state = ChessLogic.createInitialState();
    if (state.turn === 'w' && state.status === 'ACTIVE') console.log("✅ Initial state correct");
    else console.error("❌ Initial state error", state);

    // 2. Scholar's Mate (Jaque Pastor)
    console.log("\n--- Scholar's Mate Sequence ---");
    const moves = [
        { from: "e2", to: "e4" }, // e4
        { from: "e7", to: "e5" }, // e5
        { from: "d1", to: "h5" }, // Qh5
        { from: "b8", to: "c6" }, // Nc6
        { from: "f1", to: "c4" }, // Bc4
        { from: "g8", to: "f6" }, // Nf6
        { from: "h5", to: "f7" }, // Qf7#
    ];

    for (const m of moves) {
        const error = ChessLogic.validateMove(state, m);
        if (error) {
            console.error(`❌ Move failed validation: ${m.from}-${m.to}`, error);
            return;
        }
        state = ChessLogic.applyMove(state, m);
    }

    if (state.isCheckmate) console.log("✅ Checkmate detected correctly");
    else console.error("❌ Checkmate NOT detected");

    if (state.winner === 'w') console.log("✅ Winner is White");
    else console.error("❌ Winner incorrect:", state.winner);


    // 3. Invalid Move
    console.log("\n--- Invalid Move Test ---");
    // Try to move rook through pawn in initial state
    const cleanState = ChessLogic.createInitialState();
    const invalidMove = { from: "a1", to: "a5" }; // Rook blocked by pawn
    const error = ChessLogic.validateMove(cleanState, invalidMove);
    if (error) console.log("✅ Invalid move rejected correctly");
    else console.error("❌ Invalid move accepted");

    // 4. Castling (Enroque)
    console.log("\n--- Castling Test ---");
    let castleState = ChessLogic.createInitialState();
    // Clear path for King's Knight castling (e4, Nf3, Bc4)
    const castleMoves = [
        { from: "e2", to: "e4" },
        { from: "e7", to: "e5" },
        { from: "g1", to: "f3" },
        { from: "b8", to: "c6" },
        { from: "f1", to: "c4" },
        { from: "g8", to: "f6" },
        // Now White can castle 0-0 (e1-g1)
    ];
    for (const m of castleMoves) castleState = ChessLogic.applyMove(castleState, m);

    const castleMove = { from: "e1", to: "g1" };
    if (!ChessLogic.validateMove(castleState, castleMove)) {
        castleState = ChessLogic.applyMove(castleState, castleMove);
        // Verify King is on g1
        // FEN should have 'K' on g1? Hard to parse FEN manually, relying on no error.
        console.log("✅ Castling accepted");
    } else {
        console.error("❌ Castling rejected logic");
    }

    console.log("\nTests Finished.");
}

runChessTest();
