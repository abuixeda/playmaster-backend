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

async function testFlorDisabled() {
    console.log("🌸 Testing Flor (Disabled)...");
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: false });

    // Inject Flor cards for P1 (Espada)
    state.players[0].cards = [
        { number: 1, suit: "ESPADA", value: 14 },
        { number: 7, suit: "ESPADA", value: 12 },
        { number: 2, suit: "ESPADA", value: 9 }
    ];

    const err = TrucoLogic.validateMove(state, { action: "CALL_FLOR" } as any, "p1");
    // Should fail
    assert(err !== null, "Should return error when disabled");
    assert(err!.includes("disabled"), "Error msg correct");
}

async function testFlorOneSided() {
    console.log("🌸 Testing Flor (One sided w/ Flor)...");
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: true });

    // P1: Flor
    state.players[0].cards = [
        { number: 3, suit: "BASTO", value: 10 },
        { number: 2, suit: "BASTO", value: 9 },
        { number: 6, suit: "BASTO", value: 3 }
    ]; // 3+2+6 + 20 = 31

    // P2: No Flor
    state.players[1].cards = [
        { number: 1, suit: "ORO", value: 8 },
        { number: 1, suit: "COPA", value: 8 },
        { number: 1, suit: "ESPADA", value: 14 }
    ];

    const state2 = TrucoLogic.applyMove(state, { action: "CALL_FLOR" } as any, "p1");

    assert(state2.scoreA === 3, "P1 should get 3 points immediately");
    assert(state2.scoreB === 0, "P2 should have 0");
    // Game continues... status active
    assert(state2.status === "ACTIVE", "Game active");
}

async function testFlorVsFlor() {
    console.log("🌸 Testing Flor vs Flor (Auto-resolution)...");
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: true });

    // P1: Flor Basto (31)
    state.players[0].cards = [
        { number: 3, suit: "BASTO", value: 10 },
        { number: 2, suit: "BASTO", value: 9 },
        { number: 6, suit: "BASTO", value: 3 }
    ];

    // P2: Flor Espada (Better?)
    // 7, 6, 5 Espada = 7+6+5 + 20 = 38
    state.players[1].cards = [
        { number: 7, suit: "ESPADA", value: 12 },
        { number: 6, suit: "ESPADA", value: 3 },
        { number: 5, suit: "ESPADA", value: 2 }
    ];

    const state2 = TrucoLogic.applyMove(state, { action: "CALL_FLOR" } as any, "p1");

    console.log(`Score: ${state2.scoreA} vs ${state2.scoreB}`);
    assert(state2.scoreA === 0, "P1 lost Flor");
    assert(state2.scoreB === 6, "P2 won 6 points (Flor vs Flor)");
}

testFlorDisabled();
testFlorOneSided();
testFlorVsFlor();
