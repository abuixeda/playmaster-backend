
import { useEffect, useState } from 'react';
import { Trophy, Swords, Shield, Star, Clock, Activity, Medal, User as UserIcon, Gamepad2, TrendingUp, DollarSign, ChevronRight } from 'lucide-react';
import { API_URL } from '../config';

// --- TIERS CONFIG ---
const TIERS: Record<string, { label: string, color: string, bg: string, border: string, effect: string, button: string }> = {
    'ROOKIE': {
        label: 'NOVATO',
        color: 'text-slate-400',
        bg: 'from-slate-900 to-slate-950',
        border: 'border-slate-700',
        effect: '',
        button: 'bg-slate-700 hover:bg-slate-600'
    },
    'REGULAR': {
        label: 'PROMESA',
        color: 'text-blue-400',
        bg: 'from-slate-900 to-[#0f172a]',
        border: 'border-blue-500/30',
        effect: 'shadow-blue-500/10',
        button: 'bg-blue-600 hover:bg-blue-500'
    },
    'PRO': {
        label: 'PROFESIONAL',
        color: 'text-purple-400',
        bg: 'from-[#1e1b4b] to-[#020617]',
        border: 'border-purple-500/50',
        effect: 'shadow-purple-500/20 backdrop-blur-md',
        button: 'bg-purple-600 hover:bg-purple-500'
    },
    // The Elite Visuals based on Reference
    'ELITE': {
        label: 'LEYENDA',
        color: 'text-[#fbbf24]', // Amber-400 equivalent for Gold
        bg: 'from-[#2e1065] via-[#1e1b4b] to-[#0f0720]', // Deep Purple gradient
        border: 'border-[#fbbf24]',
        effect: 'shadow-[0_0_40px_-10px_rgba(251,191,36,0.3)]', // Golden Glow
        button: 'bg-gradient-to-r from-[#fbbf24] to-[#d97706] text-black hover:scale-105'
    }
};

interface UserProfile {
    id: string;
    username: string;
    avatarUrl?: string;
    country?: string;
    elo: number;
    createdAt: string;
    stats: {
        totalGames: number;
        wins: number;
        losses: number;
        winrate: number;
        tier: string;
        rankPercentile?: number;
    };
    statsPerGame: Record<string, { matches: number, wins: number, moneyWon: number, winrate: number }>;
    badges: string[];
    history: any[];
    status?: string;
}

interface PublicProfileProps {
    targetUserId?: string;
    onBack?: () => void;
}

