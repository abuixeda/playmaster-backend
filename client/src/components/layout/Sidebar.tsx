
import { Home, Search, PlusCircle, MessageCircle, User, LogOut, Dices } from 'lucide-react';

interface SidebarProps {
    currentView: string;
    onChangeView: (view: string) => void;
    user: any; // Simplified user type
}

export function Sidebar({ currentView, onChangeView, user }: SidebarProps) {
    const navItems = [
        { id: 'LOBBY', icon: Home, label: 'Inicio' },
        { id: 'EXPLORE', icon: Search, label: 'Explorar' },
        { id: 'ROOMS', icon: Dices, label: 'Salas' },
        { id: 'CHAT', icon: MessageCircle, label: 'Chat' },
        { id: 'PROFILE', icon: User, label: 'Perfil' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    };

    return (
        <div className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 p-6 z-50">
            {/* Logo Area */}
            <div className="flex items-center gap-3 mb-10 px-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"></div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                    PlayMaster
                </h1>
            </div>

            {/* Navigation */}
            <div className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* User Footer */}
            {user && (
                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                            👤
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-sm truncate">{user.username}</div>
                            <div className="text-xs text-green-400 font-mono">
                                ${user.balance?.toLocaleString() || 0}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
}
