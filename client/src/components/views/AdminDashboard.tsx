import { useState, useEffect } from 'react';
import { Users, DollarSign, Ban, CheckCircle, Search, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { API_URL } from '../../config';

interface AdminDashboardProps {
    onBack: () => void;
}

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    elo: number;
    createdAt: string;
    kycStatus: string;
}

interface FinancialStats {
    volume: number;
    revenue: number;
    deposits: number;
    withdrawals: number;
    chartData: { date: string, volume: number, revenue: number }[];
}

interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    cbu: string;
    alias?: string;
    status: string;
    createdAt: string;
    user?: { username: string, email: string };
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
    const [tab, setTab] = useState<'USERS' | 'FINANCE' | 'WITHDRAWALS'>('FINANCE');
    const [users, setUsers] = useState<User[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [stats, setStats] = useState<FinancialStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Filters
    const [range, setRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('7D');
    const [activeMetric, setActiveMetric] = useState<'VOLUME' | 'REVENUE' | 'DEPOSITS' | 'WITHDRAWALS'>('REVENUE');

    const token = localStorage.getItem('token') || '';

    // Fetch Financial Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                let startDate = new Date();
                if (range === '24H') startDate.setDate(startDate.getDate() - 1);
                if (range === '7D') startDate.setDate(startDate.getDate() - 7);
                if (range === '30D') startDate.setDate(startDate.getDate() - 30);
                if (range === 'ALL') startDate = new Date(0); // Epoch

                const query = `startDate=${startDate.toISOString()}`;
                const res = await fetch(`${API_URL}/api/admin/stats/financial?${query}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) setStats(await res.json());
            } catch (e) {
                console.error(e);
            }
        };
        fetchStats();
    }, [range]);

    // Fetch Users
    useEffect(() => {
        if (tab === 'USERS') fetchUsers();
        if (tab === 'WITHDRAWALS') fetchWithdrawals();
    }, [tab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (e) {
            // silent fail
        } finally {
            setLoading(false);
        }
    };

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/withdrawals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setWithdrawals(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleBan = async (userId: string, currentRole: string) => {
        if (!confirm(`¿${currentRole === 'BANNED' ? 'Desbanear' : 'Banear'} usuario?`)) return;
        const newRole = currentRole === 'BANNED' ? 'USER' : 'BANNED';
        try {
            await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role: newRole })
            });
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const fmtMoney = (n: number) => {
        const absVal = Math.abs(n || 0);
        const str = `$${absVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        return n < 0 ? `-${str}` : str;
    };

    const getMetricLabel = () => {
        switch (activeMetric) {
            case 'REVENUE': return 'Ganancias (Fees)';
            case 'VOLUME': return 'Volumen Apostado';
            case 'DEPOSITS': return 'Depósitos';
            case 'WITHDRAWALS': return 'Retiros';
        }
    };

    const getMetricColor = () => {
        switch (activeMetric) {
            case 'REVENUE': return 'text-green-400';
            case 'VOLUME': return 'text-white';
            case 'DEPOSITS': return 'text-blue-400';
            case 'WITHDRAWALS': return 'text-red-400';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 font-sans pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-400 text-sm">Monitor de Negocio</p>
                </div>
                <div className="flex gap-4">
                    {/* Time Filter */}
                    <div className="bg-slate-900 border border-white/10 rounded-lg p-1 flex">
                        {['24H', '7D', '30D', 'ALL'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${range === r ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                        Volver
                    </button>
                </div>
            </div>

            {/* Quick Stats (Interactive Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <button
                    onClick={() => setActiveMetric('VOLUME')}
                    className={`bg-slate-900 border p-6 rounded-2xl flex flex-col gap-1 text-left transition-all hover:bg-slate-800 ${activeMetric === 'VOLUME' ? 'border-white ring-1 ring-white' : 'border-white/5'}`}
                >
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Volumen Total</div>
                    <div className="text-2xl font-black text-white">{fmtMoney(stats?.volume || 0)}</div>
                    <div className="text-xs text-slate-500">Monto total apostado</div>
                </button>

                <button
                    onClick={() => setActiveMetric('REVENUE')}
                    className={`bg-slate-900 border p-6 rounded-2xl flex flex-col gap-1 text-left transition-all hover:bg-slate-800 relative overflow-hidden ${activeMetric === 'REVENUE' ? 'border-green-500 ring-1 ring-green-500' : 'border-white/5'}`}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={48} /></div>
                    <div className="text-green-400 text-[10px] uppercase font-bold tracking-wider">Ganancias (Fees)</div>
                    <div className="text-2xl font-black text-green-400">{fmtMoney(stats?.revenue || 0)}</div>
                    <div className="text-xs text-slate-500">Comisiones de la casa</div>
                </button>

                <button
                    onClick={() => setActiveMetric('DEPOSITS')}
                    className={`bg-slate-900 border p-6 rounded-2xl flex flex-col gap-1 text-left transition-all hover:bg-slate-800 ${activeMetric === 'DEPOSITS' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-white/5'}`}
                >
                    <div className="text-blue-400 text-[10px] uppercase font-bold tracking-wider">Depósitos</div>
                    <div className="text-2xl font-black text-blue-400">{fmtMoney(stats?.deposits || 0)}</div>
                </button>

                <button
                    onClick={() => setActiveMetric('WITHDRAWALS')}
                    className={`bg-slate-900 border p-6 rounded-2xl flex flex-col gap-1 text-left transition-all hover:bg-slate-800 ${activeMetric === 'WITHDRAWALS' ? 'border-red-400 ring-1 ring-red-400' : 'border-white/5'}`}
                >
                    <div className="text-red-400 text-[10px] uppercase font-bold tracking-wider">Retiros</div>
                    <div className="text-2xl font-black text-white">{fmtMoney(stats?.withdrawals || 0)}</div>
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden min-h-[500px]">
                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setTab('FINANCE')}
                        className={`px-8 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'FINANCE' ? 'border-purple-500 text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-white'}`}
                    >
                        Desempeño Diario
                    </button>
                    <button
                        onClick={() => setTab('WITHDRAWALS')}
                        className={`px-8 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'WITHDRAWALS' ? 'border-purple-500 text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-white'}`}
                    >
                        Retiros
                    </button>
                    <button
                        onClick={() => setTab('USERS')}
                        className={`px-8 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'USERS' ? 'border-purple-500 text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-white'}`}
                    >
                        Gestión Usuarios
                    </button>
                </div>

                {/* Finance Detail Tab */}
                {tab === 'FINANCE' && stats?.chartData && (
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Detalle de {getMetricLabel()}</h3>
                            <span className="text-xs text-slate-500 bg-black/30 px-2 py-1 rounded">
                                Mostrando datos de: <span className="text-white font-bold">{range}</span>
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 uppercase border-b border-white/5 bg-black/20">
                                        <th className="p-3 font-bold">Fecha</th>
                                        <th className="p-3 font-bold text-right">{getMetricLabel()}</th>
                                        <th className="p-3 font-bold text-center">Gráfico</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-mono">
                                    {stats.chartData.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">Sin datos en este periodo</td></tr>}
                                    {stats.chartData.map((day) => {
                                        // Dynamic Value accessor
                                        const val = (day as any)[activeMetric.toLowerCase()] || 0;
                                        const maxVal = stats ? Math.max(...stats.chartData.map(d => Math.abs((d as any)[activeMetric.toLowerCase()] || 0)), 1) : 1;
                                        // Pct for bar
                                        const pct = Math.min(100, Math.abs(val) / maxVal * 100);

                                        return (
                                            <tr key={day.date} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-3 text-slate-300">{day.date}</td>
                                                <td className={`p-3 font-bold text-right ${getMetricColor()}`}>{fmtMoney(val)}</td>
                                                <td className="p-3 text-center align-middle">
                                                    <div className="h-2 w-full max-w-[150px] bg-slate-800 rounded-full mx-auto overflow-hidden flex justify-start">
                                                        <div
                                                            className={`h-full ${activeMetric === 'REVENUE' ? (val >= 0 ? 'bg-green-500' : 'bg-red-500') : (activeMetric === 'WITHDRAWALS' ? 'bg-red-500' : 'bg-blue-500')}`}
                                                            style={{ width: `${pct}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Withdrawals Tab */}
                {tab === 'WITHDRAWALS' && (
                    <div className="p-6">
                        <div className="flex gap-4 mb-6">
                            <h3 className="text-lg font-bold">Historial de Solicitudes</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 uppercase border-b border-white/5">
                                        <th className="p-4 font-bold">Fecha</th>
                                        <th className="p-4 font-bold">Usuario</th>
                                        <th className="p-4 font-bold">Monto</th>
                                        <th className="p-4 font-bold">Destino (CBU/Alias)</th>
                                        <th className="p-4 font-bold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                                    ) : (
                                        withdrawals.map(w => (
                                            <tr key={w.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-slate-400">
                                                    {new Date(w.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 font-bold flex flex-col">
                                                    <span className="text-white">{w.user?.username || '---'}</span>
                                                    <span className="text-[10px] text-slate-500">{w.user?.email}</span>
                                                </td>
                                                <td className="p-4 font-mono text-red-400 font-bold">
                                                    {fmtMoney(w.amount)}
                                                </td>
                                                <td className="p-4 font-mono text-xs text-slate-300">
                                                    {w.cbu || w.alias || '---'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${w.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                        {w.status === 'APPROVED' ? 'APROBADO (AUTO)' : w.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {tab === 'USERS' && (
                    <div className="p-6">
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar usuario o email..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-slate-500 uppercase border-b border-white/5">
                                        <th className="p-4 font-bold">Usuario</th>
                                        <th className="p-4 font-bold">Email</th>
                                        <th className="p-4 font-bold">ELO</th>
                                        <th className="p-4 font-bold">Rol</th>
                                        <th className="p-4 font-bold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 flex items-center gap-3 font-bold">
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                                        {user.username[0].toUpperCase()}
                                                    </div>
                                                    {user.username}
                                                </td>
                                                <td className="p-4 text-slate-400">{user.email}</td>
                                                <td className="p-4 font-mono text-yellow-500">{user.elo}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>
                                                        {user.role}
                                                    </span>
                                                    {user.role === 'BANNED' && <span className="ml-2 bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] font-bold">BANNED</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleBan(user.id, user.role)}
                                                        className={`p-2 rounded-lg transition-colors ${user.role === 'BANNED' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                                                        title={user.role === 'BANNED' ? "Desbanear" : "Banear"}
                                                    >
                                                        {user.role === 'BANNED' ? <CheckCircle size={16} /> : <Ban size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
