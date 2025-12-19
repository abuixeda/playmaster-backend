
import { ChessLogic } from '../src/services/chess/ChessLogic';
import { ChessState } from '../src/services/chess/ChessTypes';

async function testChessLogic() {
    console.log("=== INICIANDO TEST DE LÓGICA DE AJEDREZ ===");

    // 1. Estado Inicial
    console.log("\n1. Probando Estado Inicial...");
    let state = ChessLogic.createInitialState();
    if (state.turn === 'w' && state.fen === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
        console.log("✅ Estado inicial correcto.");
    } else {
        console.error("❌ Estado inicial INCORRECTO:", state);
    }

    // 2. Movimiento Válido (Peón e2 -> e4)
    console.log("\n2. Probando Movimiento Válido (e2 -> e4)...");
    const move1 = { from: 'e2', to: 'e4' };
    const err1 = ChessLogic.validateMove(state, move1);
    if (err1 === null) {
        state = ChessLogic.applyMove(state, move1);
        console.log("✅ Movimiento validado y aplicado.");
        if (state.turn === 'b' && state.history.includes('e4')) {
            console.log("✅ Turno cambiado y historial actualizado.");
        } else {
            console.error("❌ Falla en cambio de turno o historial:", state);
        }
    } else {
        console.error("❌ Movimiento válido marcado como inválido:", err1);
    }

    // 3. Movimiento Inválido (Peón negro intenta mover en turno blanco o movimiento ilegal)
    console.log("\n3. Probando Movimiento Inválido...");
    // Intentar mover pieza blanca de nuevo (es turno de negras)
    const moveInvalid = { from: 'd2', to: 'd4' };
    const err2 = ChessLogic.validateMove(state, moveInvalid);
    // Nota: ChessLogic.validateMove actual reconstruye el tablero desde FEN.
    // El FEN dice que es turno de 'b'. Si intentamos mover una pieza blanca, chess.js debería fallar.
    if (err2) {
        console.log("✅ Movimiento inválido detectado correctamente:", err2);
    } else {
        console.error("❌ Movimiento ilegal permitido (mover blancas en turno de negras).");
    }

    // 4. Mate del Pastor (Scholar's Mate) para verificar fin de juego
    console.log("\n4. Probando Jaque Mate (Mate del Pastor)...");
    // Reiniciar
    state = ChessLogic.createInitialState();
    const moves = [
        { from: 'e2', to: 'e4' }, // W
        { from: 'e7', to: 'e5' }, // B
        { from: 'f1', to: 'c4' }, // W
        { from: 'b8', to: 'c6' }, // B
        { from: 'd1', to: 'h5' }, // W
        { from: 'g8', to: 'f6' }, // B - Error grave para el mate
        { from: 'h5', to: 'f7' }  // W - Mate
    ];

    for (const move of moves) {
        state = ChessLogic.applyMove(state, move);
    }

    if (state.isCheckmate && state.status === "FINISHED" && state.winner === 'w') {
        console.log("✅ Jaque Mate detectado correctamente. Ganan Blancas.");
    } else {
        console.error("❌ Fallo en detección de Jaque Mate:", state);
    }

    // 5. Verificación de Historial (Persistencia)
    console.log("\n5. Verificando integridad del Historial...");
    // El historial es un array de strings.
    console.log("Historial final:", state.history);
    if (state.history.length === 7) {
        console.log("✅ Longitud del historial correcta.");
    } else {
        console.error("❌ Longitud del historial incorrecta.");
    }

    // 6. Test Triple Repetición (Draw)
    console.log("\n6. Probando Triple Repetición...");
    state = ChessLogic.createInitialState();
    // Nf3 ... Ng1 ... Nf3 ... Ng1 ... (Repetir)
    // Moves to cause repetition
    const repMoves = [
        { from: 'g1', to: 'f3' }, // W
        { from: 'g8', to: 'f6' }, // B
        { from: 'f3', to: 'g1' }, // W
        { from: 'f6', to: 'g8' }, // B
        // Posición repetida 1 vez (inicio), 2 veces (ahora)

        { from: 'g1', to: 'f3' }, // W
        { from: 'g8', to: 'f6' }, // B
        { from: 'f3', to: 'g1' }, // W
        { from: 'f6', to: 'g8' }  // B
        // Repetida 3 veces
    ];

    for (const move of repMoves) {
        state = ChessLogic.applyMove(state, move);
    }

    // Debería ser draw
    if (state.isDraw || state.isStalemate) { // chess.js a veces agrupa esto
        console.log("✅ Empate por repetición detectado.");
    } else {
        console.log("⚠️ Empate por repetición NO detectado (Esperado si usamos solo FEN).");
        // No marcamos como error crítico aún, pero es un hallazgo.
    }

    console.log("\n=== TEST FINALIZADO ===");
}

testChessLogic();
