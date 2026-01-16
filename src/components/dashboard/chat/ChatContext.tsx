'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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
    const [rooms, setRooms] = useState<Room[]>([]);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const fetchRooms = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Messages Polling & Fetching
    const fetchMessages = useCallback(async (roomId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/chat/messages?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
    }, []);

    // Initial Load & Auth
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
            fetchRooms();
        }
    }, [fetchRooms]);



    // Poll for messages when active room changes
    useEffect(() => {
        if (activeRoom) {
            fetchMessages(activeRoom.id);
            const interval = setInterval(() => {
                fetchMessages(activeRoom.id); // Poll active room
                fetchRooms(); // Poll room list for last message updates
            }, 3000); // 3s polling for "real-time"

            return () => clearInterval(interval);
        } else {
            // Poll room list even if no room active (for unread status)
            const interval = setInterval(fetchRooms, 10000);
            return () => clearInterval(interval);
        }
    }, [activeRoom, fetchMessages, fetchRooms]);

    const sendMessage = async (content: string, attachments?: any[]) => {
        if (!activeRoom || !content.trim()) return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticMsg = {
            id: tempId,
            content,
            senderId: currentUser.id,
            createdAt: new Date().toISOString(),
            sender: currentUser, // Simplified
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
                fetchRooms(); // Update sidebar
            } else {
                // Remove optimistic on failure
                setMessages(prev => prev.filter(m => m.id !== tempId));
                alert('Failed to send message');
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const markAsRead = async (roomId: string) => {
        // Optimistic
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unreadCount: 0 } : r));

        // In real app, call API to update lastViewedAt
        // For now we assume fetchMessages implicitly marks 'read' in UI perception
    };

    return (
        <ChatContext.Provider value={{
            rooms,
            activeRoom,
            setActiveRoom,
            messages,
            setMessages,
            sendMessage,
            isLoading,
            currentUser,
            refreshRooms: fetchRooms,
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
