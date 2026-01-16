'use client';

import { useState, useEffect } from 'react';
import { useChat } from './ChatContext';
import { X, Search, CheckCircle2, User, Building2 } from 'lucide-react';

export default function CreateChatModal({ onClose }: { onClose: () => void }) {
    const { setActiveRoom, rooms } = useChat();
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGroup, setIsGroup] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [tab, setTab] = useState<'employees' | 'customers'>('employees');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
        fetchCustomers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : data.data || []);
        }
    };

    const fetchCustomers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/chat/customers', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setCustomers(await res.json());
    };

    const handleCreate = async () => {
        if (selectedIds.length === 0) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participantIds: selectedIds,
                    isGroup,
                    name: isGroup ? groupName : null
                })
            });

            if (res.ok) {
                const newRoom = await res.json();
                // Context will refresh rooms automatically or we can force it
                // For now, let's just close and maybe user sees it
                // Ideally we push to context rooms
                onClose();
                // We'd want to access setRooms here but strictly we should rely on the Sidebar polling or a refresh function
                // Let's reload page for simplicity or rely on sidebar update
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSelection = (id: string) => {
        if (isGroup) {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
            setSelectedIds([id]);
        }
    };

    const filteredList = (tab === 'employees' ? users : customers).filter(u => {
        const name = u.name || u.user?.name || '';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900">New Message</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {/* Toggle Group */}
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 bg-indigo-200 cursor-pointer" onClick={() => setIsGroup(!isGroup)}>
                            <span className={`${isGroup ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </div>
                        <span className="font-bold text-sm text-indigo-900">Create Group Chat</span>
                    </div>

                    {isGroup && (
                        <div className="animate-in slide-in-from-top-2">
                            <input
                                placeholder="Group Name"
                                className="w-full input"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setTab('employees')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'employees' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                        >
                            Employees
                        </button>
                        <button
                            onClick={() => setTab('customers')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${tab === 'customers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                        >
                            Customers
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            placeholder="Search people..."
                            className="w-full pl-10 input py-2 text-sm"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* User List */}
                    <div className="space-y-2">
                        {filteredList.map(item => {
                            const id = item.id || item.user?.id; // Handle both structures
                            const name = item.name || item.user?.name || item.email;
                            const role = item.role || item.customerType;
                            const isSelected = selectedIds.includes(id);

                            return (
                                <div
                                    key={id}
                                    onClick={() => toggleSelection(id)}
                                    className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer border transition-all ${isSelected
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {tab === 'employees' ? <User size={18} /> : <Building2 size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>{name}</h4>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">{role}</p>
                                    </div>
                                    {isSelected && <CheckCircle2 className="text-indigo-600" size={20} />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleCreate}
                        disabled={selectedIds.length === 0}
                        className="btn btn-primary w-full py-4 text-lg rounded-2xl shadow-xl shadow-indigo-200 disabled:opacity-50"
                    >
                        Start {isGroup ? 'Group' : 'Chat'}
                    </button>
                </div>
            </div>
        </div>
    );
}
