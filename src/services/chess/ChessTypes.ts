
export interface ChessState {
    fen: string;
    turn: "w" | "b";
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
    isStalemate: boolean;
    winner?: "w" | "b" | "draw";
    history: string[]; // PGN or SAN moves
    status: "ACTIVE" | "FINISHED";
    players?: { playerId: string; username?: string }[];
}

export interface ChessMove {
    from: string; // e2
    to: string;   // e4
    promotion?: "q" | "r" | "b" | "n"; // defaults to 'q' usually
}
