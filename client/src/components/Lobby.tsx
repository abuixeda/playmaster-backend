
import React, { useState, useEffect } from 'react';
import { StoreModal } from './StoreModal';

import { Socket } from 'socket.io-client';

interface LobbyProps {
    onJoin: (gameId: string, playerId: string, gameType?: string) => void;
    onOpenProfile?: () => void;
    socket: Socket;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, onOpenProfile, socket }) => {
    const [showLogin, setShowLogin] = useState(false);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authUser, setAuthUser] = useState<{ username: string } | null>(() => {
        try {
            const stored = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            if (!stored || stored === "undefined" || !token) return null;
            return JSON.parse(stored);
        } catch (e) {
            console.error("Error parsing user from storage:", e);
            return null;
        }
    });

    const [playerName, setPlayerName] = useState('');
    const [gameId, setGameId] = useState('');
    const [selectedGame, setSelectedGame] = useState('TRUCO');

    const handleAuth = async () => {
        if (!authEmail || !authPass) return alert("Completa los campos");
        if (authMode === 'REGISTER' && !playerName) return alert("Ingresa un nombre de usuario");

        const endpoint = authMode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';
        const body = authMode === 'LOGIN'
            ? { emailOrUsername: authEmail, password: authPass }
            : { email: authEmail, username: playerName, password: authPass };

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

        try {
            const res = await fetch(API_URL + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setAuthUser(data.user);
                setShowLogin(false);
                // Reload to refresh socket with new token
                window.location.reload();
                alert(data.error || "Error");
            }
        } catch (_e) {
            alert("Error de conexión");
        }
    };

    const [showStore, setShowStore] = useState(false);
    const [balance, setBalance] = useState(0);
    const [betAmount, setBetAmount] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const token = localStorage.getItem('token') || '';

    // Fetch Balance
    useEffect(() => {
        if (token) {
            fetch('/api/wallet/me', { headers: { Authorization: `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data.balance !== undefined) setBalance(data.balance);
                })
                .catch(console.error);
        }
    }, [token, showStore]); // Reload balance when store closes/changes

    // Matchmaking Events
    useEffect(() => {
        socket.on("search_started", () => setIsSearching(true));
        socket.on("search_cancelled", () => setIsSearching(false));
        socket.on("match_error", (data) => {
            setIsSearching(false);
            alert("Error al unir partida: " + (data.message || "Desconocido"));
        });

        socket.on("match_found", (data: any) => {
            // Match found! Join logic
            // const myId = authUser ? (authUser as any).id : playerName; // Or socket.id?
            // If manual "guest" name, we don't know the ID assigned by server if it was guest.
            // But Matchmaking requires Auth usually? Or guest works?
            // Matchmaker works with userId.
            // If Guest, userId is "guest_SOCKETID".
            // We need to know this ID to play.

            // Ideally we derive it from token or socket?
            // Since Matchmaking requires Login (authUser check in handleFindMatch line 117),
            // we safely assume authUser.id exists.
            if (authUser) {
                onJoin(data.gameId, (authUser as any).id, data.gameType);
            }
        });

        return () => {
            socket.off("search_started");
            socket.off("search_cancelled");
            socket.off("match_error");
            socket.off("match_found");
        }
    }, [socket]);


    // Check if returned from MP
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        if (status === 'success') {
            alert("¡Pago exitoso! Tus monedas se acreditarán en breve.");
            window.history.replaceState({}, document.title, window.location.pathname);
            // Refresh logic optional here, socket push will update balance eventually? 
            // Or trigger a manual fetch if we had one.
        } else if (status === 'failure') {
            alert("El pago falló o fue cancelado.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleFindMatch = () => {
        if (!betAmount) return alert("Seleccioná un monto de apuesta");
        // Ensure auth
        if (!authUser) return alert("Debes iniciar sesión para apostar");

        socket.emit("find_match", {
            gameType: selectedGame,
            betAmount: betAmount
        });
    };

    const handleCancelSearch = () => {
        socket.emit("cancel_search");
        setIsSearching(false); // Optimistic
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthUser(null);
        window.location.reload();
    };



    const handleJoin = () => {
        const idToUse = authUser ? (authUser as any).id : playerName;
        if (!idToUse || !gameId) return alert('Ingresa nombre y ID de sala');
        onJoin(gameId.toUpperCase(), idToUse);
    }

    const handleCreate = () => {
        const idToUse = authUser ? (authUser as any).id : playerName;
        if (!idToUse) return alert('Ingresa tu nombre');

        // Generate random 6-char ID
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        onJoin(newGameId, idToUse, selectedGame);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/30 rounded-full blur-3xl"></div>
            </div>

            {/* Main Card Container */}
            <div className="z-10 bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-md md:max-w-4xl relative transition-all duration-300">

                {/* Auth Check - Hide on Desktop (Sidebar handles it) */}
                <div className="absolute top-4 right-4 md:hidden">
                    {authUser ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-yellow-500/30 shadow-inner">
                                <span className="text-xl">🪙</span>
                                <span className="text-yellow-400 font-bold font-mono text-lg">{balance.toLocaleString()}</span>
                                <button
                                    onClick={() => setShowStore(true)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg border border-green-400 transform hover:scale-105 transition-all"
                                >
                                    AGREGAR
                                </button>
                            </div>

                            <button
                                onClick={onOpenProfile}
                                className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-gray-500 shadow-lg"
                            >
                                👤 PERFIL
                            </button>

                            <div className="text-right">
                                <span className="block text-xs font-bold text-green-400 leading-none">{authUser.username}</span>
                                <button onClick={handleLogout} className="text-[10px] text-slate-400 hover:text-white underline leading-none">Salir</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowLogin(true)}
                            className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full font-bold shadow-lg"
                        >
                            Ingresar
                        </button>
                    )}
                </div>

                {/* Title Section */}
                <div className="text-center mb-8 mt-4 md:text-left md:mb-12">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 inline-block">
                        PlayMaster
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 hidden md:block">Seleccioná tu juego y empezá a ganar.</p>
                </div>

                {showLogin ? (
                    <div className="space-y-4 max-w-sm mx-auto">
                        <div className="flex gap-2 justify-center mb-4">
                            <button onClick={() => setAuthMode('LOGIN')} className={`px-4 py-1 rounded-full ${authMode === 'LOGIN' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>Login</button>
                            <button onClick={() => setAuthMode('REGISTER')} className={`px-4 py-1 rounded-full ${authMode === 'REGISTER' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>Registro</button>
                        </div>

                        {authMode === 'REGISTER' && (
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Usuario</label>
                                <input className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Email / Usuario</label>
                            <input className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
                            <input type="password" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" value={authPass} onChange={e => setAuthPass(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowLogin(false)} className="w-full bg-slate-700 py-2 rounded text-slate-300">Cancelar</button>
                            <button onClick={handleAuth} className="w-full bg-blue-600 py-2 rounded text-white font-bold">Confirmar</button>
                        </div>
                    </div>
                ) : (
                    /* Desktop Grid Layout */
                    <div className="flex flex-col md:grid md:grid-cols-2 md:gap-12">

                        {/* LEFT COL: Game Selection */}
                        <div className="space-y-6">
                            {!authUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tu Nombre (Invitado)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="Ej. El Mas Capito"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider text-xs">Juegos Disponibles</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSelectedGame('TRUCO')}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 aspect-square ${selectedGame === 'TRUCO' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40 scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}`}
                                    >
                                        <span className="text-4xl">🃏</span>
                                        <span className="font-bold">Truco</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedGame('CHESS')}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 aspect-square ${selectedGame === 'CHESS' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40 scale-105' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}`}
                                    >
                                        <span className="text-4xl">♟️</span>
                                        <span className="font-bold">Ajedrez</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedGame('RPS')}
                                        className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 aspect-square ${selectedGame === 'RPS'
                                            ? 'border-purple-500 bg-purple-500/20 text-white shadow-lg shadow-purple-900/40 scale-105'
                                            : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        <span className="text-4xl">✂️</span>
                                        <span className="font-bold">PPT</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COL: Actions */}
                        <div className="flex flex-col justify-between">

                            <div className="relative md:hidden my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-slate-900/0 text-slate-400 backdrop-blur-sm">Opciones de Sala</span>
                                </div>
                            </div>

                            {/* Desktop Divider */}
                            <div className="hidden md:block mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider text-xs">Configuración de Partida</label>
                            </div>

                            {!isSearching ? (
                                <div className="space-y-6 flex-1 flex flex-col">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Monto de la Apuesta</label>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            {[100, 500, 1000].map(amount => (
                                                <button
                                                    key={amount}
                                                    onClick={() => setBetAmount(amount)}
                                                    className={`py-2 rounded-lg font-bold border transition-all ${betAmount === amount
                                                        ? 'bg-yellow-600 border-yellow-400 text-white'
                                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-yellow-500/50'
                                                        }`}
                                                >
                                                    ${amount}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-500">$</span>
                                            <input
                                                type="number"
                                                placeholder="Otro monto..."
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-6 pr-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                                                onChange={(e) => setBetAmount(Number(e.target.value))}
                                                value={betAmount || ''}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-auto">
                                        <button
                                            onClick={handleFindMatch}
                                            disabled={!betAmount}
                                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all flex items-center justify-center gap-2 ${betAmount
                                                ? 'bg-gradient-to-r from-green-500 to-green-700 hover:scale-105 text-white shadow-green-900/50'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                }`}
                                        >
                                            <span>🔍</span> BUSCAR PARTIDA
                                        </button>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 my-2">
                                            <div className="h-px bg-slate-700 flex-1"></div>
                                            <span>O con amigos</span>
                                            <div className="h-px bg-slate-700 flex-1"></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={handleCreate}
                                                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold py-3 rounded-xl transition-all text-sm"
                                            >
                                                CREAR PRIVADA
                                            </button>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-800/50 border border-slate-600 rounded-l-xl px-2 py-2 text-white placeholder-slate-500 text-center uppercase font-mono text-sm"
                                                    placeholder="CÓDIGO"
                                                    value={gameId}
                                                    onChange={(e) => setGameId(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleJoin}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-r-xl text-sm"
                                                >
                                                    Unirse
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 space-y-6 animate-pulse flex flex-col items-center justify-center h-full bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
                                    <div className="text-6xl animate-bounce">🔍</div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Buscando Rival...</h2>
                                        <p className="text-slate-400 mt-2">Apuesta: <span className="text-yellow-400 font-mono">${betAmount}</span></p>
                                        <p className="text-xs text-slate-500 mt-1">Juego: {selectedGame}</p>
                                    </div>
                                    <button
                                        onClick={handleCancelSearch}
                                        className="text-red-400 underline hover:text-red-300 text-sm mt-4 cursor-pointer z-20"
                                    >
                                        Cancelar Búsqueda
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                <div className="mt-8 text-center text-xs text-slate-500">
                    PlayMaster Engine v1.0 • Powered by TrucoLogic
                </div>
            </div>
            {/* Store Modal */}
            {showStore && (
                <StoreModal
                    token={token}
                    onClose={() => setShowStore(false)}
                />
            )}
        </div>
    );
};
