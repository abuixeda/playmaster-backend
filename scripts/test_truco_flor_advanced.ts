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

async function testFlorChallenge() {
    console.log("🌸 Testing Flor Challenge (Both have Flor)...");
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: true });

    // P1 Flor
    state.players[0].cards = [
        { number: 3, suit: "BASTO", value: 10 },
        { number: 2, suit: "BASTO", value: 9 },
        { number: 6, suit: "BASTO", value: 3 }
    ];

    // P2 Flor
    state.players[1].cards = [
        { number: 7, suit: "ESPADA", value: 12 },
        { number: 6, suit: "ESPADA", value: 3 },
        { number: 5, suit: "ESPADA", value: 2 }
    ];

    const s2 = TrucoLogic.applyMove(state, { action: "CALL_FLOR" } as any, "p1");
    // Should trigger challenge now, NOT auto-win
    assert(s2.pendingChallenge?.type === "FLOR", "Challenge FLOR triggered");

    // P2 calls CONTRAFLOR
    const s3 = TrucoLogic.applyMove(s2, { action: "CALL_CONTRAFLOR" } as any, "p2");

    // P1 Accepts
    const s4 = TrucoLogic.applyMove(s3, { action: "ACCEPT" } as any, "p1"); // P2 wins

    console.log(`Score: ${s4.scoreA}-${s4.scoreB}`);
    assert(s4.scoreB === 6, "P2 wins 6 points (Contraflor)");
}

async function testAlRestoUserScenario() {
    console.log("🌸 Testing Al Resto (User Scenario)...");
    // "Vos tenes 29, yo 15. Si yo te gano, gano 1 punto."
    // Leader (P1) = 29. Trailer (P2) = 15.

    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: true });
    state.players[0].cards = [{ number: 3, suit: "BASTO", value: 10 }, { number: 2, suit: "BASTO", value: 9 }, { number: 6, suit: "BASTO", value: 3 }];
    state.players[1].cards = [{ number: 7, suit: "ESPADA", value: 12 }, { number: 6, suit: "ESPADA", value: 3 }, { number: 5, suit: "ESPADA", value: 2 }];

    state.scoreA = 29;
    state.scoreB = 15;

    const s2 = TrucoLogic.applyMove(state, { action: "CALL_FLOR" }, "p1");
    // P2 calls Resto
    const s3 = TrucoLogic.applyMove(s2, { action: "CALL_CONTRAFLOR_AL_RESTO" }, "p2");

    // P1 Accepts (P2 wins with Espada)
    const s4 = TrucoLogic.applyMove(s3, { action: "ACCEPT" }, "p1");

    console.log(`Score: ${s4.scoreA}-${s4.scoreB}`);
    // Leader needs 1 point to win (30-29).
    // Winner (P2) gets 1 point.
    // P2 score: 15 + 1 = 16.
    assert(s4.scoreB === 16, "P2 should only get 1 point (Leader lacks 1)");
    assert(s4.status === "ACTIVE", "Game continues");
}

async function testAlRestoBothMalas() {
    console.log("🌸 Testing Al Resto (Both Malas)...");
    const state = TrucoLogic.createInitialState(["p1", "p2"], { targetScore: 30, withFlor: true });
    state.players[0].cards = [{ number: 3, suit: "BASTO", value: 10 }, { number: 2, suit: "BASTO", value: 9 }, { number: 6, suit: "BASTO", value: 3 }];
    state.players[1].cards = [{ number: 7, suit: "ESPADA", value: 12 }, { number: 6, suit: "ESPADA", value: 3 }, { number: 5, suit: "ESPADA", value: 2 }];

    state.scoreA = 5;
    state.scoreB = 10;
    // Leader 10. Lacks 20.
    // Winner P2 gets 20. Total 30.

    const s2 = TrucoLogic.applyMove(state, { action: "CALL_FLOR" }, "p1");
    const s3 = TrucoLogic.applyMove(s2, { action: "CALL_CONTRAFLOR_AL_RESTO" }, "p2");
    const s4 = TrucoLogic.applyMove(s3, { action: "ACCEPT" }, "p1");

    console.log(`Score: ${s4.scoreA}-${s4.scoreB}`);
    assert(s4.scoreB === 30, "P2 reaches 30");
    assert(s4.status === "FINISHED", "Game Finished");
}

testFlorChallenge();
testAlRestoUserScenario();
testAlRestoBothMalas();
