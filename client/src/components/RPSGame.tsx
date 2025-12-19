import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { TurnTimer } from './TurnTimer';

interface RPSGameProps {
    gameState: any;
    playerId: string;
    gameId: string;
    socket: Socket;
}

const CHOICE_EMOJIS: Record<string, string> = {
    "ROCK": "✊",
    "PAPER": "✋",
    "SCISSORS": "✌️"
};

const CHOICE_LABELS: Record<string, string> = {
    "ROCK": "PIEDRA",
    "PAPER": "PAPEL",
    "SCISSORS": "TIJERA"
};

export const RPSGame: React.FC<RPSGameProps> = ({ gameState, playerId, gameId, socket }) => {
    const myPlayerState = gameState.players[playerId] || {};
    const myChoice = myPlayerState.choice;
    const isFinished = gameState.status === "FINISHED";
    const isRoundOver = gameState.status === "ROUND_OVER";
    const canPlay = !myChoice && !isFinished && !isRoundOver;
    const isOver = isFinished || isRoundOver;

    const [revealCountdown, setRevealCountdown] = useState<number>(0);
    const [nextRoundCountdown, setNextRoundCountdown] = useState<number | null>(null);
    const [showRematchButton, setShowRematchButton] = useState(false);
    const prevStatusRef = useRef<string>(gameState.status);

    // Reveal Countdown Effect
    useEffect(() => {
        // If we transitioned to OVER from WAITING, start reveal countdown
        if (isOver && prevStatusRef.current === "WAITING") {
            setRevealCountdown(3);
        }
        prevStatusRef.current = gameState.status;
    }, [gameState.status, isOver]);

    useEffect(() => {
        if (revealCountdown > 0) {
            const timer = setTimeout(() => setRevealCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [revealCountdown]);

    // Auto-advance round effect (starts only after reveal is done)
    useEffect(() => {
        if (isRoundOver && revealCountdown === 0) {
            setNextRoundCountdown(3);
            const timer = setInterval(() => {
                setNextRoundCountdown(prev => {
                    if (prev === 1) {
                        clearInterval(timer);
                        handleRematch(); // Trigger next round
                        return 0;
                    }
                    return (prev || 0) - 1;
                });
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setNextRoundCountdown(null);
        }
    }, [isRoundOver, revealCountdown]);

    // Delay Rematch Button Effect
    useEffect(() => {
        if (isFinished && revealCountdown === 0) {
            const timer = setTimeout(() => setShowRematchButton(true), 1000);
            return () => clearTimeout(timer);
        } else {
            setShowRematchButton(false);
        }
    }, [isFinished, revealCountdown]);

    // Find opponent
    const opponentId = Object.keys(gameState.players).find(pid => pid !== playerId);
    const opponentState = opponentId ? gameState.players[opponentId] : null;
    const opponentChoice = opponentState?.choice;

    // Score masking logic (prevent spoiler before reveal)
    let myScore = myPlayerState.score || 0;
    let opponentScore = opponentState?.score || 0;

    // If we are in the "Reveal Countdown" phase, the backend already updated the score.
    // We must subtract 1 from the winner's score to hide it until countdown ends.
    if (isOver && revealCountdown > 0) {
        // Who won this specific round/match increment?
        // Note: gameState.roundWinner is "TIE", playerId, or opponentId
        // BUT for Match Finish, roundWinner might still be set from the last round logic in backend?
        // Yes, RPSLogic updates roundWinner even on match finish.
        if (gameState.roundWinner === playerId) {
            myScore = Math.max(0, myScore - 1);
        } else if (opponentId && gameState.roundWinner === opponentId) {
            opponentScore = Math.max(0, opponentScore - 1);
        }
    }

    function handleChoice(choice: string) {
        if (myChoice || isFinished) return;
        socket.emit("play_move", {
            gameId,
            move: { playerId, choice }
        });
    }

    function handleRematch() {
        socket.emit("play_move", {
            gameId,
            move: { action: "RESET" }
        });
    }

    // Determine result message
    let resultMessage = "";
    let resultColor = "text-white";

    // We show message if Finished OR RoundOver
    if (isFinished) {
        if (gameState.winner === "TIE") {
            resultMessage = "¡EMPATE!"; // Should act be tie breaker?
        } else if (gameState.winner === playerId) {
            resultMessage = "🏆 ¡CAMPEÓN!";
            resultColor = "text-green-400";
        } else {
            resultMessage = "💀 PERDISTE";
            resultColor = "text-red-400";
        }
    } else if (isRoundOver) {
        if (gameState.roundWinner === "TIE") {
            resultMessage = "EMPATE EN RONDA";
            resultColor = "text-yellow-400";
        } else if (gameState.roundWinner === playerId) {
            resultMessage = "GANASTE RONDA";
            resultColor = "text-green-400";
        } else {
            resultMessage = "RIVAL GANA RONDA";
            resultColor = "text-red-400";
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 font-sans selection:bg-purple-500/30">
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center text-sm text-slate-500 font-mono">
                <div>SALA: {gameId}</div>
                <div>JUGADOR: {playerId.slice(0, 6)}...</div>
            </div>

            {/* ROUND TIMER */}
            {gameState.turnDeadline && !isOver && (
                <div className="absolute top-16 right-4 z-40">
                    <TurnTimer
                        deadline={gameState.turnDeadline}
                        active={true}
                        className="bg-purple-900/40 border-purple-500/30 scale-125 origin-right"
                    />
                </div>
            )}

            <h1 className="text-3xl md:text-5xl font-black mb-8 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 drop-shadow-lg">
                PIEDRA PAPEL TIJERA
            </h1>

            {/* Game Area */}
            <div className="flex flex-col items-center gap-8 w-full max-w-2xl">

                {/* Scoreboard */}
                {opponentId && (
                    <div className="flex justify-between w-full px-12 text-2xl font-bold text-slate-400">
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase max-w-[80px] truncate">{myPlayerState.username || "VOS"}</span>
                            <span className="text-4xl text-white">{myScore}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs uppercase max-w-[80px] truncate">{opponentState.username || "RIVAL"}</span>
                            <span className="text-4xl text-white">{opponentScore}</span>
                        </div>
                    </div>
                )}

                {!opponentId && (
                    <div className="animate-pulse text-xl text-yellow-400 font-bold bg-yellow-400/10 px-6 py-2 rounded-full">
                        ⏳ Esperando Rival...
                    </div>
                )}

                {/* Opponent Hand (Hidden or Revealed) */}
                {/* Only show if we have an opponent */}
                <div className="h-40 flex items-center justify-center">
                    {opponentId ? (
                        (isOver && revealCountdown === 0) ? (
                            <div className="flex flex-col items-center animate-bounce-in">
                                <div className="text-8xl">{CHOICE_EMOJIS[opponentChoice]}</div>
                                <div className="text-white/50 text-sm mt-2 font-black">{CHOICE_LABELS[opponentChoice]}</div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                {/* If reveal countdown is active, show the countdown number */}
                                {revealCountdown > 0 ? (
                                    <div className="text-8xl font-black text-yellow-400 animate-ping">
                                        {revealCountdown}
                                    </div>
                                ) : (
                                    <>
                                        {/* If opponent has chosen but not finished, show mystery. Else show waiting */}
                                        {opponentChoice ? (
                                            <div className="text-8xl animate-bounce">👊</div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 bg-slate-600 rounded-full animate-bounce"></div>
                                                <div className="w-3 h-3 bg-slate-600 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-3 h-3 bg-slate-600 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        )}
                                        <div className="text-white/30 text-sm mt-4 font-bold tracking-widest uppercase">
                                            {opponentChoice ? "RIVAL LISTO" : "PENSANDO..."}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    ) : null}
                </div>

                {/* Result Message (Only for Round Over) */}
                <div className="h-20 flex items-center justify-center">
                    {(isRoundOver && revealCountdown === 0) && (
                        <div className={`text-4xl font-black ${resultColor} drop-shadow-glow animate-fade-in-up uppercase`}>
                            {resultMessage}
                        </div>
                    )}
                </div>

                {/* Player Controls */}
                <div className="flex gap-6">
                    {["ROCK", "PAPER", "SCISSORS"].map((choice) => (
                        <button
                            key={choice}
                            onClick={() => handleChoice(choice)}
                            disabled={!canPlay || !opponentId}
                            className={`
                                group relative w-24 h-24 md:w-32 md:h-32 rounded-2xl flex flex-col items-center justify-center gap-2 border-b-4 transition-all duration-200
                                ${myChoice === choice
                                    ? 'bg-purple-600 border-purple-800 translate-y-2 text-white'
                                    : (myChoice && myChoice !== choice) || !opponentId || isRoundOver || isFinished
                                        ? 'bg-slate-800 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                                        : 'bg-slate-700 border-slate-900 hover:bg-slate-600 hover:border-slate-800 hover:-translate-y-1 active:translate-y-1 active:border-slate-900 text-slate-200'
                                }
                            `}
                        >
                            <span className="text-4xl md:text-5xl group-hover:scale-110 transition-transform">
                                {CHOICE_EMOJIS[choice]}
                            </span>
                            <span className="text-xs font-bold font-mono uppercase opacity-70">
                                {CHOICE_LABELS[choice]}
                            </span>

                            {/* Selection ring if chosen */}
                            {myChoice === choice && (
                                <div className="absolute inset-0 border-4 border-yellow-400 rounded-2xl animate-pulse"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Actions (Rematch or Next Round) */}
                {isRoundOver && revealCountdown === 0 && (
                    <div className="mt-4 flex flex-col items-center animate-pulse">
                        <span className="text-blue-400 font-bold text-lg mb-2">Siguiente ronda en {nextRoundCountdown}...</span>
                        <button
                            onClick={handleRematch} // Reuse handleRematch as it sends RESET -> which triggers next round
                            className="bg-slate-800/50 hover:bg-slate-700 text-blue-300 font-semibold py-2 px-6 rounded-full border border-blue-500/30 transition-all text-sm"
                        >
                            Acelerar ➔
                        </button>
                    </div>
                )}

                {/* Game Over Overlay */}
                {isFinished && revealCountdown === 0 && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                        <div className="flex flex-col items-center gap-8 p-12 bg-slate-800 rounded-3xl border-2 border-white/10 shadow-2xl transform scale-110">
                            <div className={`text-6xl md:text-7xl font-black ${resultColor} drop-shadow-glow uppercase text-center`}>
                                {resultMessage}
                            </div>

                            <div className="text-2xl text-slate-400 font-bold">
                                {gameState.winner === playerId ? "¡Sos el nuevo Campeón!" : "Suerte para la próxima"}
                            </div>

                            {showRematchButton && (
                                <button
                                    onClick={handleRematch}
                                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-slate-900 font-black py-4 px-12 rounded-full shadow-lg hover:shadow-yellow-500/50 transform hover:scale-105 transition-all flex items-center gap-3 text-2xl animate-bounce-in"
                                >
                                    <span>↺</span> JUGAR DE NUEVO
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
