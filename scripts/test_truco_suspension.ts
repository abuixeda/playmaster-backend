
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

async function testTrucoSuspension() {
    console.log("🃏 Testing Truco Suspension (Envido over Truco)...");
    // Initial state: Round 1 (only time Envido is allowed)
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: false });

    // P1 calls Truco
    console.log("P1 calls Truco...");
    const state2 = TrucoLogic.applyMove(state, { action: "CALL_TRUCO" }, "p1");
    assert(state2.pendingChallenge?.type === "TRUCO", "Challenge is TRUCO");
    assert(state2.turn === "p2", "Turn passed to P2");

    // P2 calls Envido (Allowed? Yes, in Round 1)
    console.log("P2 calls Envido (interrupting Truco)...");
    const state3 = TrucoLogic.applyMove(state2, { action: "CALL_ENVIDO" }, "p2");

    assert(state3.pendingChallenge?.type === "ENVIDO", "Challenge is now ENVIDO");
    assert(state3.suspendedChallenge?.type === "TRUCO", "Truco is suspended");
    assert(state3.turn === "p1", "Turn passed back to P1 to answer Envido");

    // P1 Accepts Envido
    console.log("P1 Accepts Envido...");
    const state4 = TrucoLogic.applyMove(state3, { action: "ACCEPT" }, "p1");

    // Check Envido resolution
    assert(state4.envidoPlayed === true, "Envido marked as played");
    assert(state4.lastEnvidoResult !== undefined, "Envido result stored");
    // Winner depends on random cards, but points should be added. 
    // Initial scores 0-0. One should have >= 2 points now.
    assert(state4.scoreA >= 2 || state4.scoreB >= 2, "Envido points awarded");

    // Truco Suspension Handling:
    // After Envido, the turn should return to P2 to answer the suspended Truco?
    // Or does the Truco get cancelled?
    // Rule: "El Envido suspende el Truco". After Envido is resolved, the Truco challenge is effectively 're-proposed' or simply resumes.
    // The previous challenger (P1) already said "Truco". P2 used "Envido" as a temporary counter.
    // Now P2 must answer the Truco (Quiero/No Quiero/Retruco).

    // Logic implementation check:
    // TrucoLogic.ts lines 479-482:
    // if (newState.suspendedChallenge) { ... restoreTurnToCardPlayer ... }
    // Wait, restoring turn to card player might be WRONG if we need to answer Truco.
    // If we restore turn to card player, P2 might play a card without answering Truco?
    // BUT P2 *must* answer Truco.
    // Does the Logic restore the PendingChallenge TRUCO from Suspended?

    // Inspect state4
    if (state4.pendingChallenge?.type === "TRUCO") {
        console.log("✅ Suspended Challenge automatically restored to Pending.");
    } else {
        console.log("⚠️ Pending Challenge is null. Checking if we need to manually restore or if Logic failed.");
        // If Logic restored to card player, P2 is turn.
        // Can P2 play card?
        // If P2 plays card, does he accept Truco automatically? Or does he ignore it?
        // Standard rule: Cannot play card if challenged.
    }

    // Actually, looking at TrucoLogic.ts:
    // if (newState.suspendedChallenge) { newState.suspendedChallenge = null; this.restoreTurnToCardPlayer(newState); }
    // It clears suspendedChallenge and goes to card play! 
    // This effectively CANCELS the Truco!
    // This might be the bug or specific rule interpretation.
    // Usually: If I say Truco, you say Envido. We play Envido. Then you must still answer Truco.

    // Let's assert what happens currently vs what should happen.
    // If the expectation is that Truco continues... current logic fails.

    assert(state4.pendingChallenge?.type === "TRUCO", "Current Logic cancels Truco (Pending is null)");
    assert(state4.turn === "p2", "Turn back to P2 to answer Truco");

    // Test continuation
    if (state4.pendingChallenge?.type === "TRUCO") {
        console.log("✅ Suspended Challenge automatically restored to Pending.");
        // P2 Accepts Truco
        const state5 = TrucoLogic.applyMove(state4, { action: "ACCEPT" }, "p2");
        assert(state5.pointsToScore === 2, "Truco points active (2)");
        assert(state5.pendingChallenge === null, "Truco accepted, no pending challenge");
    }

    // Let's assume we want to Fix this.
    // For now, let's see what the test says.
}

testTrucoSuspension();
