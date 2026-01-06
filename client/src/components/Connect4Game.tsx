
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ArrowLeft } from 'lucide-react';
import { TurnTimer } from './TurnTimer';
import { ChatBox } from './ChatBox';

interface Connect4Props {
    gameState: any;
    playerId: string;
    gameId: string;
    socket: Socket;
}

export function Connect4Game({ gameState, playerId, gameId, socket }: Connect4Props) {
    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [myColor, setMyColor] = useState<'RED' | 'YELLOW' | null>(null);

    const board = gameState.board || Array(6).fill(Array(7).fill(null));
    const isMyTurn = gameState.currentPlayer === playerId;
    const winner = gameState.winner;

    // Determine my color
    useEffect(() => {
        if (gameState.players && gameState.players[playerId]) {
            setMyColor(gameState.players[playerId].color);
        }
    }, [gameState.players, playerId]);

    const handleColumnClick = (col: number) => {
        if (!isMyTurn || winner) return;
        socket.emit('play_move', {
            gameId,
            playerId,
            move: { col }
        });
    };

    const getCellColor = (val: string | null) => {
        if (val === 'RED') return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]';
        if (val === 'YELLOW') return 'bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]';
        return 'bg-slate-950 shadow-inner border border-white/5'; // Empty slot - Darker for contrast
    };

    const isWinningCell = (r: number, c: number) => {
        if (!gameState.winningLine) return false;
        return gameState.winningLine.some((pos: any) => pos.r === r && pos.c === c);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900 to-slate-950 -z-10"></div>

            {/* Turn Timer */}
            {gameState.turnDeadline && !winner && (
                <div className="absolute top-20 left-4 z-40">
                    <TurnTimer
                        deadline={gameState.turnDeadline}
                        active={true}
                        className="bg-purple-900/40 border-purple-500/30 scale-125 origin-left"
                    />
                </div>
            )}

            {/* Header */}
            <div className="p-4 flex items-center justify-between z-10 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
                <button
                    onClick={() => setShowExitConfirm(true)}
                    className="p-2 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-full transition-colors flex items-center gap-2"
                >
                    <ArrowLeft size={24} />
                    <span className="text-sm font-bold">SALIR</span>
                </button>

                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
                        4 EN LÍNEA
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                        {winner ? (winner === 'DRAW' ? 'EMPATE' : 'PARTIDA FINALIZADA') : (isMyTurn ? 'TU TURNO' : 'ESPERANDO RIVAL...')}
                    </div>
                </div>

                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Game Board Contianer */}
            <div className="flex-1 flex items-center justify-center p-4 relative">

                {/* Board */}
                <div className="relative bg-blue-600 p-4 rounded-3xl border-b-8 border-r-8 border-blue-800 shadow-2xl w-full max-w-lg aspect-[7/6]">

                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-2 h-full w-full">
                        {[0, 1, 2, 3, 4, 5, 6].map(colIndex => (
                            <div
                                key={colIndex}
                                className="flex flex-col gap-2 relative group cursor-pointer h-full"
                                onMouseEnter={() => setHoverCol(colIndex)}
                                onMouseLeave={() => setHoverCol(null)}
                                onClick={() => handleColumnClick(colIndex)}
                            >
                                {/* Hover Indicator */}
                                {isMyTurn && !winner && hoverCol === colIndex && (
                                    <div className={`absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white/20 animate-bounce 
                                        ${myColor === 'RED' ? 'bg-red-500' : 'bg-yellow-400'}`}>
                                    </div>
                                )}

                                {/* Cells */}
                                {board.map((row: any[], rowIndex: number) => {
                                    const cellVal = row[colIndex];
                                    const isWin = isWinningCell(rowIndex, colIndex);

                                    return (
                                        <div
                                            key={`${rowIndex}-${colIndex}`}
                                            className={`w-full aspect-square rounded-full transition-all duration-300 relative overflow-hidden flex-shrink-0
                                                ${getCellColor(cellVal)}
                                                ${isWin ? 'ring-4 ring-white animate-pulse brightness-125' : ''}
                                            `}
                                        >
                                            {/* Shine effect on chips */}
                                            {cellVal && <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-white/30 rounded-full blur-[1px]"></div>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* Footer / Status */}
            <div className="p-6 pb-8 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex justify-center gap-8">
                {Object.values(gameState.players || {}).map((p: any) => (
                    <div key={p.color} className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${gameState.currentPlayer === Object.keys(gameState.players).find(k => gameState.players[k].color === p.color) ? 'bg-white/10 border-white/20 shadow-lg' : 'border-transparent opacity-60'}`}>
                        <div className={`w-8 h-8 rounded-full shadow-inner ${p.color === 'RED' ? 'bg-red-500' : 'bg-yellow-400'}`}></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{p.username}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{p.color === 'RED' ? 'ROJO' : 'AMARILLO'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Winner Overlay */}
            {/* Game Over Overlay - RPS Style */}
            {winner && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
                    <div className="flex flex-col items-center gap-8 p-12 bg-slate-800 rounded-3xl border-2 border-white/10 shadow-2xl transform scale-110">
                        <div className={`text-6xl md:text-7xl font-black ${winner === 'DRAW' ? 'text-white' : (winner === playerId ? 'text-green-400' : 'text-red-400')} drop-shadow-glow uppercase text-center`}>
                            {winner === 'DRAW' ? '¡EMPATE!' : (winner === playerId ? '🏆 ¡CAMPEÓN!' : '💀 PERDISTE')}
                        </div>

                        <div className="text-2xl text-slate-400 font-bold">
                            {winner === playerId ? "¡Sos el nuevo Campeón!" : (winner === 'DRAW' ? "Nadie gana esta vez" : "Suerte para la próxima")}
                        </div>

                        <div className="flex flex-col gap-3 items-center w-full">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 transition-all flex items-center gap-2 text-xl animate-bounce-in w-full justify-center"
                            >
                                🏠 VOLVER AL LOBBY
                            </button>

                            <div className="text-slate-500 text-xs font-mono mt-2 animate-pulse">
                                Volviendo automáticamente en 10s...
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Box */}
            <ChatBox socket={socket} gameId={gameId} myPlayerId={playerId} />

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-xl shadow-2xl max-w-sm text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="text-4xl mb-4">🔴</div>
                        <h3 className="text-2xl font-bold text-white mb-2">¿Abandonar Partida?</h3>
                        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                            Si te retiras, perderás la partida automáticamente.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all"
                            >
                                Seguir
                            </button>
                            <button
                                onClick={() => {
                                    socket.emit('leave_game', { gameId });
                                    window.location.href = '/';
                                }}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg font-bold transition-all hover:scale-105"
                            >
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
