import { RPSState, RPSMove, RPSChoice } from './RPSTypes';

export class RPSLogic {
    static createInitialState(): RPSState {
        return {
            players: {},
            winner: null,
            status: "WAITING",
            round: 1,
            roundWinner: null,
            history: []
        };
    }

    static applyMove(state: RPSState, move: RPSMove): RPSState {
        const newState = { ...state };
        const { playerId, choice } = move;

        // Initialize player if not exists (should handle in join, but safety)
        if (!newState.players[playerId]) {
            newState.players[playerId] = { choice: null, score: 0 };
        }

        // Apply choice
        newState.players[playerId].choice = choice;

        // Check if both players have chosen
        const playerIds = Object.keys(newState.players);

        console.log(`[RPS] Move Applied. Player: ${playerId}, Choice: ${choice}`);
        console.log(`[RPS] Total Players in State: ${playerIds.length}`, playerIds);
        console.log(`[RPS] Player Choices:`, playerIds.map(p => `${p}: ${newState.players[p].choice}`));

        if (playerIds.length === 2) {
            const p1 = playerIds[0];
            const p2 = playerIds[1];
            const c1 = newState.players[p1].choice;
            const c2 = newState.players[p2].choice;

            if (c1 && c2 && newState.status === "WAITING") {
                // Determine winner
                const roundWinnerId = this.determineWinner(p1, c1, p2, c2);
                newState.roundWinner = roundWinnerId;

                // Update score
                if (roundWinnerId !== "TIE") {
                    newState.players[roundWinnerId].score += 1;
                }

                // Check for Match Winner (First to 2)
                const p1Score = newState.players[p1].score;
                const p2Score = newState.players[p2].score;

                if (p1Score >= 2) {
                    newState.winner = p1;
                    newState.status = "FINISHED";
                } else if (p2Score >= 2) {
                    newState.winner = p2;
                    newState.status = "FINISHED";
                } else {
                    // Match continues
                    newState.status = "ROUND_OVER";
                }

                // Add to history
                newState.history.push({
                    winner: roundWinnerId,
                    p1Choice: c1,
                    p2Choice: c2
                });
            }
        }

        return newState;
    }

    static resetRound(state: RPSState): RPSState {
        const newState = { ...state };
        const playerIds = Object.keys(newState.players);
        const wasFinished = state.status === "FINISHED";

        // Reset choices and status
        playerIds.forEach(pid => {
            newState.players[pid].choice = null;
            if (wasFinished) {
                newState.players[pid].score = 0;
            }
        });

        newState.winner = null;
        newState.roundWinner = null;
        newState.status = "WAITING";

        if (wasFinished) {
            newState.round = 1;
            newState.history = [];
        } else {
            newState.round += 1;
        }

        return newState;
    }

    private static determineWinner(p1: string, c1: RPSChoice, p2: string, c2: RPSChoice): string | "TIE" {
        if (c1 === c2) return "TIE";
        if (
            (c1 === "ROCK" && c2 === "SCISSORS") ||
            (c1 === "SCISSORS" && c2 === "PAPER") ||
            (c1 === "PAPER" && c2 === "ROCK")
        ) {
            return p1;
        }
        return p2;
    }
}
