
import { TrucoLogic } from "../src/services/truco/TrucoLogic";
import { assert } from "console";

function test(name: string, fn: () => void) {
    try {
        console.log(`Running: ${name}`);
        fn();
        console.log(`✅ PASS: ${name}`);
    } catch (e: any) {
        console.error(`❌ FAIL: ${name} - ${e.message}`);
        process.exit(1);
    }
}

function verify(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
}

// Helper to force card plays for testing logic
// Since Logic uses random deck, we might need to mock or carefully control play?
// Or we can rely on logical outcome if we can force specific cards?
// We cannot easily force cards with current Logic class (it deals random).
// We might need to extend Logic or add a debug method to set cards.
// OR we can trust the 'resolveRound' logic review and just run a basic integration test if possible.

// But wait, ApplyMove takes a Card object.
// Validation checks if player HAS the card.
// So we must play cards they have.
// We can't easily force a TIE unless we get lucky with dealt cards?
// OR we can create a state with specific cards manually, bypassing createInitialState.

const mockState = (p1Cards: any[], p2Cards: any[]): any => {
    return {
        options: { targetScore: 30, withFlor: false },
        currentRound: 1,
        turn: "p1",
        dealer: "p2",
        handWinner: null,
        players: [
            { playerId: "p1", cards: p1Cards, playedCards: [] },
            { playerId: "p2", cards: p2Cards, playedCards: [] }
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
};

test("Parda in First Round -> Second Round Winner Wins", () => {
    // 1_ESPADA vs 1_ESPADA (Tie?) No, suits unique in deck.
    // TIE happens if values are equal.
    // 3_ESPADA (10) vs 3_BASTO (10).
    const p1Hand = [{ number: 3, suit: "ESPADA", value: 10 }];
    const p2Hand = [{ number: 3, suit: "BASTO", value: 10 }, { number: 7, suit: "ESPADA", value: 12 }]; // Winner card for round 2
    // P1 needs a loser card for round 2?
    const p1HandFull = [{ number: 3, suit: "ESPADA", value: 10 }, { number: 4, suit: "COPA", value: 1 }];

    const state: any = mockState(p1HandFull, p2Hand);

    // Round 1: Tie
    let s = TrucoLogic.applyMove(state, { action: "PLAY_CARD", card: p1HandFull[0] as any }, "p1");
    verify(s.roundWinners.length === 0, "Round not over yet");

    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p2Hand[0] as any }, "p2");

    verify(s.roundWinners.length === 1, "Round 1 finished");
    verify(s.roundWinners[0] === "TIE", "Round 1 was a TIE");
    verify(s.currentRound === 2, "Moved to Round 2");

    // Who starts Round 2?
    // In Tie, Mano (starter of round) starts next? Or starter of match?
    // Logic: if TIE, "Next Turn" rotates usually to dealer+1 (Mano).
    // Our mock dealer p2, so p1 is Mano. P1 should start.
    verify(s.turn === "p1", "P1 starts Round 2 (Mano)");

    // Round 2: P2 wins
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p1HandFull[1] as any }, "p1");
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p2Hand[1] as any }, "p2");

    // Game Over?
    verify(s.status === "WAITING_FOR_NEXT_HAND" || s.status === "FINISHED", "Hand Finished");
    verify(s.scoreB === 1, "P2 Won 1 point");
});

test.call(null, "Primera Vale (P1 wins 1st, Tie 2nd -> P1 Wins)", () => {
    const p1 = [{ number: 1, suit: "ESPADA", value: 14 }, { number: 3, suit: "ESPADA", value: 10 }];
    const p2 = [{ number: 4, suit: "COPA", value: 1 }, { number: 3, suit: "BASTO", value: 10 }];

    let s = mockState(p1, p2);

    // R1: P1 Wins
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p1[0] as any }, "p1");
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p2[0] as any }, "p2");
    verify(s.roundWinners[0] === "p1", "P1 won Round 1");

    // R2: Tie
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p1[1] as any }, "p1");
    s = TrucoLogic.applyMove(s, { action: "PLAY_CARD", card: p2[1] as any }, "p2");
    verify(s.roundWinners[1] === "TIE", "Round 2 Tied");

    // Should finish
    verify(s.status === "WAITING_FOR_NEXT_HAND", "Hand Over");
    verify(s.scoreA === 1, "P1 Won (Primera Vale)");
});

runTests();

function runTests() {
    // Just executing the function calls above
}
