
import { ChessLogic } from '../src/services/chess/ChessLogic';
import { ChessState, ChessMove } from '../src/services/chess/ChessTypes';
import * as fs from 'fs';

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('reproduction_result.txt', msg + '\n');
}

async function main() {
    fs.writeFileSync('reproduction_result.txt', ''); // Clear file
    log("--- Chess Repro Start ---");

    // 1. Initial State
    let state = ChessLogic.createInitialState();
    log(`Initial FEN: ${state.fen}`);

    // 2. Make some moves
    const moves: ChessMove[] = [
        { from: 'e2', to: 'e4' },
        { from: 'e7', to: 'e5' },
        { from: 'g1', to: 'f3' }
    ];

    for (const m of moves) {
        const err = ChessLogic.validateMove(state, m);
        if (err) {
            log(`Validation Error during setup: ${err}`);
            process.exit(1);
        }
        state = ChessLogic.applyMove(state, m);

        // Deserialize/Serialize
        state = JSON.parse(JSON.stringify(state));
    }
    log(`Setup complete. Current FEN: ${state.fen}`);

    // 3. Test Cases
    const testCases: { name: string, move: ChessMove, expectError: boolean }[] = [
        {
            name: "Standard move with unwanted promotion (Knight)",
            move: { from: 'b8', to: 'c6', promotion: 'q' },
            expectError: false // Should be handled gracefully
        },
        {
            name: "Standard move with unwanted promotion (Pawn)",
            move: { from: 'd7', to: 'd6', promotion: 'q' }, // Valid move d7-d6 (Black) but promotion is useless
            expectError: false
        }
    ];

    for (const test of testCases) {
        log(`\nTesting: ${test.name}`);
        log(`Move: ${JSON.stringify(test.move)}`);
        const err = ChessLogic.validateMove(state, test.move);
        if (err) {
            log(`==> Result: ERROR: ${err}`);
        } else {
            log("==> Result: SUCCESS");
            const newState = ChessLogic.applyMove(state, test.move);
            log(`Applied Move FEN: ${newState.fen}`);
        }
    }
}

main().then(() => log("\nDone")).catch(e => log(e.toString()));
