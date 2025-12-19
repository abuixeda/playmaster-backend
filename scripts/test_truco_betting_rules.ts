
import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { TrucoState, TrucoMove } from "../src/services/truco/TrucoTypes";

function testBettingRules() {
    console.log("=== Testing Truco Betting Rules (Last Bet Maker) ===");

    const players = ["P1", "P2"];
    let state = TrucoLogic.createInitialState(players, { targetScore: 30, withFlor: false });

    // Simulate Round Start
    state.turn = "P1";

    // 1. P1 Calls Truco
    console.log("1. P1 Calls Truco...");
    state = TrucoLogic.applyMove(state, { action: "CALL_TRUCO" }, "P1");
    // State: Pending TRUCO (Challenger: P1)

    // 2. P2 Accepts
    console.log("2. P2 Accepts...");
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "P2");

    if (state.pointsToScore !== 2) throw new Error("Points should be 2");
    if (state.lastBetMaker !== "P1") throw new Error(`Last Bet Maker should be P1, got ${state.lastBetMaker}`);

    // 3. P1 tries to call Retruco (Should Fail)
    console.log("3. P1 tries to call Retruco (Should Fail)...");
    const errorP1 = TrucoLogic.validateMove(state, { action: "CALL_RETRUCO" }, "P1");
    if (errorP1 !== "Cannot raise your own bet") throw new Error(`P1 should be blocked from Retruco. Error: ${errorP1}`);

    // 4. P2 Calls Retruco (Should Succeed)
    console.log("4. P2 Calls Retruco (Should Succeed)...");

    // Note: It might not be P2's turn to play a CARD, but betting is allowed?
    // TrucoLogic validates "turn" for moves. 
    // If acceptance restored turn to P1 (based on who started round), can P2 interrupt to Retruco?
    // Usually, yes, "el quiero vale retruco" implies immediateness OR anytime when they have priority.
    // The current logic checks `state.turn !== playerId` in line 93.
    // So if it's P1's turn to PLAY CARD, P2 cannot call Retruco unless we implement an 'interrupt' or P2 waits for turn.
    // STANDARD TRUCO: You can usually call bets on your turn.
    // If P1 played card, turn is P2. P2 can Retruco.
    // If P1 hasn't played, turn is P1. P2 has to wait.

    // Let's assume P1 Plays a card, then P2 gets turn.
    const cardP1 = state.players[0].cards[0];
    state = TrucoLogic.applyMove(state, { action: "PLAY_CARD", card: cardP1 }, "P1");

    // Now P2 turn
    const errorP2 = TrucoLogic.validateMove(state, { action: "CALL_RETRUCO" }, "P2");
    if (errorP2) throw new Error(`P2 should be able to call Retruco. Error: ${errorP2}`);

    state = TrucoLogic.applyMove(state, { action: "CALL_RETRUCO" }, "P2");

    // 5. P1 Accepts Retruco
    console.log("5. P1 Accepts Retruco...");
    state = TrucoLogic.applyMove(state, { action: "ACCEPT" }, "P1");

    if (state.pointsToScore !== 3) throw new Error("Points should be 3");
    if (state.lastBetMaker !== "P2") throw new Error(`Last Bet Maker should be P2, got ${state.lastBetMaker}`);

    // 6. P2 tries to call Vale 4 (Should Fail)
    console.log("6. P2 tries to call Vale 4 (Should Fail)...");
    // Need P2 turn again? P1 accepted, turn restored to P2 (card player).
    // wait, `restoreTurnToCardPlayer`:
    // P1 Played card. P2 needs to play card. Turn is P2.
    // P2 previously Called Retruco.
    // P1 Accepted.
    // suspended/pending restore -> Turn restored to P2.

    const errorP2Vale4 = TrucoLogic.validateMove(state, { action: "CALL_VALE4" }, "P2");
    if (errorP2Vale4 !== "Cannot raise your own bet") throw new Error(`P2 should be blocked from Vale 4. Error: ${errorP2Vale4}`);

    console.log("✅ All Betting Rules Verified!");
}

testBettingRules();
