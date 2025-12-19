import { Card, Suit, TrucoState, TrucoOptions, TrucoMove } from "./TrucoTypes";

export class TrucoLogic {

    // Jerarquía de cartas (mayor valor = gana)
    // 1 Espada > 1 Basto > 7 Espada > 7 Oro > 3s > 2s > 1s falsos > 12s > 11s > 10s > 7s falsos > 6s > 5s > 4s
    private static CARD_VALUES: Record<string, number> = {
        "1_ESPADA": 14,
        "1_BASTO": 13,
        "7_ESPADA": 12,
        "7_ORO": 11,
        "3_ESPADA": 10, "3_BASTO": 10, "3_ORO": 10, "3_COPA": 10,
        "2_ESPADA": 9, "2_BASTO": 9, "2_ORO": 9, "2_COPA": 9,
        "1_ORO": 8, "1_COPA": 8,
        "12_ESPADA": 7, "12_BASTO": 7, "12_ORO": 7, "12_COPA": 7,
        "11_ESPADA": 6, "11_BASTO": 6, "11_ORO": 6, "11_COPA": 6,
        "10_ESPADA": 5, "10_BASTO": 5, "10_ORO": 5, "10_COPA": 5,
        "7_BASTO": 4, "7_COPA": 4,
        "6_ESPADA": 3, "6_BASTO": 3, "6_ORO": 3, "6_COPA": 3,
        "5_ESPADA": 2, "5_BASTO": 2, "5_ORO": 2, "5_COPA": 2,
        "4_ESPADA": 1, "4_BASTO": 1, "4_ORO": 1, "4_COPA": 1,
    };

    static createInitialState(playerIds: string[], options: TrucoOptions): TrucoState {
        const deck = this.createDeck();
        const hands = this.dealCards(deck, playerIds.length);

        return {
            options,
            currentRound: 1,
            turn: playerIds[0], // Should rotate normally, simplified for now
            dealer: playerIds[playerIds.length - 1], // Simplified
            handWinner: null,
            players: playerIds.map((pid, idx) => ({
                playerId: pid,
                cards: hands[idx],
                playedCards: []
            })),
            scoreA: 0,
            scoreB: 0,
            currentTableCards: [],
            roundWinners: [],
            status: "ACTIVE",
            pointsToScore: 1, // Base value
            pendingChallenge: null,
            envidoPlayed: false,
            lastBetMaker: null
        };
    }

    static resetMatch(currentState: TrucoState): TrucoState {
        const playerIds = currentState.players.map(p => p.playerId);
        // Create fresh state with same players and options
        // Ideally we might want to rotate who starts dealing in the new match
        const newState = this.createInitialState(playerIds, currentState.options);

        // Optional: Swap dealer if you want to rotate start between matches
        // const first = playerIds[0];
        // ... (Not strictly necessary for MVP)

        return newState;
    }

    private static createDeck(): Card[] {
        const suits: Suit[] = ["ESPADA", "BASTO", "ORO", "COPA"];
        const numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
        const deck: Card[] = [];

        for (const s of suits) {
            for (const n of numbers) {
                const key = `${n}_${s}`;
                deck.push({
                    number: n,
                    suit: s,
                    value: this.CARD_VALUES[key] || 0
                });
            }
        }
        // Shuffle
        return deck.sort(() => Math.random() - 0.5);
    }

    private static dealCards(deck: Card[], numPlayers: number): Card[][] {
        const hands: Card[][] = [];
        for (let i = 0; i < numPlayers; i++) {
            hands.push(deck.splice(0, 3));
        }
        return hands;
    }

