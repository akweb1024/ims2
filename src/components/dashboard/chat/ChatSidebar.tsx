'use client';

import { useChat } from './ChatContext';
import { Search, Plus, Hash, Users, Activity } from 'lucide-react';
import { useState, useMemo } from 'react';
import CreateChatModal from './CreateChatModal';
import { formatToISTTime } from '@/lib/date-utils';

export default function ChatSidebar() {
    const { rooms, activeRoom, setActiveRoom, currentUser } = useChat();
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getRoomName = (room: any, me: any) => {
        if (room.isGroup) return room.name || 'Group Chat';
        const other = room.participants.find((p: any) => p.userId !== me?.id);
        if (!other) return 'Unknown';
        return other.user.name || other.user.email.split('@')[0];
    };

    const getRoomIcon = (room: any, me: any) => {
        if (room.isGroup) return <Hash size={18} />;
        const other = room.participants.find((p: any) => p.userId !== me?.id);
        // Check if customer
        if (other?.user?.role === 'CUSTOMER') return <Users size={18} />;
        return <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>; // Online indicator
    };

    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const name = getRoomName(room, currentUser).toLowerCase();
            return name.includes(search.toLowerCase());
        });
    }, [rooms, search, currentUser]);

    return (
        <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 h-full backdrop-blur-xl">
            {/* Header */}
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Messages</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all"
                    >
                        <Plus size={18} strokeWidth={3} />
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search chats..."
                        className="w-full bg-white dark:bg-gray-800 pl-10 pr-4 py-2.5 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
                {/* Favorites / High Priority might go here */}

                {filteredRooms.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Activity className="mx-auto mb-2" />
                        <p className="text-xs font-bold uppercase">No Conversations Found</p>
                    </div>
                ) : (
                    filteredRooms.map(room => {
                        const isActive = activeRoom?.id === room.id;
                        const roomName = getRoomName(room, currentUser);
                        const otherP = room.participants.find((p: any) => p.userId !== currentUser?.id);
                        // Mock last message for preview
                        const lastMsg = room.messages?.[0]?.content || 'Start the conversation...';
                        const time = formatToISTTime(room.messages?.[0]?.createdAt);

                        return (
                            <button
                                key={room.id}
                                onClick={() => setActiveRoom(room)}
                                className={`w-full p-3 rounded-2xl flex gap-3 transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-white shadow-lg shadow-indigo-100 ring-1 ring-black/5 z-10 scale-[1.02]'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-[1.01]'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500 group-hover:bg-white group-hover:shadow-sm'
                                    }`}>
                                    {getRoomIcon(room, currentUser)}
                                </div>
                                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={`font-bold text-sm truncate ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {roomName}
                                        </h3>
                                        <span className="text-[10px] font-bold text-gray-400">{time}</span>
                                    </div>
                                    <p className={`text-xs truncate ${isActive ? 'text-indigo-500 font-medium' : 'text-gray-500'}`}>
                                        {lastMsg}
                                    </p>
                                </div>
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full"></div>}
                            </button>
                        );
                    })
                )}
            </div>

            {isModalOpen && <CreateChatModal onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}
