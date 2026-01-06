
import React, { useState, useEffect, useRef } from 'react';
import { TrucoCard } from './TrucoCard'; // Renamed import
import type { Suit } from './TrucoCard'; // Import Suit type from TrucoCard
import { Hand } from './Hand';
import { Controls } from './Controls';
import { MatchEndModal } from './MatchEndModal';
import { Socket } from 'socket.io-client';
import { TurnTimer } from './TurnTimer';
import { ChatBox } from './ChatBox';

interface GameTableProps {
    gameState: any;
    playerId: string;
    gameId: string;
    socket: Socket;
}

export const GameTable: React.FC<GameTableProps> = ({ gameState, playerId, gameId, socket }) => {
    // Derive data from state
    const myPlayer = gameState.players.find((p: any) => p.playerId === playerId);
    const opponent = gameState.players.find((p: any) => p.playerId !== playerId);

    console.log("[GameTable DEBUG] GameState:", gameState);
    console.log("[GameTable DEBUG] MyPlayer ID:", playerId);
    console.log("[GameTable DEBUG] MyPlayer Obj:", myPlayer);
    console.log("[GameTable DEBUG] Opponent Obj:", opponent);

    // Determine Index (0 or 1) for score
    const myIndex = gameState.players.findIndex((p: any) => p.playerId === playerId);
    const myScore = myIndex === 0 ? gameState.scoreA : gameState.scoreB;
    const oppScore = myIndex === 0 ? gameState.scoreB : gameState.scoreA;

    const isMyTurn = gameState.turn === playerId;

    // Add local state for banner visibility
    const [showEnvidoResult, setShowEnvidoResult] = useState(false);
    const lastEnvidoRef = useRef<string | null>(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const isProcessingRef = useRef(false); // Use Ref for synchronous locking

    // Initial setup effects
    useEffect(() => {
        const onGameState = () => { isProcessingRef.current = false; };
        const onMoveError = (err: any) => {
            console.error("Move Error:", err);
            isProcessingRef.current = false;
        };

        socket.on("game_state", onGameState);
        socket.on("move_error", onMoveError);

        return () => {
            socket.off("game_state", onGameState);
            socket.off("move_error", onMoveError);
        };
    }, [socket]);

    useEffect(() => {
        if (gameState.lastEnvidoResult) {
            const currentEnvidoSignature = JSON.stringify(gameState.lastEnvidoResult);
            // Only show if it's a NEW result we haven't shown yet
            if (currentEnvidoSignature !== lastEnvidoRef.current) {
                lastEnvidoRef.current = currentEnvidoSignature;
                setShowEnvidoResult(true);
                const timer = setTimeout(() => setShowEnvidoResult(false), 5000);
                return () => clearTimeout(timer);
            }
        } else {
            // Reset ref if cleared? Or keep it? 
            // If result is cleared in backend, we should clear ref so we can show it again if same thing happens (rare but possible in new hand)
            lastEnvidoRef.current = null;
            setShowEnvidoResult(false);
        }
    }, [gameState.lastEnvidoResult]);

    // Force Cleanup on Unmount (or Game Leave)
    useEffect(() => {
        return () => {
            console.log("GameTable Unmounting - Cleaning up");
            // Optionally force socket leave here too, just in case
        };
    }, []);

    // Helper for Flor check
    const hasFlor = (cards: any[]) => {
        if (!cards || cards.length < 3) return false;
        return cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
    };

    const getActions = () => {
        if (!isMyTurn) return { available: [], disabled: [] };
        const available: string[] = [];
        const disabled: string[] = [];

        if (gameState.pendingChallenge) {
            available.push("ACCEPT", "REJECT");
            const type = gameState.pendingChallenge.type;

            // Counter-bet logic
            if (type === "TRUCO") {
                available.push("CALL_RETRUCO");
                // Allow "Envido over Truco"
                if (!gameState.envidoPlayed && gameState.currentRound === 1) {
                    available.push("CALL_ENVIDO", "CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");
                }
            }
            if (type === "RETRUCO") available.push("CALL_VALE4");

            if (type === "ENVIDO") available.push("CALL_ENVIDO", "CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");
            if (type === "ENVIDO_ENVIDO") available.push("CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");
            if (type === "REAL_ENVIDO") available.push("CALL_FALTA_ENVIDO");

            // Allow FLOR to override Envido
            if (gameState.options.withFlor && ["ENVIDO", "ENVIDO_ENVIDO", "REAL_ENVIDO", "FALTA_ENVIDO"].includes(type)) {
                if (hasFlor(myPlayer?.cards || [])) available.push("CALL_FLOR");
            }
        } else {
            // Normal play actions
            if (!gameState.envidoPlayed && gameState.currentRound === 1) {
                available.push("CALL_ENVIDO", "CALL_REAL_ENVIDO", "CALL_FALTA_ENVIDO");
            }
            if (gameState.options.withFlor && !gameState.envidoPlayed && gameState.currentRound === 1) {
                if (hasFlor(myPlayer?.cards || [])) available.push("CALL_FLOR");
                else disabled.push("CALL_FLOR");
            }

            // Rule of 4: If deciding round (3rd) and a 4 is on table, Truco is blocked?
            // User said "si un jugador tira un 4... el jugador no puede cantar truco" (in decisive round).
            // "el contrincante... ya no puede cantar truco".
            // Rule of 4: If deciding round (3rd) and a 4 is on table, Truco is blocked
            const hasFourOnTable = gameState.currentTableCards.some((c: any) => c.card.number === 4);
            const isDecisiveRound = gameState.currentRound === 3 || (gameState.currentRound === 2 && gameState.roundWinners[0] === "TIE");
            const truccoBlockedBy4 = isDecisiveRound && hasFourOnTable;

            if (gameState.pointsToScore === 1) {
                if (!truccoBlockedBy4) available.push("CALL_TRUCO");
                else disabled.push("CALL_TRUCO");
            }
            else if (gameState.pointsToScore === 2) {
                // Can only call Retruco if I didn't make the last bet
                if (gameState.lastBetMaker !== playerId) available.push("CALL_RETRUCO");
                else disabled.push("CALL_RETRUCO"); // Show as disabled
            }
            else if (gameState.pointsToScore === 3) {
                // Can only call Vale 4 if I didn't make the last bet
                if (gameState.lastBetMaker !== playerId) available.push("CALL_VALE4");
                else disabled.push("CALL_VALE4");
            }

            available.push("GO_TO_DECK");
        }
        return { available: Array.from(new Set(available)), disabled: Array.from(new Set(disabled)) };
    };

    const handlePlayCard = (card: { number: number; suit: Suit }) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        socket.emit('play_move', {
            gameId,
            move: { action: 'PLAY_CARD', card }
        });
    }

    const handleAction = (action: string) => {
        if (isProcessingRef.current) return;

        // Map frontend actions to backend logic
        let finalAction = action;
        if (action === "GO_TO_DECK") finalAction = "FOLD";

        isProcessingRef.current = true;
        socket.emit('play_move', {
            gameId,
            move: { action: finalAction }
        });
    }

    return (
        <div className="relative min-h-screen bg-green-900 overflow-hidden flex flex-col items-center">
            {/* Table Texture */}
            <div className="absolute inset-0 pattern-grid-lg opacity-20 pointer-events-none"></div>

            {/* HEADER: ID & Exit */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
                <button
                    onClick={() => setShowExitConfirm(true)}
                    className="pointer-events-auto bg-red-900/80 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-full border border-red-500/50 shadow-lg backdrop-blur"
                >
                    ABANDONAR 🏃
                </button>
                <div className="bg-black/40 backdrop-blur px-3 py-1 rounded text-xs text-slate-500 font-mono pointer-events-auto">
                    ID: {gameId}
                </div>
            </div>

            {/* ScoreBoard */}
            <div className="absolute top-12 left-4 bg-black/40 backdrop-blur p-4 rounded-xl text-white shadow-lg border border-white/10 z-50">
                <div className="text-xs font-bold text-slate-400 mb-2">PUNTAJE</div>
                <div className="flex space-x-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{myScore}</div>
                        <div className="text-xs uppercase max-w-[80px] truncate">{myPlayer?.username || "VOS"}</div>
                    </div>
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{oppScore}</div>
                        <div className="text-xs uppercase max-w-[80px] truncate">{opponent?.username || "RIVAL"}</div>
                    </div>
                </div>
            </div>

            {/* Envido/Flor Result Notification */}
            {showEnvidoResult && gameState.lastEnvidoResult && (
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 z-40 animate-bounce">
                    <div className={`px-6 py-4 rounded-xl flex items-center space-x-6 border shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md ${gameState.lastEnvidoResult.winnerId === playerId
                        ? "bg-green-600/80 border-green-400 text-white"
                        : "bg-red-600/80 border-red-400 text-white"
                        }`}>

                        {/* Status Text (GANASTE / PERDISTE) */}
                        <div className="flex flex-col items-center border-r border-white/20 pr-4">
                            <div className="text-xl font-bold tracking-wider">
                                {gameState.lastEnvidoResult.winnerId === playerId ? "¡GANASTE!" : "PERDISTE"}
                            </div>
                            <div className="text-[10px] uppercase text-yellow-300 font-bold mt-1">
                                {gameState.lastEnvidoResult.type.replace("CALL_", "").replace(/_/g, " ")}
                            </div>
                        </div>

                        {/* Scores Comparison */}
                        <div className="flex items-center space-x-4">
                            <div className="text-center">
                                <div className="text-xs uppercase opacity-70 mb-1">VOS</div>
                                <div className="text-3xl font-bold drop-shadow-md">
                                    {gameState.lastEnvidoResult.winnerId === playerId ? gameState.lastEnvidoResult.winnerScore : gameState.lastEnvidoResult.loserScore}
                                </div>
                            </div>
                            <div className="text-xl font-black opacity-50">vs</div>
                            <div className="text-center">
                                <div className="text-xs uppercase opacity-70 mb-1">RIVAL</div>
                                <div className="text-3xl font-bold drop-shadow-md">
                                    {gameState.lastEnvidoResult.winnerId === playerId ? gameState.lastEnvidoResult.loserScore : gameState.lastEnvidoResult.winnerScore}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Turn Indicator */}
            {isMyTurn && gameState.status === "ACTIVE" && (
                <div className="absolute top-24 transform -translate-x-1/2 left-1/2 flex flex-col items-center gap-2 z-50">
                    <div className="bg-yellow-500/90 text-black px-4 py-1 rounded-full text-sm font-bold shadow-glow animate-pulse">
                        TU TURNO
                    </div>
                </div>
            )}

            {/* GLOBAL TURN TIMER (Always visible for active player) */}
            {gameState.status === "ACTIVE" && gameState.turnDeadline && (
                <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-40">
                    <TurnTimer
                        deadline={gameState.turnDeadline}
                        active={true}
                        className={isMyTurn ? "bg-yellow-500/20 border-yellow-500/50" : "bg-black/40"}
                    />
                </div>
            )}

            {/* Hand Finished Indicator */}
            {gameState.status === "WAITING_FOR_NEXT_HAND" && (
                <div className="absolute top-24 transform -translate-x-1/2 left-1/2 bg-blue-500/90 text-white px-4 py-1 rounded-full text-sm font-bold shadow-glow z-50">
                    MANO TERMINADA
                </div>
            )}

            {/* Opponent Area (Top) */}
            <div className="w-full flex justify-center pt-8 pb-4">
                <div className="flex space-x-2">
                    {opponent && opponent.cards.map((card: any, i: number) => {
                        let reveal = false;
                        let highlight = false;

                        if (gameState.status === "WAITING_FOR_NEXT_HAND" && gameState.lastEnvidoResult) {
                            if (gameState.lastEnvidoResult.winnerId === opponent.playerId) {
                                const type = gameState.lastEnvidoResult.type;
                                const all = [...opponent.cards, ...(opponent.playedCards || [])];
                                const suitGroups: any = {};
                                all.forEach(c => { if (!suitGroups[c.suit]) suitGroups[c.suit] = []; suitGroups[c.suit].push(c); });

                                let targetCards: any[] = [];
                                if (type.includes("FLOR")) {
                                    for (const s in suitGroups) if (suitGroups[s].length >= 3) targetCards = suitGroups[s];
                                } else {
                                    let bestScore = -1;
                                    // Pair check
                                    for (const s in suitGroups) {
                                        if (suitGroups[s].length >= 2) {
                                            const pair = suitGroups[s].sort((a: any, b: any) => (b.number >= 10 ? 0 : b.number) - (a.number >= 10 ? 0 : a.number)).slice(0, 2);
                                            const sc = 20 + (pair[0].number >= 10 ? 0 : pair[0].number) + (pair[1].number >= 10 ? 0 : pair[1].number);
                                            if (sc > bestScore) { bestScore = sc; targetCards = pair; }
                                        }
                                    }
                                    // Single check
                                    if (targetCards.length === 0) {
                                        let max = -1;
                                        all.forEach(c => { const v = c.number >= 10 ? 0 : c.number; if (v > max) { max = v; targetCards = [c]; } });
                                    }
                                }

                                if (targetCards.some(tc => tc.number === card.number && tc.suit === card.suit)) {
                                    reveal = true;
                                    highlight = true;
                                }
                            }
                        }

                        return (
                            <TrucoCard
                                key={i}
                                number={reveal ? card.number : 0}
                                suit={reveal ? card.suit : "ESPADA"}
                                isFaceDown={!reveal}
                                className={`transform scale-75 ${highlight ? 'shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-90' : ''}`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Table Center (Played Cards History) */}
            <div className="flex-1 w-full flex items-center justify-center relative my-4">
                {/* Table Mat Area */}
                <div className="w-[600px] h-[300px] border-4 border-yellow-900/40 rounded-3xl flex flex-col items-center justify-between bg-black/20 backdrop-blur-sm relative p-6 shadow-inner">

                    {/* Opponent Played Cards (Top Row) */}
                    <div className="flex justify-center space-x-12 w-full h-1/2 items-start">
                        {[0, 1, 2].map(i => (
                            <div key={`opp-${i}`} className="w-20 h-32 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center relative">
                                {opponent?.playedCards[i] && (
                                    <div className="transform rotate-2 transition-all duration-500 hover:scale-110 shadow-2xl z-10">
                                        <TrucoCard number={opponent.playedCards[i].number} suit={opponent.playedCards[i].suit} className="scale-90" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Player Played Cards (Bottom Row) */}
                    <div className="flex justify-center space-x-12 w-full h-1/2 items-end">
                        {[0, 1, 2].map(i => (
                            <div key={`my-${i}`} className="w-20 h-32 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center relative">
                                {myPlayer?.playedCards[i] && (
                                    <div className="transform -rotate-2 transition-all duration-500 hover:scale-110 shadow-2xl z-10">
                                        <TrucoCard number={myPlayer.playedCards[i].number} suit={myPlayer.playedCards[i].suit} className="scale-90" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Pending Challenge Alert */}
            {gameState.pendingChallenge && (
                <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-yellow-500 text-center shadow-2xl animate-bounce-in">
                        <h2 className="text-2xl text-yellow-400 font-bold mb-2">
                            {gameState.pendingChallenge.type.replace(/_/g, " ")}!
                        </h2>
                        <p className="text-white mb-4">
                            {gameState.pendingChallenge.challengerId === playerId ? "Esperando respuesta..." : "¡Te han retado!"}
                        </p>
                    </div>
                </div>
            )}

            {/* Waiting for Opponent Overlay */}
            {gameState.players.length < 2 && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900/90 p-8 rounded-2xl border border-blue-500/50 text-center shadow-2xl">
                        <div className="mb-4">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                        <h2 className="text-2xl text-white font-bold mb-2">Esperando rival...</h2>
                        <p className="text-slate-400 mb-4">Compartí el código de sala con un amigo</p>
                        <div className="bg-slate-800 py-2 px-4 rounded-lg font-mono text-xl text-blue-400 tracking-wider">
                            {gameId}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 text-red-400 hover:text-red-300 text-sm font-bold block mx-auto underline"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Player Area (Bottom) */}
            <div className="w-full pb-8 pt-4 flex flex-col items-center bg-gradient-to-t from-black/50 to-transparent">
                {myPlayer && (
                    <Hand
                        cards={myPlayer.cards}
                        onPlayCard={handlePlayCard}
                        isCurrentTurn={isMyTurn && !gameState.pendingChallenge && gameState.status === "ACTIVE"} // Check status
                    />
                )}
            </div>

            {/* Controls */}
            {(() => {
                const { available, disabled } = (gameState.status === "ACTIVE")
                    ? getActions()
                    : { available: [], disabled: [] };

                return (
                    <Controls
                        onAction={handleAction}
                        availableActions={available}
                        disabledActions={disabled}
                        isMyTurn={isMyTurn}
                    />
                );
            })()}
            {/* Match End Modal */}
            {gameState.status === "FINISHED" && gameState.winnerId && (
                <MatchEndModal
                    winnerName={gameState.winnerId === playerId ? "Vos" : "Rival"}
                    isWinner={gameState.winnerId === playerId}
                    onRematch={() => {
                        socket.emit("action", { action: "REMATCH", gameId });
                    }}
                    onExit={() => {
                        window.location.href = '/';
                    }}
                />
            )}
            {/* Chat Box */}
            <ChatBox socket={socket} gameId={gameId} myPlayerId={playerId} />

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border-2 border-red-500/30 p-8 rounded-xl shadow-2xl max-w-sm text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="text-4xl mb-4">🏃💨</div>
                        <h3 className="text-2xl font-bold text-white mb-2">¿Abandonar Partida?</h3>
                        <p className="text-slate-300 mb-8 text-sm leading-relaxed">
                            Si sales ahora, perderás la partida y tu apuesta.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    // Robust Exit: Wait for server Acknowledgement
                                    const forceExit = setTimeout(() => {
                                        window.location.href = '/';
                                    }, 1000); // 1s fallback

                                    socket.emit('leave_game', { gameId }, () => {
                                        clearTimeout(forceExit);
                                        window.location.href = '/';
                                    });
                                }}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg font-bold transition-all hover:scale-105"
                            >
                                Confirmar Salida
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