    static validateMove(state: TrucoState, move: TrucoMove, playerId: string): string | null {
        if (state.status === "FINISHED") return "Game is finished";
        if (state.status === "WAITING_FOR_NEXT_HAND") return "Hand finished, waiting for next round";
        if (state.turn !== playerId) return "Not your turn";

        if (move.action === "WIN_GAME_DEBUG" as any) return null;

        // Challenge response validation
        if (state.pendingChallenge) {
            // Only ACCEPT, REJECT, or RAISE (RETRUCO/REAL ENVIDO) allowed
            // And only by the challenged player (turn should have been switched)
            if (state.turn !== playerId) return "Not your turn to respond";

            const allowed = ["ACCEPT", "REJECT", "CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO", "CALL_RETRUCO", "CALL_VALE4",
                "CALL_CONTRAFLOR", "CALL_CONTRAFLOR_AL_RESTO"];

            // Allow Envido-Envido
            if (state.pendingChallenge.type === "ENVIDO") allowed.push("CALL_ENVIDO");
            if (state.pendingChallenge.type === "ENVIDO_ENVIDO") allowed.push("CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");

            // Allow Envido over Truco
            if (state.pendingChallenge.type === "TRUCO") {
                if (!state.envidoPlayed && state.currentRound === 1) {
                    allowed.push("CALL_ENVIDO", "CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");
                }
            }

            if (!allowed.includes(move.action)) return "Must respond to challenge (ACCEPT/REJECT/RAISE)";
        } else {
            // Normal play
            if (move.action === "PLAY_CARD") {
                if (!move.card) return "No card provided";
                // Check if player has the card
                const player = state.players.find(p => p.playerId === playerId);
                if (!player) return "Player not found";

                const hasCard = player.cards.some(c => c.number === move.card!.number && c.suit === move.card!.suit);
                if (!hasCard) return "You do not have this card";
            }

            // Rule of 4 check for CALL_TRUCO
            if (move.action === "CALL_TRUCO") {
                if (state.pointsToScore > 1) return "Truco already called";
                // Decisive rounds: Round 3, or Round 2 if Round 1 was tied.
                const isDecisive = state.currentRound === 3 || (state.currentRound === 2 && state.roundWinners[0] === "TIE");
                if (isDecisive) {
                    const hasFour = state.currentTableCards.some(pc => pc.card.number === 4);
                    if (hasFour) return "Cannot call Truco (4 on table)";
                }
            }

            // Logic for raising bets (Retruco / Vale 4) when NOT responding to a challenge
            if (move.action === "CALL_RETRUCO") {
                if (state.pointsToScore !== 2) return "Can only call Retruco if Truco is active";
                if (state.lastBetMaker === playerId) return "Cannot raise your own bet";
            }

            if (move.action === "CALL_VALE4") {
                if (state.pointsToScore !== 3) return "Can only call Vale 4 if Retruco is active";
                if (state.lastBetMaker === playerId) return "Cannot raise your own bet";
            }

            // Envido Check
            if (move.action === "CALL_ENVIDO" || move.action === "CALL_REAL_ENVIDO" || move.action === "CALL_FALTA_ENVIDO") {
                if (state.currentRound > 1) return "Cannot call Envido after 1st round";
                if (state.envidoPlayed) return "Envido already played";
            }

            // Flor Check
            if (move.action === "CALL_FLOR") {
                if (!state.options.withFlor) return "Flor is disabled for this game";
                if (state.currentRound > 1) return "Cannot call Flor after 1st round";
                if (state.envidoPlayed) return "Flor/Envido already played";

                // Verify player has Flor
                const player = state.players.find(p => p.playerId === playerId)!; // Checked above
                // Need to reconstruct helper access
                // Since this is static, we can call private static helper if we move it or use logic here.
                // We'll move hasFlor logic to helper.
                if (!TrucoLogic.hasFlor(player.cards)) return "You do not have Flor (3 cards of same suit)";
            }
        }

        return null;
    }

