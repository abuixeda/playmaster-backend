import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { TrucoMove } from "../src/services/truco/TrucoTypes";

function assert(condition: boolean, msg: string) {
    if (!condition) {
        console.error(`❌ FAIL: ${msg}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${msg}`);
    }
}

async function testEnvidoRefused() {
    console.log("🃏 Testing Envido (Refused)...");

    // 1. Init
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: false });
    // Force P1 turn (assumed from init)

    // 2. P1 Calls Envido
    const move1: TrucoMove = { action: "CALL_ENVIDO" };
    const state2 = TrucoLogic.applyMove(state, move1, "p1");

    assert(state2.pendingChallenge?.type === "ENVIDO", "Challenge should be ENVIDO");
    assert(state2.turn === "p2", "Turn should be P2 to respond");

    // 3. P2 Rejects
    const move2: TrucoMove = { action: "REJECT" };
    const state3 = TrucoLogic.applyMove(state2, move2, "p2");

    // P1 should get 1 point
    console.log(`Score: P1=${state3.scoreA}, P2=${state3.scoreB}`);
    assert(state3.scoreA === 1, "P1 should have 1 point");
    assert(state3.pendingChallenge === null, "Challenge cleared");
    assert(state3.turn === "p1", "Turn returned to P1");
}

async function testEnvidoAccepted() {
    console.log("🃏 Testing Envido (Accepted)...");
    // 1. Init
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: false });

    // Hack cards to ensure p1 wins
    // P1: 7 Espada (32 pts if with 5 Espada/etc, but single?) 
    // Wait, createInitialState shuffles. We need to mock cards or rely on probability?
    // Let's just run it and check SOMEONE gets points.

    const move1: TrucoMove = { action: "CALL_ENVIDO" };
    const state2 = TrucoLogic.applyMove(state, move1, "p1");

    const move2: TrucoMove = { action: "ACCEPT" };
    const state3 = TrucoLogic.applyMove(state2, move2, "p2");

    console.log(`Score: P1=${state3.scoreA}, P2=${state3.scoreB}`);
    assert(state3.scoreA === 2 || state3.scoreB === 2, "Someone should have 2 points");
    // Note: If tie, P1 should win (scoreA)
}

testEnvidoRefused();
testEnvidoAccepted();
