
import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { Chess } from "chess.js";
import { MatchEndModal } from "./MatchEndModal";
import { TurnTimer } from "./TurnTimer";
import { ChatBox } from "./ChatBox";

interface ChessPlayer {
    playerId: string;
    username?: string;
}

interface ChessState {
    fen: string;
    turn: "w" | "b";
    isCheck: boolean;
    isCheckmate: boolean;
    isDraw: boolean;
    isStalemate: boolean;
    winner?: "w" | "b" | "draw" | string;
    history: string[];
    status: "ACTIVE" | "FINISHED";
    players?: ChessPlayer[];
    turnDeadline?: number;
    gameId?: string;
    isGameOver?: boolean;
}

interface ChessGameProps {
    gameState: ChessState;
    playerId: string;
    gameId: string;
    socket: Socket;
}

const PIECE_UNICODE: Record<string, string> = {
    'p': '♟\uFE0E', 'r': '♜\uFE0E', 'n': '♞\uFE0E', 'b': '♝\uFE0E', 'q': '♛\uFE0E', 'k': '♚\uFE0E',
    'P': '♟\uFE0E', 'R': '♜\uFE0E', 'N': '♞\uFE0E', 'B': '♝\uFE0E', 'Q': '♛\uFE0E', 'K': '♚\uFE0E'
};