    static applyMove(state: TrucoState, move: TrucoMove, playerId: string): TrucoState {
        const newState = JSON.parse(JSON.stringify(state)) as TrucoState; // Deep copy

        if (move.action === "PLAY_CARD" && move.card) {
            // Remove card from hand
            const player = newState.players.find(p => p.playerId === playerId)!;
            player.cards = player.cards.filter(c => !(c.number === move.card!.number && c.suit === move.card!.suit));
            player.playedCards.push(move.card);

            // Add to table
            newState.currentTableCards.push({ playerId, card: move.card });

            // Check if all players played this round
            if (newState.currentTableCards.length === newState.players.length) {
                this.resolveRound(newState);
            } else {
                // Next turn
                this.nextTurn(newState);
            }
        }

        // --- BETTING LOGIC ---
        else if (move.action === "CALL_ENVIDO") {
            // Check for suspension (Envido over Truco)
            if (newState.pendingChallenge && newState.pendingChallenge.type === "TRUCO") {
                newState.suspendedChallenge = {
                    type: "TRUCO",
                    challengerId: newState.pendingChallenge.challengerId,
                    pointsPending: newState.pendingChallenge.pointsPending
                };
                newState.pendingChallenge = null;
            }

            if (newState.pendingChallenge && newState.pendingChallenge.type === "ENVIDO") {
                // Envido -> Envido
                newState.pendingChallenge = {
                    type: "ENVIDO_ENVIDO",
                    challengerId: playerId,
                    pointsPending: 2, // If rejected, previous Envido (2) is paid? No, standard is 2 for rejection of 2nd Envido. 1st Envido accepted = 2.
                    pointsOnAccept: 4 // 2 + 2
                };
            } else {
                newState.pendingChallenge = {
                    type: "ENVIDO",
                    challengerId: playerId,
                    pointsPending: 1, // If rejected, 1 point.
                    pointsOnAccept: 2 // If accepted, 2 points.
                };
            }
            this.nextTurn(newState); // Opponent must respond
        }
        else if (move.action === "CALL_REAL_ENVIDO") {
            // Calculate points
            let rejectPoints = 1;
            let acceptPoints = 3; // Base Real Envido

            if (newState.pendingChallenge) {
                if (newState.pendingChallenge.type === "ENVIDO") {
                    rejectPoints = 2; // Previous Envido accepted
                    acceptPoints = 5; // 2 + 3
                }
                if (newState.pendingChallenge.type === "ENVIDO_ENVIDO") {
                    rejectPoints = 4; // Previous Envido-Envido accepted
                    acceptPoints = 7; // Envido(2) + Envido(2) + Real(3) -> 7 points.
                }
            }

            newState.pendingChallenge = {
                type: "REAL_ENVIDO",
                challengerId: playerId,
                pointsPending: rejectPoints,
                pointsOnAccept: acceptPoints
            };
            this.nextTurn(newState);
        }
        else if (move.action === "CALL_FALTA_ENVIDO") {
            let rejectPoints = 1;

            // Check suspension (Falta Envido over Truco)
            if (newState.pendingChallenge && newState.pendingChallenge.type === "TRUCO") {
                newState.suspendedChallenge = {
                    type: "TRUCO",
                    challengerId: newState.pendingChallenge.challengerId,
                    pointsPending: newState.pendingChallenge.pointsPending
                };
                newState.pendingChallenge = null;
            }

            if (newState.pendingChallenge) {
                if (newState.pendingChallenge.type === "ENVIDO") rejectPoints = 2;
                if (newState.pendingChallenge.type === "ENVIDO_ENVIDO") rejectPoints = 4;
                if (newState.pendingChallenge.type === "REAL_ENVIDO") {
                    // Check history or use stored pointsOnAccept.
                    // If previous challenge was Real Envido, and it was E-E-RE (5 pts), then rejecting Falta pays 5.
                    // If it was E-RE (5 pts), rejecting pays 5.
                    // If it was just RE (3 pts), rejecting pays 3.
                    // We rely on pointsOnAccept being correctly populated in CALL_REAL_ENVIDO.
                    rejectPoints = newState.pendingChallenge.pointsOnAccept || 3;
                }
            }

            newState.pendingChallenge = {
                type: "FALTA_ENVIDO",
                challengerId: playerId,
                pointsPending: rejectPoints
                // onAccept calculated at resolution (points to win)
            };
            this.nextTurn(newState);
        }
        else if (move.action === "CALL_FLOR") {
            // 1. Calculate points
            const myPoints = this.calculateFlorPoints(newState.players.find(p => p.playerId === playerId)!.cards);

            // 2. Check if opponent has Flor
            const opponentId = newState.players.find(p => p.playerId !== playerId)!.playerId;
            const opponentHand = newState.players.find(p => p.playerId === opponentId)!.cards;
            const opponentHasFlor = this.hasFlor(opponentHand);

            if (!opponentHasFlor) {
                // Win 3 points immediately
                if (playerId === newState.players[0].playerId) newState.scoreA += 3;
                else newState.scoreB += 3;

                newState.envidoPlayed = true;
                // Check Game Over
                if (newState.scoreA >= newState.options.targetScore || newState.scoreB >= newState.options.targetScore) {
                    newState.status = "FINISHED";
                    newState.winnerId = newState.scoreA >= newState.options.targetScore ? newState.players[0].playerId : newState.players[1].playerId;
                    return newState;
                }
            } else {
                // Opponent has Flor too! Trigger Challenge.
                newState.pendingChallenge = {
                    type: "FLOR",
                    challengerId: playerId,
                    pointsPending: 4 // If "No Quiero" to Flor when you have it? Rare. 
                    // Standard: If you have Flor and opponent Calls Flor, you MUST "Quiero" or "Contraflor".
                    // If we allow "No Quiero" (Achico), points usually 3 for opponent.
                    // But "Quiero" means we compare for 6 points (3 mine + 3 yours).
                };
                this.nextTurn(newState); // Opponent must respond
            }
        }
        else if (move.action === "CALL_CONTRAFLOR") {
            // Response to Flor
            newState.pendingChallenge = {
                type: "CONTRAFLOR",
                challengerId: playerId,
                pointsPending: 6 // If rejected, opponent wins 6? Or 4? 
                // Standard: Flor(3) -> ContraFlor(6). If reject, usually previous bet (3) stands? 
                // Or "No Quiero" to Contraflor = 4 points for challenger.
                // Let's go with: Rejecting Contraflor = 4 points.
            };
            this.nextTurn(newState);
        }
        else if (move.action === "CALL_CONTRAFLOR_AL_RESTO") {
            // Response to Flor or Contraflor
            // If Rejected: The challenger wins the previous bet (Contraflor = 6).
            // If Accepted: The winner wins "Points lacking for Leader to win match".

            newState.pendingChallenge = {
                type: "CONTRAFLOR_AL_RESTO",
                challengerId: playerId,
                pointsPending: 6 // Rejection Value (assuming coming from Contraflor)
            };

            this.nextTurn(newState);
        }
        else if (move.action === "CALL_TRUCO") {
            newState.pendingChallenge = {
                type: "TRUCO",
                challengerId: playerId,
                pointsPending: newState.pointsToScore // If rejected, win current stake (usually 1)
            };
            this.nextTurn(newState);
        }
        else if (move.action === "CALL_RETRUCO") {
            // Can only be called as response to TRUCO
            newState.pendingChallenge = {
                type: "RETRUCO",
                challengerId: playerId,
                pointsPending: 2 // If rejected, opponent wins 2 (Truco value)
            };
            // No nextTurn needed? The turn is ALREADY with the responder. 
            // But we need to switch it back to the original challenger (now responder to Retruco).
            this.nextTurn(newState);
        }
        else if (move.action === "CALL_VALE4") {
            newState.pendingChallenge = {
                type: "VALE_4",
                challengerId: playerId,
                pointsPending: 3 // If rejected, opponent wins 3 (Retruco value)
            };
            this.nextTurn(newState);
        }

        if (move.action === "ACCEPT") {
            if (newState.pendingChallenge) {
                const type = newState.pendingChallenge.type;
                if (type === "ENVIDO" || type === "ENVIDO_ENVIDO" || type === "REAL_ENVIDO" || type === "FALTA_ENVIDO") {
                    // Determine "Mano" for tie-breaking
                    const dealerIdx = newState.players.findIndex(p => p.playerId === newState.dealer);
                    const manoIdx = (dealerIdx + 1) % newState.players.length;
                    const manoPlayerId = newState.players[manoIdx].playerId;

                    // Calculate Envido values
                    const p1 = newState.players[0];
                    const p2 = newState.players[1];
                    const val1 = this.calculateEnvidoPoints(p1.cards);
                    const val2 = this.calculateEnvidoPoints(p2.cards);

                    let winnerId = manoPlayerId; // Default to Mano (Tie)
                    if (val1 > val2) winnerId = p1.playerId;
                    else if (val2 > val1) winnerId = p2.playerId;

                    // Calculate Points (Now that we know the winner)
                    let pointsAwarded = 0;

                    if (type === "FALTA_ENVIDO") {
                        // "Loser Lacks" Rule: Winner gets what the Loser lacks to reach target.
                        // (Target - LoserScore)
                        const loserScore = winnerId === p1.playerId ? newState.scoreB : newState.scoreA;
                        pointsAwarded = newState.options.targetScore - loserScore;
                    }
                    else if (newState.pendingChallenge.pointsOnAccept) {
                        pointsAwarded = newState.pendingChallenge.pointsOnAccept;
                    }
                    else {
                        // Fallbacks
                        if (type === "ENVIDO") pointsAwarded = 2;
                        if (type === "ENVIDO_ENVIDO") pointsAwarded = 4;
                        if (type === "REAL_ENVIDO") pointsAwarded = 3;
                    }

                    if (winnerId === p1.playerId) newState.scoreA += pointsAwarded;
                    else newState.scoreB += pointsAwarded;

                    // Store result
                    newState.lastEnvidoResult = {
                        winnerId,
                        loserId: winnerId === p1.playerId ? p2.playerId : p1.playerId,
                        winnerScore: winnerId === p1.playerId ? val1 : val2,
                        loserScore: winnerId === p1.playerId ? val2 : val1,
                        type: type as any
                    };

                    // Store result
                    newState.lastEnvidoResult = {
                        winnerId,
                        loserId: winnerId === p1.playerId ? p2.playerId : p1.playerId,
                        winnerScore: winnerId === p1.playerId ? val1 : val2,
                        loserScore: winnerId === p1.playerId ? val2 : val1,
                        type: type as any
                    };

                    // Check Game Over
                    if (newState.scoreA >= newState.options.targetScore || newState.scoreB >= newState.options.targetScore) {
                        newState.status = "FINISHED";
                        newState.winnerId = newState.scoreA >= newState.options.targetScore ? newState.players[0].playerId : newState.players[1].playerId;
                    }
                } else if (type === "FLOR" || type === "CONTRAFLOR" || type === "CONTRAFLOR_AL_RESTO") {
                    // Resolve Flor Duel
                    const p1 = newState.players[0];
                    const p2 = newState.players[1];
                    const pts1 = this.calculateFlorPoints(p1.cards);
                    const pts2 = this.calculateFlorPoints(p2.cards);

                    let winnerId = p1.playerId;
                    if (pts2 > pts1) winnerId = p2.playerId;

                    let pointsAwarded = 6; // Default for Flor vs Flor "Quiero"
                    if (type === "CONTRAFLOR") pointsAwarded = 6; // Contraflor accepted
                    if (type === "CONTRAFLOR_AL_RESTO") {
                        // Rule (User): Same as Falta Envido -> Points needed for the LOSER to reach target.
                        const loserScore = winnerId === p1.playerId ? newState.scoreB : newState.scoreA;
                        pointsAwarded = newState.options.targetScore - loserScore;
                    }
                    else if (type === "FLOR") pointsAwarded = 6; // Flor accepted

                    if (winnerId === newState.players[0].playerId) {
                        newState.scoreA += pointsAwarded;
                    }
                    else {
                        newState.scoreB += pointsAwarded;
                    }

                    // Populate Envido Result (Flor uses same structure)
                    newState.lastEnvidoResult = {
                        winnerId,
                        loserId: winnerId === p1.playerId ? p2.playerId : p1.playerId,
                        winnerScore: winnerId === p1.playerId ? pts1 : pts2,
                        loserScore: winnerId === p1.playerId ? pts2 : pts1,
                        type: type as any
                    };

                    // Check Game Over immediately
                    if (newState.scoreA >= newState.options.targetScore || newState.scoreB >= newState.options.targetScore) {
                        newState.status = "FINISHED";
                        newState.winnerId = newState.scoreA >= newState.options.targetScore ? newState.players[0].playerId : newState.players[1].playerId;
                        return newState;
                    }
                }
                else if (type === "TRUCO") {
                    newState.pointsToScore = 2;
                    newState.lastBetMaker = newState.pendingChallenge.challengerId;
                } else if (type === "RETRUCO") {
                    newState.pointsToScore = 3;
                    newState.lastBetMaker = newState.pendingChallenge.challengerId;
                } else if (type === "VALE_4") {
                    newState.pointsToScore = 4;
                    newState.lastBetMaker = newState.pendingChallenge.challengerId;
                }

                // Reset challenge
                newState.pendingChallenge = null;
                if (type === "ENVIDO" || type === "ENVIDO_ENVIDO" || type === "REAL_ENVIDO" || type === "FALTA_ENVIDO") newState.envidoPlayed = true;

                // Restore Suspended Challenge if any
                if (newState.suspendedChallenge) {
                    newState.pendingChallenge = {
                        type: newState.suspendedChallenge.type,
                        challengerId: newState.suspendedChallenge.challengerId,
                        pointsPending: newState.suspendedChallenge.pointsPending,
                        pointsOnAccept: newState.suspendedChallenge.pointsOnAccept
                    };
                    newState.suspendedChallenge = null;

                    // Set turn to the player who must respond (responder)
                    const challengerId = newState.pendingChallenge.challengerId;
                    const responder = newState.players.find(p => p.playerId !== challengerId);
                    if (responder) newState.turn = responder.playerId;
                } else {
                    // Standard flow: Return turn to the player who needs to play a card
                    this.restoreTurnToCardPlayer(newState);
                }
            }
        }
        else if (move.action === "REJECT") {
            if (newState.pendingChallenge) {
                const challenger = newState.pendingChallenge.challengerId;
                const points = newState.pendingChallenge.pointsPending;

                // Award points to challenger
                // Award points to challenger
                if (challenger === newState.players[0].playerId) newState.scoreA += points;
                else newState.scoreB += points;

                // Check Game Over (Match Win)
                if (newState.scoreA >= newState.options.targetScore || newState.scoreB >= newState.options.targetScore) {
                    newState.status = "FINISHED";
                    newState.winnerId = newState.scoreA >= newState.options.targetScore ? newState.players[0].playerId : newState.players[1].playerId;
                    return newState;
                }

                const type = newState.pendingChallenge.type;
                const isTrucoType = type === "TRUCO" || type === "RETRUCO" || type === "VALE_4";

                if (isTrucoType) {
                    // Truco rejected = Hand Ends
                    newState.status = "WAITING_FOR_NEXT_HAND";
                } else {
                    // Envido/Flor rejected = Continue Hand
                    newState.pendingChallenge = null;
                    newState.envidoPlayed = true;

                    // If suspended challenge (Truco) exists, check if we need to restore or annul.
                    if (newState.suspendedChallenge) {
                        newState.pendingChallenge = {
                            type: newState.suspendedChallenge.type,
                            challengerId: newState.suspendedChallenge.challengerId,
                            pointsPending: newState.suspendedChallenge.pointsPending,
                            pointsOnAccept: newState.suspendedChallenge.pointsOnAccept
                        };
                        newState.suspendedChallenge = null;

                        // Set turn to the player who must respond (responder)
                        const challengerId = newState.pendingChallenge.challengerId;
                        const responder = newState.players.find(p => p.playerId !== challengerId);
                        if (responder) newState.turn = responder.playerId;
                    } else {
                        // Standard flow: Return turn to player who needs to play.
                        this.restoreTurnToCardPlayer(newState);
                    }
                }
            }
        }


        else if (move.action === "FOLD") {
            const opponentId = newState.players.find(p => p.playerId !== playerId)!.playerId;

            // "Ir al Mazo" Logic:
            // 1. First round, no envido played, no pending challenge => 2 points (Envido + Truco)
            if (newState.currentRound === 1 && !newState.envidoPlayed && !newState.pendingChallenge) {
                if (opponentId === newState.players[0].playerId) newState.scoreA += 2;
                else newState.scoreB += 2;
            } else {
                // 2. Otherwise => Opponent wins current Truco points
                // If there's a pending challenge (e.g. Envido Pending), FOLD usually implies rejecting it + rejecting Hand?
                // But user phrasing "si me voy al mazo... seria un punto" implies context of simple play.
                // Let's stick to awarding `pointsToScore`.
                const pts = newState.pointsToScore;
                if (opponentId === newState.players[0].playerId) newState.scoreA += pts;
                else newState.scoreB += pts;
            }

            // Reveal Envido Winner Cards if Envido was played
            if (newState.lastEnvidoResult) {
                const envidoWinnerId = newState.lastEnvidoResult.winnerId;
                const winnerPlayer = newState.players.find(p => p.playerId === envidoWinnerId);
                if (winnerPlayer) {
                    const type = newState.lastEnvidoResult.type;
                    const isFlor = ["FLOR", "CONTRAFLOR", "CONTRAFLOR_AL_RESTO"].includes(type);

                    // Reconstruct all cards used for Envido (remaining + played) to determine which formed the score
                    const allCards = [...winnerPlayer.cards, ...winnerPlayer.playedCards];

                    let contributing: Card[];
                    if (isFlor) {
                        contributing = allCards; // Flor uses the whole hand (same suit)
                    } else {
                        contributing = this.getEnvidoContributingCards(allCards);
                    }

                    winnerPlayer.cards.forEach(card => {
                        // Only reveal if it contributed to the Envido score
                        const isContributor = contributing.some(c => c.number === card.number && c.suit === card.suit);

                        if (isContributor) {
                            // Avoid duplicates if already played (shouldn't happen as we iterate unplayed)
                            const alreadyPlayed = winnerPlayer.playedCards.some(pc => pc.number === card.number && pc.suit === card.suit);
                            if (!alreadyPlayed) {
                                winnerPlayer.playedCards.push(card);
                                newState.currentTableCards.push({ playerId: envidoWinnerId, card });
                            }
                        }
                    });
                    // Clear hand. Non-contributing cards vanish.
                    winnerPlayer.cards = [];
                }
            }

            // Check Match Winner
            if (newState.scoreA >= newState.options.targetScore || newState.scoreB >= newState.options.targetScore) {
                newState.status = "FINISHED";
                newState.winnerId = newState.scoreA >= newState.options.targetScore ? newState.players[0].playerId : newState.players[1].playerId;
            } else {
                newState.status = "WAITING_FOR_NEXT_HAND";
            }
        }


        else if (move.action === "WIN_GAME_DEBUG" as any) {
            newState.status = "FINISHED";
            newState.winnerId = playerId;
        }

        return newState;
    }

