
import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { TrucoState, Card } from "../src/services/truco/TrucoTypes";

function createTestState(options: { targetScore: 15 | 30 }): TrucoState {
    return {
        options: { targetScore: options.targetScore, withFlor: true },
        currentRound: 1,
        turn: "p1",
        dealer: "p2",
        handWinner: null,
        players: [
            { playerId: "p1", cards: [], playedCards: [] },
            { playerId: "p2", cards: [], playedCards: [] }
        ],
        scoreA: 0,
        scoreB: 0,
        currentTableCards: [],
        roundWinners: [],
        status: "ACTIVE",
        pointsToScore: 1,
        pendingChallenge: null,
        envidoPlayed: false
    };
}

function runTest() {
    console.log("=== TEST: Falta Envido & Real Envido ===");

    // Test 1: Real Envido (3 pts)
    let state = createTestState({ targetScore: 30 });
    state.players[0].cards = [
        { number: 7, suit: "ORO", value: 11 }, { number: 6, suit: "ORO", value: 0 }, { number: 1, suit: "COPA", value: 0 }
    ]; // 33 Envido
    state.players[1].cards = [
        { number: 1, suit: "ESPADA", value: 14 }, { number: 2, suit: "BASTO", value: 0 }, { number: 3, suit: "COPA", value: 0 }
    ]; // 1 Envido

    console.log("\n--- Real Envido ---");
    state = TrucoLogic.applyMove(state, { action: "CALL_REAL_ENVIDO" }, "p1");
    if (state.pendingChallenge?.type === "REAL_ENVIDO") console.log("✅ Real Envido Called");

    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p2");
    if (state.scoreA === 3) console.log("✅ P1 wins 3 pts (Real Envido)");
    else console.error("❌ Real Envido Score Error:", state.scoreA);

    // Test 2: Falta Envido (Buenas - New Rule: Loser Lacks)
    console.log("\n--- Falta Envido (User Rule) ---");
    state = createTestState({ targetScore: 30 });
    state.scoreA = 20; // P1 Score
    state.scoreB = 10; // P2 Score. P2 Lacks 20.
    // P1 (33) vs P2 (1). P1 wins.
    // Loser is P2. P2 has 10. Lacks 20.
    // P1 should get 20 points.

    state.players[0].cards = [{ number: 7, suit: "ORO", value: 0 }, { number: 6, suit: "ORO", value: 0 }, { number: 1, suit: "COPA", value: 0 }];
    state.players[1].cards = [{ number: 1, suit: "ESPADA", value: 0 }, { number: 2, suit: "BASTO", value: 0 }, { number: 3, suit: "COPA", value: 0 }];

    state = TrucoLogic.applyMove(state, { action: "CALL_FALTA_ENVIDO" }, "p1");
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p2");

    // P1 Start: 20. Win 20. Score: 40 -> Caps at 30? Or check delta?
    // Engine checks game over >= 30.
    if (state.scoreA >= 30 && state.status === "FINISHED") console.log("✅ P1 wins 20 pts (Loser Lacks) and FINISHES game");
    else console.error("❌ Falta Envido Rule Error:", state.scoreA, state.status);


    // Test 3: Falta Envido (Inverse Case)
    console.log("\n--- Falta Envido (Inverse) ---");
    state = createTestState({ targetScore: 30 });
    state.scoreA = 5;
    state.scoreB = 25; // P2 has 25.
    // P1 (33) vs P2 (1). P1 wins.
    // Loser is P2. P2 has 25. Lacks 5.
    // P1 should get 5 points.
    state.players[0].cards = [{ number: 7, suit: "ORO", value: 0 }, { number: 6, suit: "ORO", value: 0 }, { number: 1, suit: "COPA", value: 0 }];
    state.players[1].cards = [{ number: 1, suit: "ESPADA", value: 0 }, { number: 2, suit: "BASTO", value: 0 }, { number: 3, suit: "COPA", value: 0 }];

    state = TrucoLogic.applyMove(state, { action: "CALL_FALTA_ENVIDO" }, "p1");
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p2");

    // P1 Start: 5. Win 5. Final: 10.
    if (state.scoreA === 10) console.log("✅ P1 wins 5 pts (Loser P2 lacked 5)");
    else console.error("❌ Falta Envido Inverse Error:", state.scoreA);

    // Test 4: Falta Envido Rejected (Envido -> Falta Envido)
    console.log("\n--- Rejecting Falta Envido ---");
    state = createTestState({ targetScore: 30 });
    state = TrucoLogic.applyMove(state, { action: "CALL_ENVIDO" }, "p1");
    state = TrucoLogic.applyMove(state, { action: "CALL_FALTA_ENVIDO" }, "p2"); // Raise

    // Check pending points
    if (state.pendingChallenge?.pointsPending === 2) console.log("✅ Rejection points correct (2)");
    else console.error("❌ Rejection points error:", state.pendingChallenge?.pointsPending);

    state = TrucoLogic.applyMove(state, { action: "REJECT" }, "p1");
    if (state.scoreB === 2) console.log("✅ P2 wins 2 pts (Rejection of Falta Envido raised from Envido)");
    else console.error("❌ Rejection Score Error:", state.scoreB);

}

runTest();
