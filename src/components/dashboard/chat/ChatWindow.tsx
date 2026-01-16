'use client';

import { useChat } from './ChatContext';
import { Send, Paperclip, MoreVertical, Phone, Video, Smile, Check, CheckCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ChatWindow() {
    const { activeRoom, messages, sendMessage, currentUser } = useChat();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!activeRoom) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center p-8">
                <div className="w-40 h-40 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <div className="text-6xl">💬</div>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Welcome to Team Chat</h2>
                <p className="text-gray-500 max-w-sm">Select a colleague or customer from the sidebar to start collaborating in real-time.</p>
            </div>
        );
    }

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(newMessage);
        setNewMessage('');
    };

    const getRoomName = () => {
        if (activeRoom.isGroup) return activeRoom.name || 'Group Chat';
        const other = activeRoom.participants.find((p: any) => p.userId !== currentUser?.id);
        return other?.user?.name || other?.user?.email;
    };

    return (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 h-full relative">
            {/* Header */}
            <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                        {getRoomName()?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{getRoomName()}</h3>
                        <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active now
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Phone size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <Video size={20} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser?.id;
                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
                            {!isMe && (
                                <div className="w-8 shrink-0 flex flex-col justify-end">
                                    {showAvatar ? (
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                            {msg.sender?.name?.[0] || '?'}
                                        </div>
                                    ) : <div className="w-8" />}
                                </div>
                            )}

                            <div className={`max-w-[70%]`}>
                                {!isMe && showAvatar && (
                                    <p className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.sender?.name}</p>
                                )}
                                <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed relative ${isMe
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                                    }`}>
                                    {msg.content}
                                    {/* Timestamp & Status */}
                                    <div className={`text-[9px] font-bold mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && (
                                            msg.isOptimistic ? <span className="opacity-50">Sending...</span> : <CheckCheck size={12} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-gray-50 p-2 rounded-[1.5rem] border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-inner">
                    <button type="button" className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all shadow-sm">
                        <Paperclip size={20} />
                    </button>
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 py-3 max-h-32 min-h-[44px] text-sm text-gray-800 placeholder:text-gray-400 font-medium resize-none overflow-hidden"
                    />
                    <button type="button" className="p-3 text-gray-400 hover:text-amber-500 hover:bg-white rounded-full transition-all shadow-sm">
                        <Smile size={20} />
                    </button>
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 transition-all"
                    >
                        <Send size={18} fill="currentColor" />
                    </button>
                </form>
            </div>
        </div>
    );
}
