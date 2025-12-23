import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
    playerId: string;
    username: string;
    message: string;
    timestamp: number;
}

interface ChatBoxProps {
    socket: Socket | null;
    gameId: string;
    myPlayerId: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ socket, gameId, myPlayerId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleReceive = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
            if (!isOpen && msg.playerId !== myPlayerId) {
                setUnreadCount((prev) => prev + 1);
            }
        };

        socket.on('chat:receive', handleReceive);

        return () => {
            socket.off('chat:receive', handleReceive);
        };
    }, [socket, isOpen, myPlayerId]);

    // Auto-scroll
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !socket) return;

        socket.emit('chat:send', { gameId, message: inputValue });
        setInputValue('');
    };

    const toggleChat = () => {
        if (!isOpen) setUnreadCount(0); // Clear on open
        setIsOpen(!isOpen);
    };

    if (!isOpen) {
        // BUBBLE MODE (Top Right - Aligned with Timer)
        return (
            <div
                onClick={toggleChat}
                className="fixed top-16 right-4 z-50 cursor-pointer group animate-bounce-in"
            >
                <div className="relative bg-white hover:bg-gray-100 text-black w-12 h-12 flex items-center justify-center rounded-3xl rounded-tr-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform transform hover:scale-110 active:scale-95 border-2 border-black">
                    {/* Classic dots icon */}
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    </div>

                    {/* Notification Badge */}
                    {unreadCount > 0 && (
                        <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black animate-bounce shadow-sm">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // WINDOW MODE (Top Right - Aligned with Timer)
    return (
        <div className="fixed top-16 right-4 w-80 bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 z-50 flex flex-col animate-fade-in-up h-[450px] max-h-[60vh]">

            {/* Header */}
            <div
                className="bg-slate-800 p-4 cursor-pointer flex justify-between items-center border-b border-slate-700 hover:bg-slate-800/80 transition-colors"
                onClick={toggleChat}
            >
                <span className="font-bold text-white flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    Chat de Sala
                </span>
                <button className="text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                    ✕
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2 opacity-50">
                        <div className="text-4xl text-slate-600 grayscale">👋</div>
                        <div className="text-sm font-medium">¡Saluda a tu rival!</div>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.playerId === myPlayerId;
                    return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 rounded-bl-none'
                                }`}>
                                {!isMe && <span className="text-[10px] font-bold text-blue-300 block mb-0.5 uppercase tracking-wider">{msg.username}</span>}
                                {msg.message}
                            </div>
                            <span className="text-[9px] text-slate-500 mt-1 px-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="bg-slate-800 p-3 flex gap-2 border-t border-slate-700">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-500 transition-all border border-slate-700 focus:border-blue-500"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all transform active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    ➤
                </button>
            </form>
        </div>
    );
};
