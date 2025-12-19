export type Suit = "ESPADA" | "BASTO" | "ORO" | "COPA";

export interface Card {
    number: number;
    suit: Suit;
    value: number; // For comparing winning cards (Jerarquía)
}

export type TrucoAction =
    | "PLAY_CARD"
    | "CALL_ENVIDO" | "CALL_REAL_ENVIDO" | "CALL_FALTA_ENVIDO"
    | "CALL_TRUCO" | "CALL_RETRUCO" | "CALL_VALE4"
    | "CALL_FLOR" | "CALL_CONTRAFLOR" | "CALL_CONTRAFLOR_AL_RESTO"
    | "GO_TO_DECK" | "REMATCH" | "ACCEPT" | "REJECT" | "FOLD";

export interface TrucoMove {
    action: TrucoAction;
    card?: Card; // Only if action is PLAY_CARD
}

export interface PlayerHand {
    playerId: string;
    username?: string; // Enhanced via socket
    cards: Card[];
    playedCards: Card[]; // Cards played in current round
}

export interface TrucoOptions {
    targetScore: 15 | 30;
    withFlor: boolean;
}

export interface TrucoState {
    options: TrucoOptions;
    currentRound: number; // 1, 2, or 3 (First, Second, Third hand)
    turn: string; // PlayerId who must play
    dealer: string; // PlayerId who dealt
    handWinner: string | null; // Winner of the current hand (manopla)

    players: PlayerHand[];

    scoreA: number; // Team A or Player A score
    scoreB: number;

    // Track who played cards in the current round (e.g. 1st hand)
    currentTableCards: { playerId: string; card: Card }[];

    // Track winners of rounds [winnerRound1, winnerRound2, winnerRound3]
    roundWinners: (string | "TIE")[];

    status: "ACTIVE" | "FINISHED" | "WAITING_FOR_NEXT_HAND";
    winnerId?: string;

    // Phase 2: Betting State
    pointsToScore: number; // Current value of the hand (Truco = 2, Retruco = 3, etc.)
    pendingChallenge: {
        type: "ENVIDO" | "ENVIDO_ENVIDO" | "REAL_ENVIDO" | "FALTA_ENVIDO" | "TRUCO" | "RETRUCO" | "VALE_4"
        | "FLOR" | "CONTRAFLOR" | "CONTRAFLOR_AL_RESTO";
        challengerId: string;
        pointsPending: number; // Points at stake if rejected
        pointsOnAccept?: number; // Points at stake if accepted (for additive Envido)
    } | null;
    suspendedChallenge?: {
        type: "TRUCO" | "RETRUCO" | "VALE_4";
        challengerId: string;
        pointsPending: number;
        pointsOnAccept?: number;
    } | null;
    envidoPlayed: boolean; // To prevent calling Envido twice or after 1st round
    lastEnvidoResult?: {
        winnerId: string;
        loserId: string;
        winnerScore: number;
        loserScore: number;
        type: "ENVIDO" | "ENVIDO_ENVIDO" | "REAL_ENVIDO" | "FALTA_ENVIDO" | "FLOR" | "CONTRAFLOR" | "CONTRAFLOR_AL_RESTO";
    };
    lastBetMaker?: string | null; // Tracks who made the last accepted betting call (Truco/Retruco/Vale4)
}
