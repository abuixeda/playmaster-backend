
import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { TrucoState } from "../src/services/truco/TrucoTypes";

function testScoring() {
    console.log("--- Testing Specialized Scoring Rules ---");

    // Helper to setup a scenario
    const setup = (scoreA: number, scoreB: number) => {
        const p1 = "p1";
        const p2 = "p2";
        const state = TrucoLogic.createInitialState([p1, p2], { targetScore: 30, withFlor: true }); // Enable Flor
        state.scoreA = scoreA;
        state.scoreB = scoreB;
        // P1 has higher Envido (33) vs P2 (20)
        state.players[0].cards = [
            { number: 7, suit: "ESPADA", value: 12 },
            { number: 6, suit: "ESPADA", value: 3 },
            { number: 5, suit: "ESPADA", value: 2 }
        ];
        state.players[1].cards = [
            { number: 10, suit: "ORO", value: 5 },
            { number: 11, suit: "ORO", value: 6 },
            { number: 12, suit: "ORO", value: 7 }
        ];
        return state;
    };

    // TEST 1: Falta Envido (User Rule: Target - Loser)
    // Scenario: P1=20, P2=10. P1 Wins. 
    // Loser is P2 (10). Points = 30 - 10 = 20.
    // P1 Final = 20 + 20 = 40 (Limit 30).
    console.log("\n[TEST 1] Falta Envido: P1(20) vs P2(10). P1 Wins.");
    let state = setup(20, 10);
    state.envidoPlayed = false;
    state.currentRound = 1;
    state.pendingChallenge = { type: "FALTA_ENVIDO", challengerId: "p2", pointsPending: 1 };

    // P1 Accepts (Wins because 33 > 20)
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p1");

    console.log(`Scores: ${state.scoreA} - ${state.scoreB}`);
    if (state.scoreA >= 30 && state.status === "FINISHED") {
        // Check how many points were added. Old 20. New should be >=30.
        // If points = 20, scoreA = 40.
        console.log("SUCCESS: P1 won logic matches.");
    } else {
        console.error("FAIL: P1 should have won match.");
    }

    // TEST 2: Falta Envido (User Rule: Target - Loser)
    // Scenario: P1=20, P2=10. P2 Wins. (Swap cards)
    // Loser is P1 (20). Points = 30 - 20 = 10.
    // P2 Final = 10 + 10 = 20.
    console.log("\n[TEST 2] Falta Envido: P1(20) vs P2(10). P2 Wins.");
    state = setup(20, 10);
    // Give P2 better cards (33) vs P1 (20)
    const tmp = state.players[0].cards;
    state.players[0].cards = state.players[1].cards;
    state.players[1].cards = tmp;

    state.envidoPlayed = false;
    state.currentRound = 1;
    state.pendingChallenge = { type: "FALTA_ENVIDO", challengerId: "p1", pointsPending: 1 };

    // P2 Accepts (Wins)
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p2");

    console.log(`Scores: ${state.scoreA} - ${state.scoreB}`);
    // Expected P2 score: 10 + (30-20) = 20.
    if (state.scoreB === 20) {
        console.log("SUCCESS: P2 got correct points (10).");
    } else {
        console.error(`FAIL: Expected 20, got ${state.scoreB}`);
    }


    // TEST 3: Contraflor Al Resto (Blyts Rule: Target - Leader)
    // Scenario: P1=20, P2=10. Target=30. Max=20. Points=10.
    // P2 Wins. P2 gets 10 points. Final P2=20.
    console.log("\n[TEST 3] Contraflor Al Resto: P1(20) vs P2(10). P2 Wins.");
    state = setup(20, 10);
    // Give P2 Flor (higher) vs P1 Flor (lower)
    state.players[0].cards = [
        { number: 1, suit: "ESPADA", value: 14 },
        { number: 2, suit: "ESPADA", value: 9 },
        { number: 3, suit: "ESPADA", value: 10 }
    ]; // Flor 36 ? No sum+20 = 6+20=26. (Values: 1,2,3).
    // Wait values for Flor: Sum of INDICES (numbers). 1+2+3 = 6 + 20 = 26.

    state.players[1].cards = [
        { number: 7, suit: "ORO", value: 11 },
        { number: 6, suit: "ORO", value: 3 },
        { number: 5, suit: "ORO", value: 2 }
    ]; // Flor 7+6+5 = 18 + 20 = 38.
    // P2 wins.

    state.envidoPlayed = false;
    state.currentRound = 1;
    state.pendingChallenge = { type: "CONTRAFLOR_AL_RESTO", challengerId: "p1", pointsPending: 6 };

    // P2 Accepts
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "p2");
    console.log(`Scores: ${state.scoreA} - ${state.scoreB}`);

    // Points = 30 - Leader(20) = 10.
    // P2 Score = 10 + 10 = 20.
    if (state.scoreB === 20) {
        console.log("SUCCESS: P2 got correct points (10).");
    } else {
        console.error(`FAIL: Expected 20, got ${state.scoreB}`);
    }
}

testScoring();
