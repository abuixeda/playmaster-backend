import { useEffect, useState } from 'react';

interface ProfileProps {
    onBack: () => void;
    onAdmin?: () => void;
}

interface UserProfile {
    id: string;
    username: string;
    role?: string; // Add role
    email: string; // Private
    avatarUrl?: string;
    bio?: string;
    country?: string;
    elo: number;
    wallet?: { balance: number }; // Private
    history?: {
        id: string;
        gameType: string;
        date: string;
        status: string;
        outcome: 'WIN' | 'LOSS' | 'DRAW';
        pnl: number;
        score: number;
        opponentName: string;
    }[];
}

interface ProfitMetrics {
    netEarnings: number;
    totalWagered: number;
    totalWon: number;
}

export const Profile: React.FC<ProfileProps> = ({ onBack, onAdmin }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [profit, setProfit] = useState<ProfitMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    // Edit Form State
    const [avatarUrl, setAvatarUrl] = useState('');
    const [bio, setBio] = useState('');
    const [country, setCountry] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError("No has iniciado sesión.");
                setLoading(false);
                return;
            }

            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Profile
            const resUser = await fetch('/api/users/me', { headers });

            if (resUser.status === 401) {
                setError("Tu sesión ha expirado. Por favor, re-ingresa.");
                localStorage.removeItem('token'); // cleanup
                setLoading(false);
                return;
            }

            if (!resUser.ok) {
                const errData = await resUser.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${resUser.status}: ${resUser.statusText}`);
            }

            const userData = await resUser.json();

            // Fetch Profit
            const resProfit = await fetch('/api/users/me/profit', { headers });
            const profitData = await resProfit.json().catch(() => null); // Optional

            console.log("Profile Data Loaded:", userData);
            setUser(userData);
            setAvatarUrl(userData.avatarUrl || '');
            setBio(userData.bio || '');
            setCountry(userData.country || '');
            if (resProfit && resProfit.ok !== false) setProfit(profitData);

        } catch (e: any) {
            console.error("Failed to load profile", e);
            setError(e.message || "Error de conexión al cargar perfil.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ avatarUrl, bio, country })
            });
            if (res.ok) {
                const updated = await res.json();
                setUser({ ...user!, ...updated });
                setEditMode(false);
            }
        } catch (e) {
            alert("Error saving profile");
        }
    };

    if (loading) return <div className="text-white p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>;

    if (error || !user) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-black/40 rounded-3xl backdrop-blur-md mx-4 mt-10 border border-white/10">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
            <p className="text-purple-200/60 mb-6">{error || "No se pudo cargar la información del perfil."}</p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={onBack} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-bold transition-colors w-full">
                    Volver
                </button>
                <button onClick={() => { localStorage.clear(); onBack(); }} className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:scale-105 rounded-full text-white font-bold transition-transform shadow-lg w-full">
                    Cerrar Sesión y Volver
                </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 font-mono">Debug: {localStorage.getItem('token') ? 'Token Present' : 'No Token'}</p>
        </div>
    );

    // Helper for currency
    const fmtMoney = (n: number) => `$${n.toLocaleString()}`;

    // Helper for Game Types
    const fmtGameType = (type: string) => {
        const map: Record<string, string> = {
            'TRUCO': 'Truco Argentino',
            'CHESS': 'Ajedrez',
            'RPS': 'Piedra, Papel, Tijera',
            'POOL': 'Pool 8-Ball'
        };
        return map[type] || type;
    };

    return (
        <div className="flex flex-col items-center min-h-screen pt-10 text-white w-full max-w-4xl mx-auto p-4">

            {/* Header / Back */}
            <div className="w-full relative flex items-center justify-center mb-6">
                <button
                    onClick={onBack}
                    className="absolute left-0 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-600">
                    Mi Perfil
                </h1>
            </div>

            {/* Main Content - Transparent on mobile to show BG */}
            <div className="w-full bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl p-6 shadow-xl">

                {/* Top Section: Avatar & Info */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full border-2 border-yellow-500/50 p-1 bg-black/30 shadow-lg">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl">👤</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white leading-none mb-2">{user.username}</h2>

                        {!editMode ? (
                            <div className="flex flex-col items-center gap-1">
                                <span className="px-3 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {user.elo} ELO
                                </span>
                                <p className="text-purple-200/60 text-sm mt-1">{user.bio || "Sin descripción"}</p>
                                <p className="text-purple-200/40 text-xs">📍 {user.country || "Mundo"}</p>
                                <button onClick={() => setEditMode(true)} className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                                    Editar
                                </button>
                                {user.role === 'ADMIN' && onAdmin && (
                                    <button onClick={onAdmin} className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-bold border border-purple-500/30 px-3 py-1 rounded-full bg-purple-500/10">
                                        ⚡ Panel Admin
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 w-full max-w-xs mt-2 mx-auto">
                                <input
                                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs"
                                    placeholder="URL de Avatar"
                                    value={avatarUrl}
                                    onChange={e => setAvatarUrl(e.target.value)}
                                />
                                <input
                                    className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs"
                                    placeholder="Bio corta"
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                />
                                <div className="flex gap-2 justify-center">
                                    <button onClick={handleSave} className="text-green-400 text-xs font-bold">Guardar</button>
                                    <button onClick={() => setEditMode(false)} className="text-red-400 text-xs">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metrics Grid - 2 cols on mobile */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    {/* Items */}
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-bold">Billetera</span>
                        <p className="text-lg font-mono text-green-400 font-bold">{fmtMoney(user.wallet?.balance || 0)}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-bold">Neto</span>
                        <p className={`text-lg font-mono font-bold ${profit && profit.netEarnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profit ? fmtMoney(profit.netEarnings) : '...'}
                        </p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-bold">Ganado</span>
                        <p className="text-lg font-mono text-blue-400 font-bold">{profit ? fmtMoney(profit.totalWon) : '...'}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <span className="text-[10px] text-purple-200/50 uppercase font-bold">Apostado</span>
                        <p className="text-lg font-mono text-purple-400 font-bold">{profit ? fmtMoney(profit.totalWagered) : '...'}</p>
                    </div>
                </div>

                {/* Match History */}
                <div>
                    <h3 className="text-sm font-bold mb-4 px-1 text-purple-200">Historial Reciente</h3>

                    {user.history && user.history.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {user.history.map(match => (
                                <div key={match.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 rounded-full ${match.pnl > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : (match.pnl < 0 ? 'bg-red-500' : 'bg-gray-500')}`}></div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest leading-none mb-0.5">
                                                {fmtGameType(match.gameType)}
                                            </span>
                                            <div className="text-xs font-semibold text-gray-200 line-clamp-1">
                                                vs {match.opponentName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block font-bold font-mono text-sm ${match.pnl > 0 ? 'text-green-400' : (match.pnl < 0 ? 'text-red-400' : 'text-gray-400')}`}>
                                            {match.pnl > 0 ? '+' : ''}${Math.abs(match.pnl)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-purple-200/30 text-center py-8 text-xs italic">
                            Sin partidas recientes.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