    private static getEnvidoContributingCards(cards: Card[]): Card[] {
        // Same logic as calculateEnvidoPoints but returns the specific cards
        const bySuit: Record<string, Card[]> = {};
        let maxSingleVal = -1;
        let bestSingleCard: Card | null = null;

        for (const c of cards) {
            const suit = c.suit;
            const val = c.number >= 10 ? 0 : c.number;

            if (!bySuit[suit]) bySuit[suit] = [];
            bySuit[suit].push(c);

            if (val > maxSingleVal) {
                maxSingleVal = val;
                bestSingleCard = c;
            } else if (val === maxSingleVal && bestSingleCard && c.number > bestSingleCard.number) {
                // Tie-breaker for single card: value same? (e.g. 10 and 11 are both 0).
                // Rules: If values tie (0), higher number wins? No, higher JERARQUIA?
                // Standard: Value 0 (kings) are equal. Any is fine.
                // But 7 is better than 6. 
                // Logic: val is Envido Value. 7 > 6.
                // If 12 (0) vs 11 (0): They are equal.
                bestSingleCard = c;
            }
        }

        let maxScore = maxSingleVal;
        let bestCards: Card[] = bestSingleCard ? [bestSingleCard] : [];
        if (bestCards.length === 0 && cards.length > 0) bestCards = [cards[0]]; // Fallback

        // Check pairs
        for (const suit in bySuit) {
            const suitCards = bySuit[suit];
            if (suitCards.length >= 2) {
                // Sort by Envido Value Desc
                suitCards.sort((a, b) => {
                    const valA = a.number >= 10 ? 0 : a.number;
                    const valB = b.number >= 10 ? 0 : b.number;
                    return valB - valA;
                });

                const c1 = suitCards[0];
                const c2 = suitCards[1];
                const v1 = c1.number >= 10 ? 0 : c1.number;
                const v2 = c2.number >= 10 ? 0 : c2.number;

                const score = 20 + v1 + v2;
                if (score > maxScore) {
                    maxScore = score;
                    bestCards = [c1, c2];
                }
            }
        }
        return bestCards;
    }

