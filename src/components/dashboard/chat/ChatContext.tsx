'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type Room = {
    id: string;
    name?: string;
    isGroup: boolean;
    participants: any[];
    messages?: any[];
    updatedAt: string;
    unreadCount?: number;
};

type ChatContextType = {
    rooms: Room[];
    activeRoom: Room | null;
    setActiveRoom: (room: Room | null) => void;
    messages: any[];
    setMessages: (msgs: any[]) => void;
    sendMessage: (content: string, attachments?: any[]) => Promise<void>;
    isLoading: boolean;
    currentUser: any;
    refreshRooms: () => void;
    markAsRead: (roomId: string) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const queryClient = useQueryClient();

    // 1. Fetch Rooms Query
    const { data: rooms = [], refetch: refreshRooms } = useQuery<Room[]>({
        queryKey: ['chat-rooms'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch rooms');
            return res.json();
        },
        refetchInterval: 10000,
        enabled: !!currentUser
    });

    // 2. Fetch Messages Query
    const { data: messagesData = [], isLoading: isMessagesLoading } = useQuery<any[]>({
        queryKey: ['chat-messages', activeRoom?.id],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/chat/messages?roomId=${activeRoom?.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch messages');
            return res.json();
        },
        refetchInterval: 3000,
        enabled: !!activeRoom?.id,
        initialData: []
    });

    // Sync messages state for optimistic updates
    useEffect(() => {
        if (messagesData.length > 0) {
            setMessages(messagesData);
        }
    }, [messagesData]);

    // Initial Auth Load
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);

    const sendMessage = async (content: string, attachments?: any[]) => {
        if (!activeRoom || !content.trim()) return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticMsg = {
            id: tempId,
            content,
            senderId: currentUser.id,
            createdAt: new Date().toISOString(),
            sender: currentUser,
            isOptimistic: true,
            attachments
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ roomId: activeRoom.id, content, attachments })
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
                queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
            } else {
                setMessages(prev => prev.filter(m => m.id !== tempId));
                alert('Failed to send message');
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const markAsRead = async (roomId: string) => {
        // Optimistic Update via React Query
        queryClient.setQueryData(['chat-rooms'], (old: Room[] | undefined) => {
            if (!old) return [];
            return old.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r);
        });
    };

    return (
        <ChatContext.Provider value={{
            rooms,
            activeRoom,
            setActiveRoom,
            messages,
            setMessages,
            sendMessage,
            isLoading: isMessagesLoading,
            currentUser,
            refreshRooms,
            markAsRead
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChat must be used within ChatProvider');
    return context;
}
