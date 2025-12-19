import { Home, Search, PlusCircle, MessageCircle, User } from 'lucide-react';

interface BottomNavProps {
    currentView: string;
    onChangeView: (view: string) => void;
}

export function BottomNav({ currentView, onChangeView }: BottomNavProps) {
    const navItems = [
        { id: 'LOBBY', icon: Home, label: 'Home' },
        { id: 'EXPLORE', icon: Search, label: 'Explore' },
        { id: 'CREATE', icon: PlusCircle, label: 'Create', isAction: true }, // Special styling for center button
        { id: 'CHAT', icon: MessageCircle, label: 'Chat' },
        { id: 'PROFILE', icon: User, label: 'Profile' },
    ];

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto bg-[--color-surface-glass] backdrop-blur-xl border border-[--color-surface-glass-border] rounded-2xl px-2 py-3 flex items-center shadow-2xl shadow-purple-900/20 max-w-sm w-full justify-between">
                {navItems.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;

                    if (item.isAction) {
                        return (
                            <button
                                key={item.id}
                                onClick={() => onChangeView(item.id)}
                                className="mx-2 -mt-8 bg-[--color-primary] hover:bg-purple-500 text-white rounded-full p-4 shadow-lg shadow-purple-600/40 transition-transform active:scale-95"
                            >
                                <Icon size={28} />
                            </button>
                        )
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView(item.id)}
                            className={`p-2 rounded-xl transition-colors ${isActive ? 'text-[--color-accent-win]' : 'text-purple-200/60 hover:text-purple-100'}`}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
