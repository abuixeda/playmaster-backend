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
    const [isOpen, setIsOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleReceive = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on('chat:receive', handleReceive);

        return () => {
            socket.off('chat:receive', handleReceive);
        };
    }, [socket]);

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

    return (
        <div className={`fixed bottom-4 right-4 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden transition-all duration-300 z-50 ${isOpen ? 'h-96' : 'h-12'}`}>

            {/* Header */}
            <div
                className="bg-gray-800 p-3 cursor-pointer flex justify-between items-center hover:bg-gray-750"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="font-bold text-white flex items-center gap-2">
                    💬 Chat de Sala
                    {!isOpen && messages.length > 0 && (
                        <span className="bg-red-500 text-xs rounded-full px-2 py-0.5 animate-pulse">New</span>
                    )}
                </span>
                <button className="text-gray-400 hover:text-white">
                    {isOpen ? '▼' : '▲'}
                </button>
            </div>

            {isOpen && (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 p-3 h-64 overflow-y-auto space-y-2 bg-gray-900/90">
                        {messages.length === 0 && (
                            <div className="text-gray-500 text-center text-sm mt-10">
                                ¡Di hola! 👋
                            </div>
                        )}

                        {messages.map((msg, idx) => {
                            const isMe = msg.playerId === myPlayerId;
                            return (
                                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-gray-700 text-gray-200 rounded-bl-none'
                                        }`}>
                                        {!isMe && <span className="text-xs font-bold text-blue-300 block mb-0.5">{msg.username}</span>}
                                        {msg.message}
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="bg-gray-800 p-2 border-t border-gray-700 flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-gray-900 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                            ➝
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};
