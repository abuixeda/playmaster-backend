import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { AuthWizard } from '../auth/AuthWizard';
import { Play, Swords, Gamepad2, Plus, Crown, TrendingUp } from 'lucide-react';
import thumbTruco from '../../assets/thumb_truco.png';
import thumbChess from '../../assets/thumb_chess.png';
import thumbRPS from '../../assets/thumb_rps_real.png';
import thumbConnect4 from '../../assets/thumb_connect4.png';
import thumbRandom from '../../assets/thumb_random.png';

interface GameHubProps {
    onJoin: (gameId: string, playerId: string, gameType?: string, options?: any) => void;
    socket: Socket;
}

export function GameHub({ onJoin, socket }: GameHubProps) {
    // Auth User State
    const [authUser] = useState<{ username: string, id?: string } | null>(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) return JSON.parse(stored);
        } catch { }
        return null;
    });

    // Wallet State
    const [balance, setBalance] = useState<number>(0);

    // Game Selection State
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [betAmount, setBetAmount] = useState<number>(100);
    const [isCustomBet, setIsCustomBet] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState<number>(2);

    // Truco Options
    const [trucoPoints, setTrucoPoints] = useState<15 | 30>(30);
    const [trucoFlor, setTrucoFlor] = useState<boolean>(true);

    // Private Game State
    const [gameIdInput, setGameIdInput] = useState('');

    const handleJoin = () => {
        const idToUse = authUser?.id || (socket.id ? `guest_${socket.id.substring(0, 5)}` : 'guest');
        if (!gameIdInput) return alert('Ingressa el ID de la sala');
        const maxPlayers = selectedGame === 'EL_UNICO' ? selectedPlayers : undefined;
        onJoin(gameIdInput.toUpperCase(), idToUse, selectedGame || 'TRUCO', { maxPlayers });
    };

    const handleCreate = () => {
        const idToUse = authUser?.id || (socket.id ? `guest_${socket.id.substring(0, 5)}` : 'guest');
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const maxPlayers = selectedGame === 'EL_UNICO' ? selectedPlayers : undefined;
        onJoin(newGameId, idToUse, selectedGame || 'TRUCO', { maxPlayers });
    };

    // Fetch Balance on Mount
    useEffect(() => {
        const fetchBalance = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const API_URL = import.meta.env.VITE_API_URL || '';
                const res = await fetch(`${API_URL}/api/wallet/me`, { headers: { Authorization: `Bearer ${token}` } });

                if (res.status === 401) {
                    console.warn("Token expired/invalid. Logging out.");
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                    return;
                }

                const data = await res.json();
                if (data.balance !== undefined) setBalance(data.balance);
            } catch (e) { console.error("Wallet fetch error", e); }
        };
        fetchBalance();
    }, []);

    // -- Auth State --
    const [showLogin, setShowLogin] = useState(false);
    const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [authEmail, setAuthEmail] = useState('');
    const [authPass, setAuthPass] = useState('');
    const [authName] = useState('');

    const handleAuth = async () => {
        if (!authEmail || !authPass) return alert("Completa los campos");
        if (authMode === 'REGISTER' && !authName) return alert("Ingresa un nombre de usuario");

        // Use Vite Env Var or fallback
        const API_URL = import.meta.env.VITE_API_URL || '';
        const endpoint = authMode === 'LOGIN' ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
        const body = authMode === 'LOGIN'
            ? { emailOrUsername: authEmail, password: authPass }
            : { email: authEmail, username: authName, password: authPass };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.reload();
            } else {
                alert(data.error || "Error de autenticación");
            }
        } catch (e) {
            alert("Error de conexión");
        }
    };

    // -- Matchmaking Logic (Ported) --
    useEffect(() => {
        socket.on("search_started", () => setIsSearching(true));
        socket.on("search_cancelled", () => setIsSearching(false));
        socket.on("match_error", (data) => {
            setIsSearching(false);
            alert(data.message || "Error al buscar partida");
        });
        socket.on("match_found", (data) => {
            // Allow join even if no authUser
            if (authUser) {
                onJoin(data.gameId, authUser.id!, data.gameType);
            } else {
                onJoin(data.gameId, "guest_player", data.gameType);
            }
        });

        return () => {
            socket.off("search_started");
            socket.off("search_cancelled");
            socket.off("match_error");
            socket.off("match_found");
        };
    }, [socket, authUser, onJoin]);

    const handlePlayParams = (gameType: string) => {
        setSelectedGame(gameType);
        setSelectedPlayers(2); // Reset to default
    };

    const confirmSearch = () => {
        if (!selectedGame) return;

        // Auth check for betting
        if (betAmount > 0 && !authUser) {
            alert("Debes iniciar sesión para apostar dinero real. Juega por $0 o crea una sala privada.");
            return;
        }

        // Handle Random Game Selection
        let gameToSearch = selectedGame;
        if (selectedGame === 'RANDOM') {
            const activeGames = ['TRUCO', 'CHESS', 'RPS'];
            gameToSearch = activeGames[Math.floor(Math.random() * activeGames.length)];
        }


        const maxPlayers = gameToSearch === 'EL_UNICO' ? selectedPlayers : undefined;

        // Prepare options
        const options: any = { maxPlayers };
        if (gameToSearch === 'TRUCO') {
            options.targetScore = trucoPoints;
            options.withFlor = trucoFlor;
        }

        socket.emit("find_match", {
            gameType: gameToSearch,
            betAmount: betAmount,
            options: options
        });
    };

    const games = [
        { id: 'TRUCO', name: 'Truco', subtitle: 'ARGENTINO', image: thumbTruco, active: true },
        { id: 'CHESS', name: 'Ajedrez', subtitle: 'TÁCTICO', image: thumbChess, active: true },
        { id: 'CONNECT4', name: '4 en Línea', subtitle: 'CLÁSICO', image: thumbConnect4, active: true },
        { id: 'EL_UNICO', name: 'El Único', subtitle: 'CARTAS', image: '/el_unico_cover.png', active: true },
        { id: 'RPS', name: 'Piedra', subtitle: 'PAPEL TIJERA', image: thumbRPS, active: true },
        { id: 'RANDOM', name: 'Aleatorio', subtitle: 'SORPRESA', image: thumbRandom, active: true },
    ];

    if (selectedGame && isSearching) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-[--color-surface-glass] p-8 rounded-full border border-[--color-surface-glass-border]">
                        {/* Show Mystery Icon if random, else specific game icon */}
                        {selectedGame === 'RANDOM' ? (
                            <Gamepad2 size={48} className="text-[--color-primary] animate-bounce" />
                        ) : (
                            <Swords size={48} className="text-[--color-primary] animate-spin-slow" />
                        )}
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">
                        {selectedGame === 'RANDOM' ? 'Tirando los dados...' : 'Buscando Rival...'}
                    </h2>
                    <p className="text-purple-200/60 mt-2">
                        {games.find(g => g.id === selectedGame)?.name} • {betAmount === 0 ? 'GRATIS' : `$${betAmount}`}
                    </p>
                </div>
                <button
                    onClick={() => { socket.emit("cancel_search"); setIsSearching(false); }}
                    className="text-red-400 text-sm hover:text-red-300 transition-colors"
                >
                    Cancelar Búsqueda
                </button>
            </div>
        )
    }

    if (selectedGame && !isSearching) {
        // Bet Selection View
        const gameInfo = games.find(g => g.id === selectedGame);
        return (
            <div className="flex flex-col h-full animate-fade-in relative z-10">
                <button onClick={() => setSelectedGame(null)} className="text-sm text-purple-300 mb-4 flex items-center gap-1 w-fit">
                    ← Volver
                </button>

                {/* Header Image */}
                <div className="w-full h-32 rounded-2xl overflow-hidden mb-6 relative shadow-lg">
                    {gameInfo?.image && <img src={gameInfo.image} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                        <h2 className="text-2xl font-bold text-white shadow-black drop-shadow-md">{gameInfo?.name}</h2>
                    </div>
                </div>

                {/* Truco Options */}
                {
                    selectedGame === 'TRUCO' && (
                        <div className="mb-6 bg-[--color-surface-glass] p-4 rounded-2xl border border-[--color-surface-glass-border]">
                            <h3 className="text-center text-purple-200/80 font-bold text-sm mb-4 border-b border-white/5 pb-2 mx-4 uppercase tracking-wider">Ajustes de Partida</h3>

                            <div className="flex flex-col gap-4">
                                {/* Flor Option */}
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-sm font-bold w-20">Flor</span>
                                    <div className="flex-1 flex bg-black/40 rounded-xl p-1 border border-white/5 relative">
                                        <button
                                            onClick={() => setTrucoFlor(true)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${trucoFlor
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            CON FLOR
                                        </button>
                                        <button
                                            onClick={() => setTrucoFlor(false)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!trucoFlor
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            SIN FLOR
                                        </button>
                                    </div>
                                    <div className="w-8 ml-2 flex justify-center">
                                        <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-gray-400 text-[10px] font-bold cursor-help hover:bg-white/10 hover:text-white transition-colors" title="Con Flor: Se puede cantar flor si tienes 3 cartas del mismo palo">?</div>
                                    </div>
                                </div>

                                {/* Points Option */}
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-sm font-bold w-20">Puntos</span>
                                    <div className="flex-1 flex bg-black/40 rounded-xl p-1 border border-white/5 relative">
                                        <button
                                            onClick={() => setTrucoPoints(15)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${trucoPoints === 15
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            A 15
                                        </button>
                                        <button
                                            onClick={() => setTrucoPoints(30)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${trucoPoints === 30
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            A 30
                                        </button>
                                    </div>
                                    <div className="w-8 ml-2 flex justify-center">
                                        <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-gray-400 text-[10px] font-bold cursor-help hover:bg-white/10 hover:text-white transition-colors" title="Puntos para ganar la partida">?</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* EL UNICO Player Count Selection */}
                {
                    selectedGame === 'EL_UNICO' && (
                        <div className="mb-6">
                            <p className="text-purple-200/60 mb-2 text-sm">Modo de Juego</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedPlayers(2)}
                                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedPlayers === 2
                                        ? 'bg-yellow-600 border-yellow-400 text-white shadow-lg'
                                        : 'bg-[--color-surface-glass] border-[--color-surface-glass-border] text-purple-200/60 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-xl">⚔️</span>
                                    <span className="font-bold text-sm">Duelo (1v1)</span>
                                </button>
                                <button
                                    onClick={() => setSelectedPlayers(6)}
                                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${selectedPlayers === 6
                                        ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                                        : 'bg-[--color-surface-glass] border-[--color-surface-glass-border] text-purple-200/60 hover:bg-white/5'
                                        }`}
                                >
                                    <span className="text-xl">👥</span>
                                    <span className="font-bold text-sm">Multijugador (3-6)</span>
                                </button>
                            </div>
                        </div>
                    )
                }

                <p className="text-purple-200/60 mb-6 text-sm">Seleccioná el monto de la apuesta</p>

                <div className="grid grid-cols-2 gap-3 mb-8">

                    {[100, 500, 1000, 2000].map(amt => (
                        <button
                            key={amt}
                            onClick={() => { setBetAmount(amt); setIsCustomBet(false); }}
                            className={`p-4 rounded-xl border transition-all ${betAmount === amt && !isCustomBet
                                ? 'bg-[--color-primary] border-transparent text-white shadow-lg shadow-purple-600/30'
                                : 'bg-[--color-surface-glass] border-[--color-surface-glass-border] hover:bg-white/5'
                                }`}
                        >
                            <span className="block text-[10px] text-purple-200/80 mb-1 uppercase tracking-wider">Entrada</span>
                            <span className="text-xl font-bold font-mono">${amt}</span>
                        </button>
                    ))}

                    {/* Custom Bet Button */}
                    <div className="col-span-2 mt-2">
                        {!isCustomBet ? (
                            <button
                                onClick={() => setIsCustomBet(true)}
                                className="w-full p-3 rounded-xl border border-[--color-surface-glass-border] bg-white/5 hover:bg-white/10 text-purple-200 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Plus size={16} />
                                Apuesta Personalizada
                            </button>
                        ) : (
                            <div className="flex gap-2 animate-fade-in">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        className="w-full bg-black/40 border border-[--color-primary] rounded-xl py-3 pl-8 pr-4 text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[--color-primary]"
                                        placeholder="Monto"
                                        onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                    />
                                </div>
                                <button
                                    onClick={() => setIsCustomBet(false)}
                                    className="px-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold"
                                >
                                    OK
                                </button>
                            </div>
                        )}
                    </div>
                </div>



                <div className="mt-auto">
                    <button
                        onClick={confirmSearch}
                        className="w-full py-4 bg-gradient-to-r from-[--color-primary] to-purple-600 rounded-2xl font-bold text-lg shadow-xl shadow-purple-900/40 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        <Play fill="currentColor" size={20} />
                        JUGAR AHORA
                    </button>
                </div>

                <div className="mt-6 border-t border-white/10 pt-4">
                    <h3 className="text-white font-bold mb-3 text-sm">Sala Privada (Jugar con Amigos)</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleCreate}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg shadow-purple-900/40"
                        >
                            CREAR SALA
                        </button>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-l-xl px-2 py-2 text-white placeholder-slate-500 text-center uppercase font-mono text-sm focus:outline-none focus:border-purple-500"
                                placeholder="CÓDIGO"
                                value={gameIdInput}
                                onChange={(e) => setGameIdInput(e.target.value)}
                            />
                            <button
                                onClick={handleJoin}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-r-xl text-sm border-l border-slate-600"
                            >
                                Unirse
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in pt-4 pb-20 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">
                        PlayMaster
                    </h1>
                    <p className="text-purple-200/60 text-xs">
                        {authUser ? `Hola, ${authUser.username}` : 'Invitado'}
                    </p>
                    {!authUser && (
                        <button
                            onClick={() => setShowLogin(true)}
                            className="text-[10px] text-blue-400 font-bold hover:underline mt-1"
                        >
                            INGRESAR
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Wallet Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
                        <span className="text-yellow-400 text-xs">🪙</span>
                        <span className="font-mono font-bold text-sm text-white">${balance.toLocaleString()}</span>
                        {authUser && (
                            <>
                                <div className="w-[1px] h-3 bg-white/20 mx-1"></div>
                                <Plus size={14} className="text-green-400 cursor-pointer hover:text-green-300" />
                            </>
                        )}
                    </div>

                    {/* Avatar - Clickable for Login if Guest */}
                    <div
                        onClick={() => !authUser && setShowLogin(true)}
                        className={`w-9 h-9 rounded-full p-[1px] ${authUser ? 'bg-gradient-to-br from-purple-500 to-blue-600' : 'bg-gray-600 cursor-pointer hover:scale-105 transition-transform'}`}
                    >
                        <div className="w-full h-full rounded-full bg-[--color-page] flex items-center justify-center text-xs font-bold">
                            {authUser?.username?.[0]?.toUpperCase() || 'G'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Modal / Auth Wizard */}
            {showLogin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    {authMode === 'REGISTER' ? (
                        <AuthWizard
                            onClose={() => setShowLogin(false)}
                            onLoginSuccess={() => {
                                setShowLogin(false);
                                window.location.reload();
                            }}
                        />
                    ) : (
                        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-4 text-center">
                                Iniciar Sesión
                            </h2>

                            <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setAuthMode('LOGIN')}
                                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${authMode === 'LOGIN' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => setAuthMode('REGISTER')}
                                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors text-slate-400 hover:text-white`}
                                >
                                    Registro
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Email o Usuario</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none"
                                        value={authEmail}
                                        onChange={e => setAuthEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Contraseña</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none"
                                        value={authPass}
                                        onChange={e => setAuthPass(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowLogin(false)}
                                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold hover:bg-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAuth}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:scale-[1.02] transition-transform"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Featured Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base text-white">Juegos Destacados</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {games.map(game => (
                        <div
                            key={game.id}
                            onClick={() => game.active && handlePlayParams(game.id)}
                            className={`relative aspect-[3/4] md:aspect-[4/5] rounded-2xl overflow-hidden cursor-pointer group shadow-lg transition-transform active:scale-95 hover:scale-[1.02] ${!game.active ? 'grayscale opacity-60' : ''}`}
                        >
                            {game.image ? (
                                <img src={game.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                    <Gamepad2 size={32} className="text-gray-600" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 w-full p-3">
                                <h4 className="text-lg font-bold text-white leading-tight shadow-black drop-shadow-md">{game.name}</h4>
                                <p className="text-[10px] text-gray-300 uppercase tracking-wider">{game.subtitle}</p>
                                {game.active && <div className="mt-2 flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] text-green-300 font-medium">Online</span>
                                </div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Players */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base text-white flex items-center gap-2">
                        <Crown size={16} className="text-yellow-400" />
                        Ranking Semanal
                    </h3>
                    <TrendingUp size={16} className="text-purple-300/50" />
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-end justify-center gap-2 mb-4">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-slate-300 mb-1"></div>
                            <div className="h-8 w-8 bg-slate-700/50 rounded-t-lg flex items-center justify-center text-xs font-bold text-slate-300">2</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <Crown size={12} className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400" fill="currentColor" />
                                <div className="w-10 h-10 rounded-full bg-yellow-500 border-2 border-yellow-300 mb-1"></div>
                            </div>
                            <div className="h-12 w-10 bg-yellow-600/20 border-t border-yellow-500/30 rounded-t-lg flex items-center justify-center text-sm font-bold text-yellow-500">1</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-orange-700 border-2 border-orange-600 mb-1"></div>
                            <div className="h-6 w-8 bg-orange-900/40 rounded-t-lg flex items-center justify-center text-xs font-bold text-orange-400">3</div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-purple-200/60 mb-2">Compite por premios semanales</p>
                        <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-purple-200 transition-colors">
                            Ver Tabla Completa
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
