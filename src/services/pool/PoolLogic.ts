import { PoolState, PoolMove, PoolBall } from './PoolTypes';

export class PoolLogic {
    static createInitialState(): PoolState {
        // Initial Rack Positions (Standard Triangle)
        // We'll define a standard table size (e.g., 800x400) and rack at 75% X.
        const balls: PoolBall[] = [];

        // Cue Ball
        balls.push({ id: 0, type: "CUE", x: 200, y: 200 });

        // Rack (Simplified 1-ball setup for testing, or full rack?)
        // Let's do a simple diamond for now to ensure physics works, or standard pyramid.
        // Apex
        const apexX = 600;
        const apexY = 200;
        const radius = 10; // Ball radius approx

        let idCount = 1;
        // 5 rows: 1, 2, 3, 4, 5 balls
        // Row 1
        balls.push({ id: 1, type: "SOLID", x: apexX, y: apexY });
        // Row 2
        balls.push({ id: 2, type: "SOLID", x: apexX + 18, y: apexY - 11 });
        balls.push({ id: 9, type: "STRIPE", x: apexX + 18, y: apexY + 11 });
        // Row 3
        balls.push({ id: 10, type: "STRIPE", x: apexX + 36, y: apexY - 22 });
        balls.push({ id: 8, type: "EIGHT", x: apexX + 36, y: apexY }); // 8 Ball in center
        balls.push({ id: 3, type: "SOLID", x: apexX + 36, y: apexY + 22 });

        // ... Fill the rest for full game later, start with mini rack for MVP
        balls.push({ id: 11, type: "STRIPE", x: apexX + 54, y: apexY - 11 });
        balls.push({ id: 4, type: "SOLID", x: apexX + 54, y: apexY + 11 });

        return {
            balls,
            currentPlayer: null,
            turn: 0,
            assignedSolids: null,
            winner: null,
            status: "WAITING",
            shotInProgress: false,
            gameType: 'POOL'
        };
    }

    static applyMove(state: PoolState, move: PoolMove, playerIds: string[]): PoolState {
        const newState = { ...state };

        if (!newState.currentPlayer && playerIds.length > 0) {
            newState.currentPlayer = playerIds[0];
        }

        if (move.action === "RESET") {
            const fresh = this.createInitialState();
            fresh.currentPlayer = playerIds[0]; // Winner starts? or P1.
            return fresh;
        }

        if (move.action === "SHOT_START") {
            newState.shotInProgress = true;
            return newState;
        }

        if (move.action === "SHOT_END") {
            newState.shotInProgress = false;

            // Update positions
            if (move.finalBalls) {
                newState.balls = move.finalBalls;
            }

            // Process sunk balls & rules
            const sunkIds = move.sunkBallIds || [];
            const player = move.playerId;
            const isScratched = move.fouls?.includes("SCRATCH");

            let turnContinues = false;

            if (isScratched) {
                // Return Cue Ball to kitchen (simple reset for now)
                const cueBall = newState.balls.find(b => b.id === 0);
                if (cueBall) {
                    cueBall.x = 200;
                    cueBall.y = 200;
                }
                turnContinues = false;
            } else if (sunkIds.length > 0) {
                // Check if 8 ball sunk
                if (sunkIds.includes(8)) {
                    // Win Condition (Simplified)
                    newState.winner = player;
                    newState.status = "FINISHED";
                    return newState;
                }
                // If valid ball sunk, turn continues
                // For MVP, assume any non-cue ball sunk is good
                const sunkCue = sunkIds.includes(0);
                if (!sunkCue) {
                    turnContinues = true;
                }
            }

            // Switch turn if needed
            if (!turnContinues && newState.status !== "FINISHED") {
                const currentIndex = playerIds.indexOf(newState.currentPlayer!);
                const nextIndex = (currentIndex + 1) % playerIds.length;
                newState.currentPlayer = playerIds[nextIndex];
            }
        }

        return newState;
    }
}
