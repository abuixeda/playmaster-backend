import { useEffect, useState } from 'react';

interface ExploreProps {
    onOpenProfile: (userId: string) => void;
}

interface ExploreUser {
    id: string;
    username: string;
    avatarUrl?: string;
    country?: string;
    elo: number;
}

export const Explore: React.FC<ExploreProps> = ({ onOpenProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<ExploreUser[]>([]);
    const [loading, setLoading] = useState(false);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(searchTerm);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchUsers = async (q: string) => {
        setLoading(true);
        try {
            const query = q ? `?q=${encodeURIComponent(q)}` : '';
            const res = await fetch(`/api/users/explore${query}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) {
            console.error("Explore fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto pt-8 px-4 animate-fade-in">
            {/* Header / Search */}
            <div className="flex flex-col items-center mb-8 gap-4">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-tighter">
                    Explorar
                </h1>

                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                    <input
                        type="text"
                        className="w-full bg-slate-800/50 border border-white/10 rounded-full py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                        placeholder="Buscar jugador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                    {users.map(user => (
                        <div
                            key={user.id}
                            onClick={() => onOpenProfile(user.id)}
                            className="bg-slate-800/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3 cursor-pointer hover:bg-slate-700/50 hover:scale-105 transition-all group"
                        >
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full p-0.5 border-2 border-blue-500/20 group-hover:border-blue-400 transition-colors">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 flex items-center justify-center">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">👤</span>
                                    )}
                                </div>
                            </div>

                            <div className="text-center">
                                <div className="font-bold text-white text-sm truncate max-w-[120px]">{user.username}</div>
                                {user.country && <div className="text-[10px] text-slate-400">{user.country}</div>}
                                <div className="mt-2 inline-block px-2 py-0.5 bg-yellow-500/10 text-yellow-500/80 rounded text-[10px] font-mono font-bold">
                                    {user.elo} ELO
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && users.length === 0 && (
                        <div className="col-span-full text-center text-slate-500 py-10">
                            No se encontraron jugadores.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