    private static restoreTurnToCardPlayer(state: TrucoState) {
        // Identifies whose turn it is to play a card
        if (state.currentTableCards.length > 0) {
            // Assumes 2 players: if one played, the other turn
            const playedId = state.currentTableCards[0].playerId;
            const otherPlayer = state.players.find(p => p.playerId !== playedId);
            if (otherPlayer) state.turn = otherPlayer.playerId;
        } else {
            // Start of round
            if (state.currentRound === 1) {
                const dealerIdx = state.players.findIndex(p => p.playerId === state.dealer);
                const starterIdx = (dealerIdx + 1) % state.players.length;
                state.turn = state.players[starterIdx].playerId;
            } else {
                // Winner of previous round starts
                // Note: roundWinners is 0-indexed. Round 2 implies roundWinners[0] exists.
                const prevRoundIdx = state.currentRound - 2;
                // If currentRound is 1 (handled above). 
                // If currentRound 2 -> index 0.

                // Guard against index out of bounds just in case
                if (prevRoundIdx >= 0 && prevRoundIdx < state.roundWinners.length) {
                    const prevWinner = state.roundWinners[prevRoundIdx];
                    if (prevWinner !== "TIE") {
                        state.turn = prevWinner;
                    } else {
                        // Tie logic: Mano starts
                        const dealerIdx = state.players.findIndex(p => p.playerId === state.dealer);
                        const starterIdx = (dealerIdx + 1) % state.players.length;
                        state.turn = state.players[starterIdx].playerId;
                    }
                } else {
                    // Fallback
                    const dealerIdx = state.players.findIndex(p => p.playerId === state.dealer);
                    const starterIdx = (dealerIdx + 1) % state.players.length;
                    state.turn = state.players[starterIdx].playerId;
                }
            }
        }
    }

