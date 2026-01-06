import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { ChatBox } from './ChatBox';
import { ArrowLeft } from 'lucide-react';
import { ColorWheel } from './uno/ColorWheel';

interface UnoGameProps {
    gameState: any;
    playerId: string;
    gameId: string;
    socket: Socket;
}

export const UnoGame: React.FC<UnoGameProps> = ({ gameState, playerId, gameId, socket }) => {
    const [myHand, setMyHand] = useState<any[]>([]);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);


    useEffect(() => {
        if (gameState && gameState.players) {
            const me = gameState.players.find((p: any) => p.playerId === playerId);
            if (me) setMyHand(me.hand);
        }
        // Unlock submission when state updates
        setIsSubmitting(false);
    }, [gameState, playerId]);

    // Handle Move Errors
    useEffect(() => {
        const handleError = ({ message }: { message: string }) => {
            // Suppress annoying alerts for double-clicks or common non-critical errors
            if (message.includes("No es tu turno") ||
                message.includes("Not your turn") ||
                message.includes("Movimiento muy rápido") ||
                message.includes("Partida no activa") ||
                message.includes("Game not active")) {
                console.log("Supressed Error:", message);
            } else {
                alert(message);
            }
            setIsSubmitting(false);
        };

        socket.on("move_error", handleError);
        return () => {
            socket.off("move_error", handleError);
        };
    }, [socket]);

    // Handle Waiting State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        console.log("[UnoGame] Countdown Deadline:", gameState?.countdownDeadline);
        if (gameState?.countdownDeadline) {
            const interval = setInterval(() => {
                const diff = Math.ceil((gameState.countdownDeadline - Date.now()) / 1000);
                console.log("[UnoGame] Timer Tick:", diff);
                setTimeLeft(diff > 0 ? diff : 0);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setTimeLeft(null);
        }
    }, [gameState?.countdownDeadline]);


    if (gameState.status === 'WAITING') {
        const players = gameState.players || [];
        const maxPlayers = gameState.options?.maxPlayers || 6;
        // Ensure we always show 6 slots for the visual layout if max is 6, or dynamic
        const slots = Array.from({ length: maxPlayers }).map((_, i) => players[i] || null);

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a0b2e] text-white font-sans p-4">
                <div className="relative w-full max-w-2xl bg-[#2d1b4e]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center overflow-hidden">

                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-purple-600/30 blur-[80px] rounded-full pointer-events-none"></div>

                    {/* Loader Icon */}
                    <div className="relative mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 shadow-inner relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/0 via-purple-500/20 to-purple-500/0 animate-shimmer"></div>
                            <div className="w-8 h-0.5 bg-purple-500 rotate-45 transform origin-center absolute"></div>
                            <div className="w-8 h-0.5 bg-purple-500 -rotate-45 transform origin-center absolute"></div>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold mb-2 tracking-tight">Esperando Rival...</h2>
                    <p className="text-purple-200/60 mb-10 font-medium">
                        {gameId ? `Sala: ${gameId}` : 'Buscando sala...'}
                    </p>

                    {/* SLOTS CONTAINER */}
                    <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12 max-w-lg">
                        {slots.map((p: any, i: number) => (
                            <div key={i} className="flex flex-col items-center gap-2 transition-all duration-300">
                                <div className={`
                                    w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 shadow-lg relative
                                    ${p
                                        ? 'bg-zinc-800 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                        : 'bg-white/5 border-dashed border-white/10'
                                    }
                                `}>
                                    {p ? (
                                        p.user?.avatarUrl ? (
                                            <img src={p.user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <span className="text-white font-bold text-lg">{p.username?.[0]?.toUpperCase() || '?'}</span>
                                        )
                                    ) : (
                                        <span className="text-white/10 text-xl font-bold">{i + 1}</span>
                                    )}

                                    {/* Status Dot */}
                                    {p && (
                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                                    )}
                                </div>

                                {/* Username or 'Vacío' */}
                                <span className={`text-xs font-medium tracking-wide ${p ? 'text-white' : 'text-white/20'}`}>

                                </span>
                            </div>
                        ))}
                    </div>

                    {/* COUNTDOWN OR STATUS */}
                    {timeLeft !== null ? (
                        <div className="w-full bg-[#3b2161] border border-[#5d3b8e] rounded-xl p-4 text-center animate-pulse shadow-lg mb-6">
                            <p className="text-[#ffd700] font-bold text-xl mb-1">Iniciando en {timeLeft}s</p>
                            <p className="text-white/50 text-xs">La partida comenzará automáticamente</p>
                        </div>
                    ) : (
                        <div className="flex gap-1.5 opacity-50 mb-8">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </div>
                    )}

                    {/* EXIT BUTTON */}
                    <button
                        onClick={() => {
                            if (confirm("¿Salir de la sala? Se te reembolsará la apuesta.")) {
                                socket.emit("leave_game", { gameId }, () => {
                                    window.location.reload();
                                });
                            }
                        }}
                        className="px-6 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        <span>✕</span> Salir de la Búsqueda
                    </button>
                </div>
            </div>
        );
    }

    const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.playerId === playerId;
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    const currentColor = gameState.currentColor;
    const winner = gameState.winner;

    const handleColorSelect = (color: string) => {
        if (pendingCardIndex === null) return;
        setIsSubmitting(true);
        socket.emit('play_move', {
            gameId,
            playerId,
            move: { cardIndex: pendingCardIndex, chosenColor: color }
        });
        setShowColorPicker(false);
        setPendingCardIndex(null);
    };

    const playCard = (cardIndex: number, card: any) => {
        if (!isMyTurn || winner || isSubmitting) return;

        // Basic Client Validation
        if (card.color !== 'BLACK' && card.color !== currentColor && card.type !== topCard.type && card.value !== topCard.value) {
            // Check for match logic if needed, but let backend handle strict rules or add shake here
            // return; // Optional strict client check
        }

        if (card.color === 'BLACK' || card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') {
            setPendingCardIndex(cardIndex);
            setShowColorPicker(true);
            return;
        }

        setIsSubmitting(true);
        socket.emit('play_move', {
            gameId,
            playerId,
            move: { cardIndex }
        });
    };

    const drawCard = () => {
        if (!isMyTurn || winner) return;
        socket.emit('play_move', {
            gameId,
            playerId,
            move: { action: 'DRAW' }
        });
    }

    const getCardColorParams = (color: string) => {
        switch (color) {
            case 'RED': return 'bg-red-500 border-red-700 text-white';
            case 'BLUE': return 'bg-blue-500 border-blue-700 text-white';
            case 'GREEN': return 'bg-green-500 border-green-700 text-white';
            case 'YELLOW': return 'bg-yellow-400 border-yellow-600 text-black';
            case 'BLACK': return 'bg-slate-900 border-slate-700 text-white'; // Wild
            default: return 'bg-gray-400';
        }
    };

    const renderCard = (card: any, index?: number, onClick?: () => void) => {
        const style = getCardColorParams(card.color);
        let content: React.ReactNode = card.value?.toString();

        // Custom Visuals
        if (card.type === 'SKIP') content = '🚫';
        if (card.type === 'REVERSE') content = '🔁';
        if (card.type === 'DRAW_TWO') content = '+2';

        // Wild Cards Visuals (4 Colors)
        if (card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') {
            content = (
                <div className="relative w-full h-full flex flex-wrap items-center justify-center p-1 md:p-2 rotate-45 transform">
                    <div className="w-1/2 h-1/2 bg-red-500 rounded-sm shadow-sm absolute -top-1 -left-1 transform -rotate-12"></div>
                    <div className="w-1/2 h-1/2 bg-blue-500 rounded-sm shadow-sm absolute -top-1 -right-1 transform rotate-12"></div>
                    <div className="w-1/2 h-1/2 bg-yellow-400 rounded-sm shadow-sm absolute -bottom-1 -left-1 transform rotate-12"></div>
                    <div className="w-1/2 h-1/2 bg-green-500 rounded-sm shadow-sm absolute -bottom-1 -right-1 transform -rotate-12"></div>

                    {/* Inner Text */}
                    <div className="z-10 bg-black/50 rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center -rotate-45 backdrop-blur-sm border border-white/20">
                        <span className="text-white font-black text-sm md:text-lg">
                            {card.type === 'WILD_DRAW_FOUR' ? '+4' : ''}
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div
                key={card.id || index}
                onClick={onClick}
                className={`
                    w-16 h-24 md:w-24 md:h-36 rounded-xl border-4 ${style} 
                    flex items-center justify-center shadow-xl 
                    cursor-pointer transform hover:-translate-y-4 hover:rotate-2 transition-all relative
                    bg-gradient-to-br from-white/10 to-transparent overflow-hidden
                `}
            >
                {/* Corner Icons */}
                {card.type !== 'WILD' && card.type !== 'WILD_DRAW_FOUR' && (
                    <>
                        <div className="absolute top-1 left-1 text-xs md:text-sm font-bold opacity-80">{typeof content === 'string' ? content : ''}</div>
                        <div className="absolute bottom-1 right-1 text-xs md:text-sm font-bold opacity-80 transform rotate-180">{typeof content === 'string' ? content : ''}</div>
                    </>
                )}

                {/* Center Content */}
                <div className={`
                    ${(card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') ? 'w-full h-full' : 'border-4 border-white/20 rounded-full w-10 h-10 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-5xl font-black'}
                `}>
                    {content}
                </div>
            </div>
        );
    }

    // --- TABLE LAYOUT CALCS ---
    // Define positions for circular table (clockwise from bottom-left or simply relative to "me")
    // If I am at bottom, others are distributed in top semi-circle.

    // Sort players so "Me" is always at bottom (index 0 for rendering purposes), preserving cyclic order.
    // Normalized list: [Me, Next, ..., Last]
    const getNormalizedPlayers = () => {
        if (!gameState.players) return [];
        const myIndex = gameState.players.findIndex((p: any) => p.playerId === playerId);
        if (myIndex === -1) return gameState.players;
        // Rotate so I am first
        return [
            ...gameState.players.slice(myIndex),
            ...gameState.players.slice(0, myIndex)
        ];
    };

    const orderedPlayers = getNormalizedPlayers();
    const otherPlayers = orderedPlayers.slice(1); // Exclude me

    // Positions for opponents (Top semicircle)
    // 2 players: 1 opponent (Top Center)
    // 3 players: 2 opponents (Top Left, Top Right)
    // 4 players: 3 opponents (Left, Top, Right)
    // 6 players: 5 opponents (Left-Bot, Left-Top, Top, Right-Top, Right-Bot)

    const getPositionClass = (index: number, totalOpponents: number) => {
        // Simplified Logic for 6 max
        // visualIndex is 0..totalOpponents-1

        if (totalOpponents === 1) return "top-8 left-1/2 -translate-x-1/2"; // Top Center

        if (totalOpponents === 3) { // 4 players total (Me + 3)
            if (index === 0) return "left-4 top-1/2 -translate-y-1/2"; // Left
            if (index === 1) return "top-4 left-1/2 -translate-x-1/2"; // Top
            if (index === 2) return "right-4 top-1/2 -translate-y-1/2"; // Right
        }

        if (totalOpponents === 5) { // 6 players total
            if (index === 0) return "bottom-32 left-8";
            if (index === 1) return "top-20 left-12";
            if (index === 2) return "top-4 left-1/2 -translate-x-1/2"; // Top (Dealer spot)
            if (index === 3) return "top-20 right-12";
            if (index === 4) return "bottom-32 right-8";
        }

        // Fallback or specific for 3 total users (2 opp)
        if (totalOpponents === 2) {
            if (index === 0) return "top-12 left-20";
            if (index === 1) return "top-12 right-20";
        }

        // Generic circle if fails?
        return "top-4 left-1/2";
    };

    return (
        <div className="min-h-screen relative bg-zinc-950 overflow-hidden flex flex-col items-center justify-center font-sans">

            {/* Header / Top Bar (Absolute Top) */}
            <div className="absolute top-0 left-0 right-0 p-3 md:p-6 flex items-center justify-between z-50 pointer-events-none">
                <button onClick={() => setShowExitConfirm(true)} className="pointer-events-auto bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-md transition-colors border border-white/10 shadow-lg">
                    <ArrowLeft size={24} />
                </button>
                {/* Title */}
                <div className="flex flex-col items-center pointer-events-auto">
                    <span className="text-amber-100/90 font-bold text-xl md:text-2xl drop-shadow-md font-serif tracking-widest uppercase">El Único</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* UNIFIED TABLE CONTAINER */}
            {/* This container defines the "World" of the table. Background and Elements live here. */}
            {/* Responsive Aspect Ratio: Square-ish on Mobile, Widescreen on Desktop */}
            <div className="relative w-full max-w-6xl aspect-square md:aspect-[16/9] flex items-center justify-center shadow-2xl">

                {/* 1. Background Image Layer */}
                <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat z-0"
                    style={{ backgroundImage: `url('/assets/uno_table.png')` }}
                >
                    {/* Soft Shadow behind table */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] h-[90%] bg-black/50 blur-[100px] -z-10 rounded-full"></div>
                </div>

                {/* 2. Game Elements Layer (Strictly inside the table box) */}
                <div className="absolute inset-0 z-10">

                    {/* CENTER AREA: Deck & Discard */}
                    {/* We use specific % positioning to land exactly in center of table image */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 md:gap-12">

                        {/* Draw Pile */}
                        <div onClick={drawCard} className={`
                            w-16 h-24 md:w-28 md:h-40 rounded-lg bg-red-800 border-2 border-white/10 shadow-[0_5px_15px_rgba(0,0,0,0.6)] relative cursor-pointer
                            hover:scale-105 transition-transform group
                            ${isMyTurn ? 'ring-4 ring-yellow-400/40 animate-pulse' : ''}
                        `}>
                            <div className="absolute inset-1 rounded bg-gradient-to-br from-red-700 to-red-950 opacity-100"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white/20 font-serif font-bold text-2xl -rotate-45 select-none drop-shadow-sm">UNO</span>
                            </div>
                        </div>

                        {/* Discard Pile */}
                        <div className="relative transform rotate-3 hover:rotate-0 transition-transform duration-300">
                            {/* Render Top Card with slightly larger size for visibility */}
                            <div className="transform scale-110">
                                {renderCard(topCard)}
                            </div>

                            {/* Current Color Dot */}
                            <div className={`
                                absolute -top-4 -right-4 w-8 h-8 rounded-full border-2 border-white shadow-lg z-20 flex items-center justify-center
                                ${getCardColorParams(currentColor).split(' ')[0]}
                            `}>
                                <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                            </div>
                        </div>

                    </div>

                    {/* OPPONENTS (Distributed relative to this container) */}
                    {otherPlayers.map((p: any, idx: number) => {
                        const isTurn = gameState.players[gameState.currentPlayerIndex]?.playerId === p.playerId;
                        return (
                            <div
                                key={p.playerId}
                                className={`absolute ${getPositionClass(idx, otherPlayers.length)} flex flex-col items-center transition-all duration-500`}
                            >
                                {/* Avatar */}
                                <div className={`
                                    w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] shadow-lg relative bg-zinc-900
                                    ${isTurn && !p.hasLeft ? 'border-yellow-400 scale-110 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'border-white/10'}
                                    ${p.hasLeft ? 'grayscale opacity-50' : ''}
                                `}>
                                    {p.user?.avatarUrl ? (
                                        <img src={p.user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span className="w-full h-full flex items-center justify-center text-white font-serif font-bold">{p.username?.[0] || '?'}</span>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-white text-black text-[10px] font-bold px-1.5 rounded-full border shadow-sm">
                                        {p.hand.length}
                                    </div>

                                    {/* Left Badge */}
                                    {p.hasLeft && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                                            <span className="text-[10px] font-bold text-red-500 bg-black/80 px-1 py-0.5 rounded border border-red-500/50">OFF</span>
                                        </div>
                                    )}
                                </div>
                                {/* Name */}
                                <div className="mt-1 bg-black/70 text-white text-[9px] md:text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md">
                                    {p.username} {p.hasLeft && "(ABANDONÓ)"}
                                </div>
                            </div>
                        );
                    })}

                    {/* TURN INFO / CENTER TEXT */}
                    {gameState.status === 'WAITING' ? (
                        <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <div className="bg-black/60 px-6 py-3 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-3 shadow-2xl">
                                <div className="animate-spin text-lg">⏳</div>
                                <span className="text-white font-bold tracking-wider text-sm">ESPERANDO JUGADORES</span>
                            </div>
                        </div>
                    ) : !winner && (
                        <div className="absolute top-[68%] left-1/2 -translate-x-1/2 z-20">
                            <div className={`
                                px-6 py-1.5 rounded-full border text-xs md:text-sm font-bold shadow-xl transition-all
                                ${isMyTurn
                                    ? 'bg-yellow-500 text-black border-yellow-400 animate-bounce'
                                    : 'bg-black/50 text-white/50 border-white/5'}
                             `}>
                                {isMyTurn ? "TU TURNO" : `Juega: ${gameState.players[gameState.currentPlayerIndex]?.username}`}
                            </div>
                        </div>
                    )}
                </div>

            </div>


            {/* MY PLAYER AREA (Bottom Fixed) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pb-2 md:pb-4 pointer-events-none">

                {/* My Hand - Scrollable row */}
                <div className="flex justify-center items-end -space-x-4 md:-space-x-6 pb-2 md:pb-6 perspective-1000 overflow-x-auto overflow-y-visible px-4 w-full pointer-events-auto mask-gradient-sides">
                    {myHand.map((card, idx) => {
                        return (
                            <div
                                key={card.id || idx}
                                className="transform transition-all duration-300 hover:-translate-y-6 md:hover:-translate-y-10 hover:z-50 hover:scale-110 origin-bottom shadow-2xl shrink-0"
                            >
                                {renderCard(card, idx, () => playCard(idx, card))}
                            </div>
                        );
                    })}
                </div>

                {/* My Avatar / Info (Floating bottom-right) */}
                <div className="absolute bottom-24 right-4 md:bottom-8 md:right-8 flex items-center gap-3 bg-black/60 p-2 md:p-3 rounded-xl backdrop-blur-md border border-white/10 shadow-xl pointer-events-auto">
                    <div className="text-right">
                        <div className="text-white font-bold text-sm md:text-base leading-tight">{gameState.players.find((p: any) => p.playerId === playerId)?.username || 'Tú'}</div>
                        <div className="text-emerald-400 text-xs md:text-sm font-mono font-bold">$ {gameState.betAmount || 0}</div>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-amber-500/50 overflow-hidden bg-gray-900">
                        {gameState.players.find((p: any) => p.playerId === playerId)?.user?.avatarUrl ?
                            <img src={gameState.players.find((p: any) => p.playerId === playerId)?.user.avatarUrl} className="w-full h-full object-cover" /> :
                            <div className="w-full h-full flex items-center justify-center text-white">👤</div>
                        }
                    </div>
                </div>

            </div>



            {/* Winner Overlay */}
            {
                winner && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
                        <div className="text-center animate-fade-in-up">
                            <div className="text-9xl mb-6 filter drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                                {winner === playerId ? '👑' : '💀'}
                            </div>
                            <h1 className={`text-6xl md:text-8xl font-black mb-2 tracking-tighter uppercase ${winner === playerId ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600' : 'text-gray-500'}`}>
                                {winner === playerId ? 'Victoria' : 'Derrota'}
                            </h1>
                            <div className="text-xl text-white/60 mb-8 font-mono tracking-widest">
                                {winner === playerId ? '+ $1000 COINS' : 'BET LOST'}
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-white text-black font-black text-lg py-4 px-12 rounded-full hover:scale-105 transition-transform hover:shadow-[0_0_30px_white]"
                            >
                                SALIR
                            </button>
                        </div>
                    </div>
                )
            }

            <ChatBox socket={socket} gameId={gameId} myPlayerId={playerId} />

            {/* Exit Confirmation Modal */}
            {
                showExitConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#2a1a10] border-2 border-[#8b5a2b] p-8 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm text-center transform scale-100 animate-in fade-in zoom-in duration-200">
                            <div className="text-4xl mb-4">⚠️</div>
                            <h3 className="text-2xl font-bold text-white mb-2 font-serif tracking-wide">¿Abandonar Partida?</h3>
                            <p className="text-amber-100/80 mb-8 text-sm leading-relaxed">
                                Si sales ahora, se te dará como <span className="text-red-500 font-black">PERDEDOR</span> de la partida.
                            </p>
                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-lg shadow-lg font-bold transition-all hover:scale-105 border border-green-500/30"
                                >
                                    Continuar
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2.5 bg-red-900/50 hover:bg-red-800 text-white rounded-lg shadow-lg font-bold transition-all hover:scale-105 border border-red-500/30"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showColorPicker && (
                    <ColorWheel
                        onSelect={handleColorSelect}
                        onCancel={() => { setShowColorPicker(false); setPendingCardIndex(null); }}
                    />
                )
            }
        </div >
    );
};
