'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';

function ChatContent() {
    const [user, setUser] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [activeRoom, setActiveRoom] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [chatType, setChatType] = useState<'employee' | 'customer'>('employee');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomIdParam = searchParams.get('roomId');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchRooms();
    }, [router]);

    useEffect(() => {
        if (roomIdParam && rooms.length > 0) {
            const room = rooms.find(r => r.id === roomIdParam);
            if (room) setActiveRoom(room);
        }
    }, [roomIdParam, rooms]);

    useEffect(() => {
        if (activeRoom) {
            fetchMessages(activeRoom.id);
            // Polling for new messages
            const interval = setInterval(() => fetchMessages(activeRoom.id, true), 3000);
            return () => clearInterval(interval);
        }
    }, [activeRoom]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchRooms = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (err) {
            console.error('Fetch rooms error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (roomId: string, isPolling = false) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/chat/messages?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (!isPolling || JSON.stringify(data) !== JSON.stringify(messages)) {
                    setMessages(data);
                }
            }
        } catch (err) {
            console.error('Fetch messages error:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeRoom) return;

        const content = newMessage;
        setNewMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ roomId: activeRoom.id, content })
            });

            if (res.ok) {
                fetchMessages(activeRoom.id);
                fetchRooms(); // Update room last message/time
            }
        } catch (err) {
            console.error('Send message error:', err);
        }
    };

    const handleStartNewChat = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participantIds: selectedUsers,
                    name: isGroup ? groupName : null,
                    isGroup
                })
            });

            if (res.ok) {
                const newRoom = await res.json();
                setRooms([newRoom, ...rooms]);
                setActiveRoom(newRoom);
                setShowNewChatModal(false);
                setSelectedUsers([]);
                setGroupName('');
                setIsGroup(false);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create chat');
            }
        } catch (err) {
            console.error('Start new chat error:', err);
            alert('Failed to create chat');
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                const data = Array.isArray(result) ? result : (result.data || []);
                // Filter out self and customers
                setAvailableUsers(data.filter((u: any) => u.id !== user?.id && u.role !== 'CUSTOMER'));
            }
        } catch (err) {
            console.error('Fetch users error:', err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/customers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableCustomers(data);
            }
        } catch (err) {
            console.error('Fetch customers error:', err);
        }
    };

    const handleOpenNewChatModal = () => {
        fetchUsers();
        fetchCustomers();
        setShowNewChatModal(true);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getRoomName = (room: any) => {
        if (room.isGroup) return room.name || 'Group Chat';
        const otherParticipant = room.participants.find((p: any) => p.userId !== user?.id);
        if (!otherParticipant) return 'Unknown User';

        const otherUser = otherParticipant.user;

        // Check if it's a customer
        if (otherUser.customerProfile) {
            return otherUser.customerProfile.name || otherUser.email;
        }

        // It's an employee
        return otherUser.name || otherUser.email.split('@')[0];
    };

    const getRoomSubtitle = (room: any) => {
        if (room.isGroup) return `${room.participants?.length || 0} members`;
        const otherParticipant = room.participants.find((p: any) => p.userId !== user?.id);
        if (!otherParticipant) return '';

        const otherUser = otherParticipant.user;

        if (otherUser.customerProfile) {
            return otherUser.customerProfile.organizationName || 'Customer';
        }

        if (otherUser.employeeProfile?.designation) {
            return otherUser.employeeProfile.designation;
        }

        if (otherUser.department?.name) {
            return otherUser.department.name;
        }

        return otherUser.role.replace('_', ' ');
    };

    const getRoomIcon = (room: any) => {
        if (room.isGroup) return '👥';
        const otherParticipant = room.participants.find((p: any) => p.userId !== user?.id);
        if (!otherParticipant) return '💬';

        const otherUser = otherParticipant.user;
        return otherUser.customerProfile ? '👤' : '💼';
    };

    const canCreateGroups = () => {
        return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user?.role);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );

    return (
        <div className="flex h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-secondary-100">
            {/* Sidebar */}
            <div className="w-80 border-r border-secondary-100 flex flex-col bg-secondary-50/30">
                <div className="p-6 flex justify-between items-center border-b border-secondary-100 bg-white">
                    <h2 className="text-xl font-bold text-secondary-900">Chats</h2>
                    <button
                        onClick={handleOpenNewChatModal}
                        className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {rooms.length === 0 ? (
                        <div className="p-8 text-center text-secondary-500 italic">
                            No conversations yet. Start a new one!
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => setActiveRoom(room)}
                                className={`w-full p-4 flex items-center space-x-4 border-b border-secondary-100 transition-all ${activeRoom?.id === room.id ? 'bg-primary-50 border-r-4 border-r-primary-600' : 'bg-white hover:bg-secondary-50'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                                    {getRoomIcon(room)}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-bold text-secondary-900 truncate">{getRoomName(room)}</p>
                                        <p className="text-[10px] text-secondary-400 font-bold uppercase">
                                            {room.messages?.length > 0 ? new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-secondary-500 font-medium truncate">
                                        {getRoomSubtitle(room)}
                                    </p>
                                    <p className="text-sm text-secondary-500 truncate mt-1">
                                        {room.messages?.length > 0 ? room.messages[0].content : 'No messages yet'}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {activeRoom ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-secondary-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xl">
                                    {getRoomIcon(activeRoom)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-secondary-900">{getRoomName(activeRoom)}</h3>
                                    <p className="text-xs text-secondary-400 font-medium">{getRoomSubtitle(activeRoom)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg hover:bg-secondary-100 transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-secondary-50/50">
                            {messages.map((msg) => {
                                const isMe = msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] group`}>
                                            {!isMe && (
                                                <p className="text-[10px] font-bold text-secondary-400 ml-3 mb-1 uppercase tracking-wider">
                                                    {msg.sender?.email?.split('@')[0]}
                                                </p>
                                            )}
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-none' : 'bg-white text-secondary-900 rounded-tl-none border border-secondary-100'
                                                }`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                            </div>
                                            <p className={`text-[10px] text-secondary-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-secondary-100 bg-white">
                            <form onSubmit={handleSendMessage} className="flex space-x-3 items-center">
                                <button type="button" className="p-2 text-secondary-400 hover:text-primary-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="w-full px-4 py-3 bg-secondary-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="p-3 bg-primary-600 text-white rounded-2xl shadow-lg shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 disabled:shadow-none transition-all transform hover:scale-105 active:scale-95"
                                >
                                    <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-secondary-50/30">
                        <div className="w-32 h-32 bg-primary-50 rounded-full flex items-center justify-center text-6xl mb-6 shadow-inner">💬</div>
                        <h3 className="text-2xl font-bold text-secondary-900">Your Conversations</h3>
                        <p className="text-secondary-500 mt-2 max-w-sm">
                            Select a chat from the sidebar to start messaging, or create a new group to collaborate.
                        </p>
                        <button
                            onClick={handleOpenNewChatModal}
                            className="mt-8 btn btn-primary flex items-center font-bold"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Message
                        </button>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h3 className="text-xl font-bold text-secondary-900">New Conversation</h3>
                            <button onClick={() => setShowNewChatModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {canCreateGroups() && (
                                <div className="flex items-center space-x-2 mb-4">
                                    <label className="flex items-center space-x-2 cursor-pointer p-2 bg-secondary-50 rounded-xl w-full">
                                        <input
                                            type="checkbox"
                                            checked={isGroup}
                                            onChange={(e) => setIsGroup(e.target.checked)}
                                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm font-bold text-secondary-700">Create a Group</span>
                                    </label>
                                </div>
                            )}

                            {!canCreateGroups() && isGroup && (
                                <div className="p-3 bg-warning-50 border border-warning-200 rounded-xl text-xs text-warning-700 font-medium">
                                    ⚠️ Only administrators, managers, and team leaders can create group chats.
                                </div>
                            )}

                            {isGroup && (
                                <div className="animate-fade-in">
                                    <label className="label">Group Name</label>
                                    <input
                                        placeholder="e.g. Sales Team"
                                        className="input"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Tab Selector */}
                            <div className="flex gap-2 p-1 bg-secondary-100 rounded-xl">
                                <button
                                    onClick={() => setChatType('employee')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${chatType === 'employee' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500'}`}
                                >
                                    💼 Employees
                                </button>
                                <button
                                    onClick={() => setChatType('customer')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${chatType === 'customer' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500'}`}
                                >
                                    👤 Customers
                                </button>
                            </div>

                            <div>
                                <label className="label">Select {isGroup ? 'Members' : chatType === 'employee' ? 'Employee' : 'Customer'}</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                                    {chatType === 'employee' ? (
                                        availableUsers.length === 0 ? (
                                            <p className="text-center text-secondary-400 py-4 text-sm">No employees available</p>
                                        ) : (
                                            availableUsers.map((u) => (
                                                <label key={u.id} className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedUsers.includes(u.id) ? 'bg-primary-50 border-primary-200' : 'bg-white border-secondary-100 hover:bg-secondary-50'
                                                    }`}>
                                                    <input
                                                        type={isGroup ? 'checkbox' : 'radio'}
                                                        name="user-select"
                                                        checked={selectedUsers.includes(u.id)}
                                                        onChange={() => {
                                                            if (isGroup) {
                                                                if (selectedUsers.includes(u.id)) {
                                                                    setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                                } else {
                                                                    setSelectedUsers([...selectedUsers, u.id]);
                                                                }
                                                            } else {
                                                                setSelectedUsers([u.id]);
                                                            }
                                                        }}
                                                        className={`w-5 h-5 text-primary-600 focus:ring-primary-500 ${!isGroup && 'rounded-full'}`}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-secondary-900 text-sm">{u.name || u.email}</p>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-[10px] bg-secondary-100 px-2 py-0.5 rounded-full font-bold text-secondary-600 uppercase">
                                                                {u.role}
                                                            </span>
                                                            {u.company && (
                                                                <span className="text-[10px] text-secondary-400 font-medium truncate max-w-[100px]">
                                                                    🏢 {u.company.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                        )
                                    ) : (
                                        availableCustomers.length === 0 ? (
                                            <p className="text-center text-secondary-400 py-4 text-sm">No customers available</p>
                                        ) : (
                                            availableCustomers.map((c) => (
                                                <label key={c.user.id} className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedUsers.includes(c.user.id) ? 'bg-primary-50 border-primary-200' : 'bg-white border-secondary-100 hover:bg-secondary-50'
                                                    }`}>
                                                    <input
                                                        type={isGroup ? 'checkbox' : 'radio'}
                                                        name="user-select"
                                                        checked={selectedUsers.includes(c.user.id)}
                                                        onChange={() => {
                                                            if (isGroup) {
                                                                if (selectedUsers.includes(c.user.id)) {
                                                                    setSelectedUsers(selectedUsers.filter(id => id !== c.user.id));
                                                                } else {
                                                                    setSelectedUsers([...selectedUsers, c.user.id]);
                                                                }
                                                            } else {
                                                                setSelectedUsers([c.user.id]);
                                                            }
                                                        }}
                                                        className={`w-5 h-5 text-primary-600 focus:ring-primary-500 ${!isGroup && 'rounded-full'}`}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-secondary-900 text-sm">{c.name}</p>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full font-bold text-blue-600 uppercase">
                                                                {c.customerType}
                                                            </span>
                                                            {c.organizationName && (
                                                                <span className="text-[10px] text-secondary-400 font-medium truncate max-w-[150px]">
                                                                    🏛️ {c.organizationName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-secondary-100 bg-secondary-50">
                            <button
                                onClick={handleStartNewChat}
                                disabled={selectedUsers.length === 0 || (isGroup && !groupName.trim())}
                                className="btn btn-primary w-full py-4 rounded-2xl shadow-xl shadow-primary-200 font-bold tracking-wide transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isGroup ? 'Create Group Chat' : 'Start Conversation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ChatPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    return (
        <DashboardLayout userRole={user?.role}>
            <Suspense fallback={
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            }>
                <ChatContent />
            </Suspense>
        </DashboardLayout>
    );
}