    private static nextTurn(state: TrucoState) {
        const currentIdx = state.players.findIndex(p => p.playerId === state.turn);
        const nextIdx = (currentIdx + 1) % state.players.length;
        state.turn = state.players[nextIdx].playerId;
    }

    private static resolveRound(state: TrucoState) {
        // Determine winner of the round (Highest Value or Tie)
        let highestVal = -1;
        let winnerId: string | "TIE" = "TIE";

        for (const play of state.currentTableCards) {
            if (play.card.value > highestVal) {
                highestVal = play.card.value;
                winnerId = play.playerId;
            } else if (play.card.value === highestVal) {
                winnerId = "TIE";
            }
        }

        state.roundWinners.push(winnerId);
        state.currentTableCards = []; // Clear table

        const winners = state.roundWinners;
        const p1 = state.players[0].playerId;
        const p2 = state.players[1].playerId;

        // Determine "Hand" (Mano) for tie-breaking
        const dealerIdx = state.players.findIndex(p => p.playerId === state.dealer);
        const handIdx = (dealerIdx + 1) % state.players.length;
        const handPlayerId = state.players[handIdx].playerId;

        // Check for Winner
        let gameWinner: string | null = null;

        // 1. Win by 2 rounds
        const winsP1 = winners.filter(w => w === p1).length;
        const winsP2 = winners.filter(w => w === p2).length;

        if (winsP1 >= 2) gameWinner = p1;
        else if (winsP2 >= 2) gameWinner = p2;

        // 2. Tie Logic (Parda)
        else if (winners.length === 2) {
            // [A, Tie] -> A wins
            if (winners[0] !== "TIE" && winners[1] === "TIE") gameWinner = winners[0];
            // [Tie, A] -> A wins
            else if (winners[0] === "TIE" && winners[1] !== "TIE") gameWinner = winners[1];
            // [Tie, Tie] -> Continue to 3rd
        }
        else if (winners.length === 3) {
            // [A, B, Tie] -> First Winner (A) wins
            if (winners[2] === "TIE") {
                if (winners[0] !== "TIE") gameWinner = winners[0];
                // [Tie, Tie, Tie] -> Hand wins
                else gameWinner = handPlayerId;
            }
            // [Tie, Tie, A] -> A wins
            else if (winners[0] === "TIE" && winners[1] === "TIE") {
                gameWinner = winners[2];
            }
        }

        if (gameWinner) {
            this.finishHand(state, gameWinner);
            return;
        }

        // Prepare next turn
        if (winnerId !== "TIE") {
            state.turn = winnerId;
        } else {
            // If tied, the player who started the round usually starts the next one.
            // In 2 player, that implies standard rotation from last player.
            this.nextTurn(state);
        }

        state.currentRound++;
    }

