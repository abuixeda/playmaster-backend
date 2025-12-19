export type RPSChoice = "ROCK" | "PAPER" | "SCISSORS" | null;

// Map player ID to their choice
export interface RPSState {
    players: { [playerId: string]: { choice: RPSChoice, score: number, username?: string } };
    winner: string | "TIE" | null; // null = waiting, string = playerId, TIE. Match winner if FINISHED, Round winner if ROUND_OVER
    status: "WAITING" | "ROUND_OVER" | "FINISHED";
    round: number;
    roundWinner: string | "TIE" | null; // Winner of the specific round
    history: { winner: string | "TIE", p1Choice: RPSChoice, p2Choice: RPSChoice }[];
}

export interface RPSMove {
    playerId: string;
    choice: RPSChoice;
}