export const ChessGame: React.FC<ChessGameProps> = ({ gameState, playerId, gameId, socket }) => {
    // SAFE INIT
    const [chess] = useState(() => {
        try {
            return new Chess(gameState.fen || undefined);
        } catch (e) {
            console.error("Chess Init Failed", e);
            return new Chess();
        }
    });

    const [, setFen] = useState(gameState.fen);
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [validMoves, setValidMoves] = useState<string[]>([]);

    useEffect(() => {
        if (gameState.fen && gameState.fen !== chess.fen()) {
            try {
                chess.load(gameState.fen);
                setFen(gameState.fen);
                setSelectedSquare(null);
                setValidMoves([]);
            } catch (e) {
                console.error("FEN Load Error", e);
            }
        }
    }, [gameState.fen, chess]);

    const whitePlayerId = gameState.players?.[0]?.playerId;
    const amIWhite = playerId === whitePlayerId;
    const boardOrientation = amIWhite ? "white" : "black";
    const isMyTurn = gameState.turn === (amIWhite ? "w" : "b");

    function handleSquareClick(square: string) {
        if (!isMyTurn) return;

        if (selectedSquare) {
            try {
                // Determine if promotion is needed
                const piece = chess.get(selectedSquare as any);
                const isPawn = piece && piece.type === 'p';
                const isPromotionRow = (piece?.color === 'w' && square[1] === '8') || (piece?.color === 'b' && square[1] === '1');
                const promotion = (isPawn && isPromotionRow) ? 'q' : undefined;

                const moveObj: any = {
                    from: selectedSquare,
                    to: square,
                };
                if (promotion) moveObj.promotion = promotion;

                const move = chess.move(moveObj);

                if (move) {
                    setFen(chess.fen());
                    setSelectedSquare(null);
                    setValidMoves([]);

                    socket.emit("play_move", {
                        gameId,
                        move: moveObj
                    });
                    return;
                }
            } catch (e) {
                // Invalid move or library error
            }
        }

        const piece = chess.get(square as any); // library types might be loose
        if (piece && piece.color === (amIWhite ? 'w' : 'b')) {
            setSelectedSquare(square);
            try {
                const moves = chess.moves({ square: square as any, verbose: true });
                setValidMoves(moves.map((m: any) => m.to));
            } catch (e) {
                console.error("Move Gen Error", e);
            }
        } else {
            setSelectedSquare(null);
            setValidMoves([]);
        }
    }

    // Safety Render
    try {
        const board: React.ReactNode[] = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

        const renderRanks = boardOrientation === 'white' ? ranks : [...ranks].reverse();
        const renderFiles = boardOrientation === 'white' ? files : [...files].reverse();

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const rank = renderRanks[i];
                const file = renderFiles[j];
                const square = `${file}${rank}`;

                const isDark = (i + j) % 2 === 1;
                const isSelected = square === selectedSquare;
                const isValidMove = validMoves.includes(square);

                const piece = chess.get(square as any);
                const pieceSymbol = piece ? PIECE_UNICODE[piece.color === 'w' ? piece.type.toUpperCase() : piece.type] : null;

                board.push(
                    <div
                        key={square}
                        onClick={() => handleSquareClick(square)}
                        className={`
                            w-full h-full flex items-center justify-center text-4xl select-none cursor-pointer
                            ${isDark ? 'bg-[#8b4513]' : 'bg-[#eecfa1]'}
                            ${isSelected ? 'bg-yellow-400!' : ''}
                            ${isValidMove ? 'ring-4 ring-black/20 inset-0' : ''}
                        `}
                    >
                        <span
                            className={`transform ${piece?.color === 'b' ? 'text-black' : 'text-white'} ${piece ? 'hover:scale-110 transition-transform' : ''}`}
                            style={piece?.color === 'w' ? { textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' } : {}}
                        >
                            {pieceSymbol}
                        </span>

                        {isValidMove && !piece && (
                            <div className="absolute w-3 h-3 bg-black/20 rounded-full" />
                        )}
                    </div>
                );
            }
        }

        return (
            <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-stone-900 text-white p-4 gap-8 notranslate" translate="no">

                {/* Board Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                        <div className="text-amber-400 font-bold text-3xl font-serif tracking-wider">CHESS MASTER</div>
                        {gameState.players && gameState.players.length === 2 && (
                            <div className="text-xs text-amber-200/70 font-mono mt-1 mb-2">
                                {gameState.players[0]?.username || "P1"} vs {gameState.players[1]?.username || "P2"}
                            </div>
                        )}
                        <div className={`px-6 py-2 rounded-full font-bold text-sm mt-3 shadow-lg transition-colors duration-300 ${isMyTurn ? 'bg-emerald-600 text-white' : 'bg-red-500/20 text-red-400'}`}>
                            {isMyTurn ? "TU TURNO" : "ESPERANDO RIVAL..."}
                        </div>
                        {gameState.turnDeadline && (
                            <TurnTimer
                                deadline={gameState.turnDeadline}
                                active={gameState.status === "ACTIVE" && !gameState.isGameOver}
                                className="mt-2"
                            />
                        )}
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-900 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative w-[85vw] max-w-[500px] aspect-square grid grid-cols-8 grid-rows-8 border-[12px] border-stone-800 rounded-sm shadow-2xl bg-stone-800">
                            {board}
                        </div>
                    </div>
                </div>

                {/* Info / History Panel */}
                <div className="w-[85vw] max-w-[500px] md:w-80 h-[524px] bg-stone-800 rounded-xl border border-stone-700 flex flex-col items-center p-4 shadow-xl">
                    <div className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-4 border-b border-stone-700 w-full text-center pb-2">
                        Historial
                    </div>

                    <div className="flex-1 w-full overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-y-1 text-sm">
                            {(gameState.history || []).map((move: string, i: number) => {
                                if (i % 2 === 0) {
                                    return (
                                        <React.Fragment key={i}>
                                            <div className="text-stone-500 font-mono text-right pr-4 py-1">{(i / 2) + 1}.</div>
                                            <div className="text-stone-300 font-bold py-1 pl-2 hover:bg-white/5 rounded">{move}</div>
                                        </React.Fragment>
                                    );
                                } else {
                                    return (
                                        <div key={i} className="text-stone-300 font-bold py-1 pl-2 col-start-2 hover:bg-white/5 rounded">{move}</div>
                                    );
                                }
                            })}
                        </div>
                        {(!gameState.history || gameState.history.length === 0) && (
                            <div className="text-stone-600 text-center italic mt-10">
                                La partida comienza...
                            </div>
                        )}
                    </div>

                    <div className="w-full pt-4 border-t border-stone-700 mt-2">
                        <div className="flex justify-between text-xs text-stone-500 font-mono">
                            <span>JUGADOR: {playerId.slice(0, 6)}...</span>
                            <span>SALA: {gameId}</span>
                        </div>
                    </div>
                </div>


                {/* Game Over Modal */}
                {
                    (gameState.status === 'FINISHED' || gameState.isGameOver) && (
                        <MatchEndModal
                            winnerName={gameState.winner === 'draw' ? "Empate" : (gameState.winner === (playerId === gameState.players?.[0]?.playerId ? 'w' : 'b') ? "Vos" : "Rival")}
                            isWinner={gameState.winner !== 'draw' && gameState.winner === (playerId === gameState.players?.[0]?.playerId ? 'w' : 'b')}
                            onRematch={() => window.location.reload()}
                            onExit={() => window.location.href = '/'}
                        />
                    )
                }
                <ChatBox socket={socket} gameId={gameId} myPlayerId={playerId} />
            </div >
        );
    } catch (e: any) {
        return (
            <div className="text-red-500 p-10 font-bold">
                RENDER ERROR: {e.message}
            </div>
        );
    }
};