    private static finishHand(state: TrucoState, winnerId: string) {
        // Give points based on pointsToScore
        const points = state.pointsToScore;

        if (winnerId === state.players[0].playerId) {
            state.scoreA += points;
        } else {
            state.scoreB += points;
        }

        // Check Game Over
        if (state.scoreA >= state.options.targetScore || state.scoreB >= state.options.targetScore) {
            state.status = "FINISHED";
            state.winnerId = state.scoreA >= state.options.targetScore ? state.players[0].playerId : state.players[1].playerId;
        } else {
            // Instead of redealing immediately, we set Waiting Status
            state.status = "WAITING_FOR_NEXT_HAND";
        }
    }

    static startNextHand(state: TrucoState) {
        state.status = "ACTIVE";
        // Rotate dealer
        const currentDealerIdx = state.players.findIndex(p => p.playerId === state.dealer);
        const nextDealerIdx = (currentDealerIdx + 1) % state.players.length;
        state.dealer = state.players[nextDealerIdx].playerId;

        const deck = this.createDeck();
        const hands = this.dealCards(deck, state.players.length);

        state.players.forEach((p, i) => {
            p.cards = hands[i];
            p.playedCards = [];
        });

        state.roundWinners = [];
        state.currentRound = 1;
        state.currentTableCards = [];
        state.pointsToScore = 1; // Reset points
        state.pendingChallenge = null;
        state.envidoPlayed = false;
        state.lastEnvidoResult = undefined; // Clear Envido result
        state.lastBetMaker = null;

        // Player after dealer starts
        const nextStartIdx = (nextDealerIdx + 1) % state.players.length;
        state.turn = state.players[nextStartIdx].playerId;
    }
    private static calculateEnvidoPoints(cards: Card[]): number {
        // Group by suit
        const bySuit: Record<string, number[]> = {};
        let maxSingle = 0;

        for (const c of cards) {
            const suit = c.suit;
            // Envido value: 10, 11, 12 are worth 0 for adding (but count for 20 bonus).
            const val = c.number >= 10 ? 0 : c.number;

            if (!bySuit[suit]) bySuit[suit] = [];
            bySuit[suit].push(val);

            if (val > maxSingle) maxSingle = val;
        }

        let maxScore = maxSingle; // If no two cards of same suit

        // Check pairs
        for (const suit in bySuit) {
            const vals = bySuit[suit];
            if (vals.length >= 2) {
                // Sum two highest
                vals.sort((a, b) => b - a);
                const score = 20 + vals[0] + vals[1];
                if (score > maxScore) maxScore = score;
            }
        }

        return maxScore;
    }


    private static hasFlor(cards: Card[]): boolean {
        if (cards.length < 3) return false;
        return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
    }

    private static calculateFlorPoints(cards: Card[]): number {
        // Assume hasFlor is checked.
        // Sum values + 20.
        // 10,11,12 are 0.
        const sum = cards.reduce((acc, c) => acc + (c.number >= 10 ? 0 : c.number), 0);
        return sum + 20;
    }
}
