
import { ChessLogic } from '../src/services/chess/ChessLogic';

console.log("Imported successfully");
try {
    const s = ChessLogic.createInitialState();
    console.log("Initial state created:", s.fen);
} catch (e) {
    console.error("Error:", e);
}
