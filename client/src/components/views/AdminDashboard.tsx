
import React, { useState, useEffect } from 'react';
import { Activity, Ban, Shield, DollarSign, Power } from 'lucide-react';

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    elo: number;
    createdAt: string;
}

interface Game {
    id: string;
    typeCode: string;
    status: string;
    players: { userId: string }[];
}

interface Stats {
    totalUsers: number;
    activeGames: number;
    volume24h: number;
}

export const AdminDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [tab, setTab] = useState<'DASHBOARD' | 'USERS' | 'GAMES' | 'SETTINGS'>('DASHBOARD');
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch helpers
    const authFetch = async (url: string, options: any = {}) => {
        const token = localStorage.getItem('token');
        // Force absolute URL to match Profile.tsx success pattern
        // Use relative URL to leverage Vite proxy
        const fullUrl = url;

        console.log("Fetching:", fullUrl);
        try {
            const res = await fetch(fullUrl, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.status === 401 || res.status === 403) {
                console.error("Auth Error:", res.status);
                alert("No autorizado (403)");
                onBack();
                return null;
            }
            if (!res.ok) {
                console.error("Fetch error:", res.statusText);
                return null;
            }
            return res.json();
        } catch (e) {
            console.error("Network error:", e);
            alert("Error de red al conectar con Admin API");
            return null;
        }
    };

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'DASHBOARD') {
                const data = await authFetch('/api/admin/stats');
                if (data) setStats(data);
            } else if (tab === 'USERS') {
                const data = await authFetch('/api/admin/users');
                if (data) setUsers(data);
            } else if (tab === 'GAMES') {
                const data = await authFetch('/api/admin/games');
                if (data) setGames(data);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleBan = async (userId: string, currentRole: string) => {
        if (!confirm(`¿Cambiar rol de usuario?`)) return;
        const newRole = currentRole === 'BANNED' ? 'USER' : 'BANNED';
        await authFetch(`/api/admin/users/${userId}/role`, {
            method: 'POST',
            body: JSON.stringify({ role: newRole })
        });
        loadData();
    };

    const handleForceFinish = async (gameId: string) => {
        if (!confirm(`¿Forzar finalización de partida ${gameId}?`)) return;
        // Prompt for winner? For now assume abort/draw or random.
        // Let's just abort for now or ask ID.
        const winnerId = prompt("Ingrese ID del Ganador (deje vacío para abortar/empate):");

        await authFetch(`/api/admin/games/${gameId}/finish`, {
            method: 'POST',
            body: JSON.stringify({ winnerId: winnerId || null }) // null might handle as abort depending on logic
        });
        loadData();
    };

    const handleBalance = async (userId: string) => {
        const amtStr = prompt("Monto a ajustar (+ para crédito, - para débito):");
        if (!amtStr) return;
        const amount = parseInt(amtStr);
        if (isNaN(amount)) return;

        const type = amount >= 0 ? "CREDIT" : "DEBIT";
        await authFetch(`/api/admin/users/${userId}/balance`, {
            method: 'POST',
            body: JSON.stringify({ amount: Math.abs(amount), type })
        });
        alert("Saldo actualizado");
        loadData(); // users list doesn't show balance, maybe we should add it?
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="text-purple-400" />
                    <h1 className="text-xl font-bold">Admin Panel</h1>
                </div>
                <button onClick={onBack} className="text-sm text-slate-400 hover:text-white">Salir</button>
            </div>

            {/* Nav */}
            <div className="flex p-4 gap-2 overflow-x-auto">
                <button onClick={() => setTab('DASHBOARD')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${tab === 'DASHBOARD' ? 'bg-purple-600' : 'bg-slate-800'}`}>Dashboard</button>
                <button onClick={() => setTab('USERS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${tab === 'USERS' ? 'bg-purple-600' : 'bg-slate-800'}`}>Usuarios</button>
                <button onClick={() => setTab('GAMES')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap ${tab === 'GAMES' ? 'bg-purple-600' : 'bg-slate-800'}`}>Partidas</button>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Loading */}
                {loading && <div className="text-center py-20 text-slate-400 animate-pulse">Cargando datos...</div>}

                {/* Error / Empty State */}
                {!loading && tab === 'DASHBOARD' && !stats && (
                    <div className="text-center py-20">
                        <p className="text-red-400 mb-4">No se pudieron cargar las estadísticas.</p>
                        <button onClick={loadData} className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">Reintentar</button>
                    </div>
                )}

                {!loading && tab === 'DASHBOARD' && stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl">
                            <div className="text-slate-400 text-xs uppercase mb-1">Usuarios Totales</div>
                            <div className="text-2xl font-black">{stats.totalUsers}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl">
                            <div className="text-slate-400 text-xs uppercase mb-1">Partidas Activas</div>
                            <div className="text-2xl font-black text-green-400">{stats.activeGames}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl col-span-2">
                            <div className="text-slate-400 text-xs uppercase mb-1">Volumen (24h)</div>
                            <div className="text-2xl font-black text-yellow-400">${stats.volume24h.toLocaleString()}</div>
                        </div>
                    </div>
                )}

                {!loading && tab === 'USERS' && (
                    <div className="space-y-3">
                        {users.map(u => (
                            <div key={u.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        {u.username}
                                        {u.role === 'ADMIN' && <Shield size={12} className="text-purple-400" />}
                                        {u.role === 'BANNED' && <Ban size={12} className="text-red-400" />}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                                    <div className="text-xs text-slate-500 mt-1">ELO: {u.elo}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleBalance(u.id)} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600" title="Ajustar Saldo">
                                        <DollarSign size={16} className="text-green-400" />
                                    </button>
                                    <button onClick={() => handleBan(u.id, u.role)} className={`p-2 rounded-lg hover:opacity-80 ${u.role === 'BANNED' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`} title="Banear">
                                        {u.role === 'BANNED' ? <Activity size={16} /> : <Ban size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && tab === 'GAMES' && (
                    <div className="space-y-3">
                        {games.length === 0 && <div className="text-slate-500 text-center">No hay partidas activas</div>}
                        {games.map(g => (
                            <div key={g.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-yellow-400">{g.typeCode}</div>
                                    <div className="text-xs text-slate-500 font-mono">ID: {g.id}</div>
                                    <div className="text-xs text-slate-400 mt-1">{g.players.length} Jugadores</div>
                                </div>
                                <button onClick={() => handleForceFinish(g.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30" title="Forzar Fin">
                                    <Power size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