export function PublicProfile({ targetUserId, onBack }: PublicProfileProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PERFIL' | 'JUEGOS' | 'HISTORIAL' | 'LOGROS'>('PERFIL');
    const [challengeStatus, setChallengeStatus] = useState<'IDLE' | 'SENT'>('IDLE');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!targetUserId) return;
            try {
                const res = await fetch(`${API_URL}/api/users/${targetUserId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (error) {
                console.error("Profile fetch error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [targetUserId]);

    if (loading) return <div className="flex h-full items-center justify-center"><div className="animate-spin text-[#fbbf24] text-3xl">⚔️</div></div>;
    if (!profile) return <div className="p-8 text-center text-red-400">Jugador no encontrado</div>;

    const tierKey = profile.stats.tier || 'ROOKIE';
    const tier = TIERS[tierKey] || TIERS['ROOKIE'];
    const myId = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id } catch { return '' } })();
    const isMe = myId === profile.id;

    // --- SUB-COMPONENTS ---

    // 1. Stats Row Item
    const StatBox = ({ label, value, subtext, color = 'text-white' }: any) => (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider mb-1 uppercase">{label}</span>
            <span className={`text-2xl font-black ${color}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{value}</span>
            {subtext && <span className="text-[10px] text-slate-500 font-bold mt-1">{subtext}</span>}
        </div>
    );

    return (
        <div className={`min-h-full pb-20 bg-gradient-to-b ${tier.bg} text-slate-200 animate-fade-in font-sans selection:bg-[#fbbf24] selection:text-black`}>

            {/* Background Texture/Effects for Elite */}
            {tierKey === 'ELITE' && (
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full"></div>
                    <div className="absolute top-[10%] left-[10%] w-4 p-4 border border-[#fbbf24]/20 rounded-full animate-spin-slow opacity-20"></div>
                    <div className="absolute top-[20%] right-[10%] w-8 p-8 border border-[#fbbf24]/10 rounded-full animate-spin-reverse-slow opacity-20"></div>
                </div>
            )}

            <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8">

                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col items-center mb-8">
                    {/* Avatar with Elite "Wings" */}
                    <div className="relative mb-4">
                        {tierKey === 'ELITE' && (
                            // Simulated Wings/Laurels via CSS borders/rotation or SVGs
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] pointer-events-none">
                                {/* Simple CSS shape to mimic ornate frame */}
                                <div className="absolute inset-0 border-[3px] border-[#fbbf24] rounded-full scale-110 opacity-50 blur-[1px]"></div>
                                <div className="absolute inset-0 border-t-[4px] border-[#fbbf24] rounded-full rotate-45 scale-125 opacity-80"></div>
                            </div>
                        )}

                        <div className={`relative w-32 h-32 rounded-full p-[4px] bg-gradient-to-b from-[#fbbf24] via-[#d97706] to-[#78350f] shadow-2xl shadow-[#fbbf24]/40 z-10`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#1a0b2e] border-2 border-[#1a0b2e]">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl bg-[#2e1065] text-[#fbbf24]">
                                        {profile.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rank Badge */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
                            <div className="bg-gradient-to-r from-[#92400e] via-[#b45309] to-[#92400e] text-[#fef3c7] textxs font-bold px-4 py-1.5 rounded-lg border border-[#fbbf24] shadow-lg flex items-center gap-2 whitespace-nowrap">
                                <Trophy size={12} className="text-[#fbbf24]" />
                                <span>{profile.elo} ELO</span>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-white mt-4 drop-shadow-xl tracking-tight">{profile.username}</h1>
                    <p className="text-[#fbbf24] text-sm font-bold opacity-80 uppercase tracking-widest mt-1">"{tier.label}"</p>
                </div>

                {/* --- STATS DASHBOARD ROW --- */}
                <div className="bg-[#1e1b4b]/60 backdrop-blur-md rounded-2xl border border-white/10 p-4 mb-8 shadow-xl grid grid-cols-2 md:grid-cols-5 gap-4 items-center relative overflow-hidden group">
                    {/* Gloss effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>

                    <StatBox label="JUEGOS" value={profile.stats.totalGames} subtext="Top 7%" />

                    <StatBox label="GANADAS" value={profile.stats.wins} color="text-green-400" subtext="+7 recientes" />

                    <StatBox label="PERDIDAS" value={profile.stats.losses} color="text-red-400" />

                    <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-1">
                            <Star size={12} className="text-purple-400 fill-current" />
                            <span className="text-2xl font-black text-white">{profile.stats.winrate}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">WINRATE</span>
                        <div className="w-16 h-1 mt-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${profile.stats.winrate}%` }}></div>
                        </div>
                    </div>

                    <div className="col-span-2 md:col-span-1 flex justify-center">
                        <button
                            disabled={isMe || challengeStatus === 'SENT'}
                            onClick={() => {
                                setChallengeStatus('SENT');
                                setTimeout(() => setChallengeStatus('IDLE'), 2000);
                            }}
                            className={`${tier.button} w-full md:w-auto px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all`}
                        >
                            {challengeStatus === 'SENT' ? 'Enviado' : <><Swords size={14} /> Desafiar</>}
                        </button>
                    </div>
                </div>

                {/* --- TABS NAVIGATION --- */}
                <div className="bg-[#1e1b4b] rounded-xl p-1 mb-6 flex items-center justify-between border border-white/5 shadow-lg">
                    {['PERFIL', 'JUEGOS', 'HISTORIAL', 'LOGROS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-[#2e1065] text-[#fbbf24] shadow-md border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab === 'PERFIL' && <UserIcon size={14} />}
                            {tab === 'JUEGOS' && <Gamepad2 size={14} />}
                            {tab === 'HISTORIAL' && <Clock size={14} />}
                            {tab === 'LOGROS' && <Medal size={14} />}
                            <span className="hidden sm:inline">{tab}</span>
                        </button>
                    ))}
                </div>

                {/* --- CONTENT AREA (For now mostly Overview style) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">

                    {/* LEFT COLUMN: General Stats & Badges */}
                    <div className="space-y-6">
                        {/* Money & Rep Card */}
                        <div className="bg-[#1e1b4b]/80 border border-white/5 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                            <h3 className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-wider">ESTADÍSTICAS GENERALES</h3>

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-[10px] text-slate-500 font-bold mb-1">DINERO APOSTADO</div>
                                    <div className="flex items-center gap-1 text-[#fbbf24] font-black text-xl">
                                        <div className="w-5 h-5 rounded-full bg-[#fbbf24] text-black flex items-center justify-center text-xs border border-white/20">$</div>
                                        <span>$1,200</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold mb-1">REPUTACIÓN</div>
                                    <div className="flex gap-0.5 mb-1">
                                        {[1, 2, 3, 4].map(i => <Star key={i} size={12} className="text-[#fbbf24] fill-current" />)}
                                        <Star size={12} className="text-slate-600 fill-current" />
                                    </div>
                                    <span className="text-[10px] text-slate-400">Jugador Confiable</span>
                                </div>
                            </div>
                        </div>

                        {/* Badges Box */}
                        <div className="bg-[#1e1b4b]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-wider flex justify-between">
                                <span>INSIGNIAS</span>
                                <span className="text-white bg-slate-700 px-1.5 rounded text-[9px]">{profile.badges.length}</span>
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {profile.badges.length > 0 ? profile.badges.slice(0, 3).map((badge, i) => (
                                    <div key={i} className="bg-[#2e1065] rounded-xl p-2 border border-[#fbbf24]/20 flex flex-col items-center gap-1 text-center group hover:bg-[#3b157a] transition-colors">
                                        <div className="text-2xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                                            {badge === 'TRUCO_KING' ? '🃏' : badge === 'CHESS_MASTER' ? '♟️' : '🏅'}
                                        </div>
                                        <div className="text-[8px] font-bold leading-tight text-slate-300">
                                            {badge.replace('_', ' ')}
                                        </div>
                                    </div>
                                )) : <div className="text-xs text-slate-500 col-span-3 text-center py-2">Sin insignias aún</div>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Stats Per Game */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-[#1e1b4b]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-wider flex justify-between items-center">
                                <span>ESTADÍSTICAS POR JUEGO</span>
                                <button className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1">VER MÁS <ChevronRight size={10} /></button>
                            </h3>

                            <div className="space-y-3">
                                {Object.entries(profile.statsPerGame).map(([game, stats]) => (
                                    <div key={game} className="bg-white/5 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#2e1065] flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                                                {game === 'CHESS' ? '♟️' : game === 'TRUCO' ? '🃏' : '🎲'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm capitalize">{game.toLowerCase()}</div>
                                                <div className="text-[10px] text-slate-500 font-bold">{stats.matches} Partidas</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex flex-col items-end">
                                                {/* Rank Badge for Game */}
                                                <div className="flex items-center gap-1 text-[#fbbf24] font-bold text-xs">
                                                    <Trophy size={10} />
                                                    <span>{profile.elo}</span>
                                                </div>
                                                <div className="text-[10px] text-green-400 font-bold">
                                                    Winrate {stats.winrate}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity List */}
                        <div className="bg-[#1e1b4b]/80 border border-white/5 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-slate-400 text-[10px] font-bold uppercase mb-4 tracking-wider">ÚLTIMAS PARTIDAS</h3>
                            <div className="space-y-2">
                                {profile.history.map((match, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0f0720]/50 border border-white/5 hover:border-purple-500/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">
                                                {match.gameType === 'CHESS' ? '♟️' : match.gameType === 'TRUCO' ? '🃏' : '🎲'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white capitalize">{match.gameType.toLowerCase().replace('_', ' ')}</div>
                                                <div className="text-[10px] text-slate-500">vs {match.opponentName}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`text-xs font-bold ${match.moneyChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {match.moneyChange > 0 ? `+$${match.moneyChange}` : `-$${Math.abs(match.moneyChange)}`}
                                            </div>
                                            <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${match.outcome === 'WIN' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
                                                {match.outcome === 'WIN' ? 'VICTORIA' : 'DERROTA'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {profile.history.length === 0 && <div className="text-center py-4 text-xs text-slate-500">Sin actividad reciente</div>}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {onBack && (
                <button onClick={onBack} className="fixed bottom-6 left-6 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/10 transition-all z-50 border border-white/10">
                    <ChevronRight size={20} className="rotate-180" />
                </button>
            )}
        </div>
    );
}

