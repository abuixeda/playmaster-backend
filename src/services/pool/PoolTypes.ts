export type PoolBallType = "SOLID" | "STRIPE" | "EIGHT" | "CUE";

export interface PoolBall {
    id: number;
    type: PoolBallType;
    x: number;
    y: number; // Normalized 0-1 or pixel coords? Let's use specific coords for table.
    // For sync simplicity, maybe backend doesn't track X/Y until turn end?
    // Actually, backend needs to store positions to sync late joiners or refresher.
}

export interface PoolState {
    balls: PoolBall[];
    currentPlayer: string | null; // PlayerID
    turn: number;
    assignedSolids: string | null; // PlayerID who has SOLIDS. Opponent has STRIPES.
    winner: string | null;
    status: "WAITING" | "PLAYING" | "FINISHED";
    shotInProgress: boolean; // True while client simulates
    gameType: 'POOL';
}

export interface PoolMove {
    playerId: string;
    action: "SHOT_START" | "SHOT_END" | "RESET";
    // For SHOT_START (client sends power/angle so opponent can replay)
    angle?: number;
    force?: number;
    // For SHOT_END (client sends final positions and sunk balls)
    finalBalls?: PoolBall[];
    sunkBallIds?: number[];
    fouls?: string[]; // "SCRATCH", "WRONG_BALL"
}
