
import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { Card } from "../src/services/truco/TrucoTypes";

function testFlorLogic() {
    console.log("=== Testing Flor Logic ===");

    // Use a public wrapper or reflection to test private static if needed, 
    // but TrucoLogic doesn't expose hasFlor publicly?
    // We can test behavior via applyMove.

    const players = ["P1", "P2"];
    let state = TrucoLogic.createInitialState(players, { targetScore: 30, withFlor: true });

    // Mock Hands
    // P1 has Flor
    state.players[0].cards = [
        { number: 1, suit: "ESPADA", value: 14 },
        { number: 2, suit: "ESPADA", value: 9 },
        { number: 3, suit: "ESPADA", value: 10 }
    ];

    // Case 1: P2 does NOT have Flor
    state.players[1].cards = [
        { number: 1, suit: "BASTO", value: 13 },
        { number: 2, suit: "ORO", value: 9 },
        { number: 3, suit: "COPA", value: 10 }
    ];

    state.turn = "P1";
    console.log("1. Testing Flor vs No-Flor...");
    state = TrucoLogic.applyMove(state, { action: "CALL_FLOR" }, "P1");

    if (state.scoreA !== 3) throw new Error(`Expected 3 points for P1, got ${state.scoreA}`);
    console.log("   ✅ Awarded 3 points correctly.");

    // Reset
    state = TrucoLogic.createInitialState(players, { targetScore: 30, withFlor: true });
    state.players[0].cards = [
        { number: 1, suit: "ESPADA", value: 14 },
        { number: 2, suit: "ESPADA", value: 9 },
        { number: 3, suit: "ESPADA", value: 10 }
    ];

    // Case 2: P2 HAS Flor
    state.players[1].cards = [
        { number: 7, suit: "BASTO", value: 4 },
        { number: 6, suit: "BASTO", value: 3 },
        { number: 5, suit: "BASTO", value: 2 }
    ];
    state.turn = "P1";

    console.log("2. Testing Flor vs Flor (Challenge Trigger)...");
    state = TrucoLogic.applyMove(state, { action: "CALL_FLOR" }, "P1");

    if (state.scoreA !== 0) throw new Error("Should not award points immediately");
    if (!state.pendingChallenge || state.pendingChallenge.type !== "FLOR") throw new Error("Should trigger Flor Challenge");
    console.log("   ✅ Triggered Flor Challenge.");

    // P2 Accepts
    console.log("3. P2 Accepts Flor vs Flor...");
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "P2");

    // P1 (35 pts) vs P2 (Flor 7,6,5 = 20+7+6+5=38). 
    // Wait, Flor Calc: 20 + sum(values). values: 7,6,5 = 18. Total 38?
    // P1: 1,2,3 Espada. 1=1, 2=2, 3=3? No, Truco numbers.
    // Envido/Flor numbers: 1,2,3,4,5,6,7. 10,11,12 are 0.
    // P1: 1+2+3 = 6. +20 = 26.
    // P2: 7+6+5 = 18. +20 = 38.
    // Winner should be P2.

    if (state.scoreB !== 6) throw new Error(`Expected 6 points for P2 (Winner), got A:${state.scoreA} B:${state.scoreB}`);
    console.log("   ✅ Awarded 6 points to winner of Flor vs Flor.");

}

testFlorLogic();
