
import { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { Filter, ArrowUpDown, Dices, Layers, Trophy, Scissors, User } from 'lucide-react';
import { ConfirmModal } from './ui/ConfirmModal';


// Tipos básicos para Room
interface GameOffer {
    id: string;
    typeCode: string;
    betAmount: number;
    createdAt: string;
    creator?: {
        id: string;
        username: string;
        avatarUrl?: string | null;
        elo?: number;
    };
}

interface RoomsProps {
    onOpenProfile: (userId: string) => void;
    onJoinGame: (gameId: string, gameType: string, betAmount: number) => void;
}

export default function Rooms({ onOpenProfile, onJoinGame }: RoomsProps) {
    const [offers, setOffers] = useState<GameOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    // Create Modal State
    const [showCreate, setShowCreate] = useState(false);
    const [createGameType, setCreateGameType] = useState('TRUCO');
    const [createBet, setCreateBet] = useState(100);
    const [createMaxPlayers, setCreateMaxPlayers] = useState(2);
    const [isCreating, setIsCreating] = useState(false);

    // Filter & Sort State
    const [filterGame, setFilterGame] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | null>(null);

    // Fetch offers
    const fetchOffers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/games/offers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error cargando salas');
            const data = await res.json();
            setOffers(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOffers();
        // Poll every 5 seconds to keep offers fresh
        const interval = setInterval(fetchOffers, 5000);
        return () => clearInterval(interval);
    }, []);

    // Confirm Modal State
    const [pendingJoin, setPendingJoin] = useState<{ id: string, type: string, bet: number } | null>(null);

    // Initial Join Request - Opens Modal
    const handleJoinClick = (gameId: string, typeCode: string, bet: number) => {
        setPendingJoin({ id: gameId, type: typeCode, bet });
    };

    // Actual Join Execution
    const confirmJoin = async () => {
        if (!pendingJoin) return;

        const { id, type, bet } = pendingJoin;
        setJoiningId(id);
        setPendingJoin(null); // Close modal immediately or keep? usually close.

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/games/${id}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'No se pudo unir a la sala');
            } else {
                // Success! Immediately trigger Join
                console.log("[Rooms] Returning join success:", id, type, bet);
                onJoinGame(id, type, bet);
            }
        } catch (err) {
            console.error(err);
            alert('Error al conectar');
        } finally {
            setJoiningId(null);
        }
    };

    // Handle Create
    const handleCreateRoom = async () => {
        setIsCreating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/games`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    typeCode: createGameType,
                    betAmount: createBet,
                    options: { maxPlayers: createMaxPlayers }
                })
            });
            const data = await res.json();
            if (res.ok) {
                setShowCreate(false);
                alert('¡Sala creada!');
                fetchOffers();
            } else {
                alert(data.error || 'Error al crear sala');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        } finally {
            setIsCreating(false);
        }
    };

    const fmtGame = (code: string) => {
        if (code === 'ROCK_PAPER_SCISSORS') return 'Piedra Papel Tijera';
        return code.charAt(0) + code.slice(1).toLowerCase();
    }

    const getGameIcon = (code: string) => {
        if (code === 'TRUCO') return '🃏';
        if (code === 'CHESS') return '♟️';
        if (code === 'UNO') return '🌈';
        if (code === 'POOL') return '🎱';
        if (code === 'ROCK_PAPER_SCISSORS') return '✂️';
        return '🎮';
    }

    // --- Filter Logic ---
    const filteredOffers = offers
        .filter(o => !filterGame || o.typeCode === filterGame)
        .sort((a, b) => {
            if (!sortOrder) return 0;
            return sortOrder === 'ASC' ? a.betAmount - b.betAmount : b.betAmount - a.betAmount;
        });

    if (loading && offers.length === 0) return <div className="p-8 text-center text-slate-500">Cargando salas...</div>;

    return (
        <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
            {/* Confirm Join Modal */}
            <ConfirmModal
                isOpen={!!pendingJoin}
                message={`¿Unirse a esta sala de ${fmtGame(pendingJoin?.type || '')} por $${pendingJoin?.bet}?`}
                onConfirm={confirmJoin}
                onCancel={() => setPendingJoin(null)}
                confirmText="Unirse"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase">Salas de Juego</h2>
                    <p className="text-slate-400 text-xs">Únete a partidas con apuestas personalizadas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/50"
                    >
                        <span>⊕</span> CREAR SALA
                    </button>
                    <button
                        onClick={fetchOffers}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                        title="Actualizar"
                    >
                        ↻
                    </button>
                </div>
            </div>

            {/* Filter & Sort Toolbar */}
            <div className="flex flex-wrap gap-4 items-center mb-2">
                {/* Game Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 max-w-full md:max-w-xl">
                    <button
                        onClick={() => setFilterGame(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${!filterGame ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Todo
                    </button>
                    {['TRUCO', 'CHESS', 'UNO', 'POOL', 'ROCK_PAPER_SCISSORS'].map(g => (
                        <button
                            key={g}
                            onClick={() => setFilterGame(filterGame === g ? null : g)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filterGame === g ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                        >
                            <span>{getGameIcon(g)}</span>
                            {fmtGame(g)}
                        </button>
                    ))}
                </div>

                {/* Sort Button */}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (!sortOrder) setSortOrder('DESC');
                            else if (sortOrder === 'DESC') setSortOrder('ASC');
                            else setSortOrder(null);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${sortOrder ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-white/5 text-slate-400 border border-transparent hover:bg-white/10'}`}
                    >
                        <ArrowUpDown size={14} className={sortOrder ? 'text-yellow-400' : 'text-slate-500'} />
                        {sortOrder === 'ASC' ? 'Menor Apuesta' : sortOrder === 'DESC' ? 'Mayor Apuesta' : 'Ordenar'}
                    </button>
                </div>
            </div>

            {/* Create Room Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1f1033] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in relative">
                        <h2 className="text-xl font-bold text-white mb-4 text-center">Crear Sala de Apuesta</h2>

                        {/* Game Selector */}
                        <div className="mb-4">
                            <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Juego</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['TRUCO', 'CHESS', 'UNO', 'POOL', 'ROCK_PAPER_SCISSORS'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setCreateGameType(g)}
                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${createGameType === g ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}
                                    >
                                        <span className="text-xl">{getGameIcon(g)}</span>
                                        <span className="text-[9px] font-bold">{fmtGame(g)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bet Input */}
                        <div className="mb-6">
                            <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Apuesta ($)</label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {[100, 500, 1000, 5000].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setCreateBet(amt)}
                                        className={`py-1 rounded text-xs font-bold ${createBet === amt ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-300'}`}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>

                            <input
                                type="number"
                                value={createBet}
                                onChange={e => setCreateBet(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white font-mono text-center font-bold focus:border-purple-500 outline-none"
                            />
                        </div>

                        {/* Players Selector (Conditional) */}
                        {['UNO', 'TRUCO', 'POOL'].includes(createGameType) && (
                            <div className="mb-6">
                                <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Jugadores</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[2, 4, 6].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setCreateMaxPlayers(p)}
                                            disabled={(createGameType === 'POOL' && p !== 2)}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all ${createMaxPlayers === p
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                } ${((createGameType === 'POOL' && p !== 2)) ? 'opacity-20 cursor-not-allowed hidden' : ''}`}
                                        >
                                            {p} Jugadores
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}


                        {/* Actions */}
                        <div className="flex gap-3">
                            <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-bold hover:bg-slate-700">Cancelar</button>
                            <button onClick={handleCreateRoom} disabled={!createGameType || isCreating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50">
                                {isCreating ? 'Creando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div className="text-red-400 bg-red-900/20 p-4 rounded-xl text-sm border border-red-500/20">{error}</div>}

            {/* Grid */}
            {filteredOffers.length === 0 ? (
                <div className="text-center py-12 bg-[#1a1b2e] rounded-2xl border border-white/5 mx-auto max-w-md">
                    <div className="text-4xl mb-4">📭</div>
                    <h3 className="text-white font-bold mb-2">No se encontraron salas</h3>
                    <p className="text-slate-400 text-sm mb-4">Prueba cambiando los filtros o crea una nueva.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold text-sm shadow-lg shadow-purple-900/40 transition-transform active:scale-95"
                    >
                        Crear Sala
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOffers.map(offer => (
                        <div key={offer.id} className="bg-[#251540] border border-white/5 rounded-2xl p-4 relative overflow-hidden group hover:border-yellow-500/30 transition-all shadow-lg">
                            {/* BG Decor */}
                            <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 pointer-events-none grayscale group-hover:grayscale-0 transition-all duration-500">
                                {getGameIcon(offer.typeCode)}
                            </div>

                            <div className="relative z-10 flex flex-col gap-4">
                                {/* Top Row: Game & Bet */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                            {getGameIcon(offer.typeCode)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white leading-tight">{fmtGame(offer.typeCode)}</h3>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">1 vs 1</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">Apuesta</div>
                                        <div className="text-xl font-black text-green-400">${offer.betAmount}</div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-white/5 w-full"></div>

                                {/* Creator Info */}
                                <div className="flex items-center justify-between">
                                    <div
                                        onClick={() => offer.creator && onOpenProfile(offer.creator.id)}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 -ml-1 rounded-lg transition-colors pr-2"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-white/10">
                                            {offer.creator?.avatarUrl ? (
                                                <img src={offer.creator.avatarUrl} alt={offer.creator.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs bg-gradient-to-br from-indigo-500 to-purple-600">
                                                    {offer.creator?.username?.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-300 font-bold max-w-[100px] truncate">{offer.creator?.username || 'Anónimo'}</span>
                                            {offer.creator?.elo && <span className="text-[10px] text-yellow-500 font-bold">★ {offer.creator.elo}</span>}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleJoinClick(offer.id, offer.typeCode, offer.betAmount)}
                                        disabled={joiningId === offer.id}
                                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black rounded-lg shadow-lg hover:shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {joiningId === offer.id ? 'UNIENDO...' : 'UNIRSE'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
