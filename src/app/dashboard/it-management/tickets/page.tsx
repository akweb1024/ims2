'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Ticket, Plus, Filter, MessageSquare, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';

export default function ITTicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState('OPEN');

    // Form State
    const [editingTicket, setEditingTicket] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        category: 'HARDWARE',
        assetId: '',
        status: 'OPEN',
        resolution: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchTickets();
        fetchMyAssets();
    }, []);

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/it/tickets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTickets(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming this endpoint returns all assets, might need specific filter for "My Assets" if user is not admin
            // For now, let's just fetch all to populate dropdown
            const res = await fetch('/api/it/assets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAssets(await res.json());
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = editingTicket ? `/api/it/tickets/${editingTicket.id}` : '/api/it/tickets';
            const method = editingTicket ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchTickets();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/it/tickets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTickets();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setEditingTicket(null);
        setFormData({
            title: '',
            description: '',
            priority: 'MEDIUM',
            category: 'HARDWARE',
            assetId: '',
            status: 'OPEN',
            resolution: ''
        });
    };

    const openEditModal = (ticket: any) => {
        setEditingTicket(ticket);
        setFormData({
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            category: ticket.category || 'HARDWARE',
            assetId: ticket.assetId || '',
            status: ticket.status,
            resolution: ticket.resolution || ''
        });
        setShowModal(true);
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/it/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, status })
            });
            fetchTickets();
        } catch (error) {
            console.error(error);
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
            case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);

    const filteredTickets = tickets.filter((t: any) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OPEN') return ['OPEN', 'IN_PROGRESS'].includes(t.status);
        if (activeTab === 'RESOLVED') return t.status === 'RESOLVED';
        return t.status === activeTab;
    });

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">IT Service Desk</h1>
                        <p className="text-secondary-500 font-medium">Raise requests and track support tickets.</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn btn-primary px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 flex items-center gap-2"
                    >
                        <Plus size={16} /> New Request
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-secondary-200 pb-1">
                    {['OPEN', 'RESOLVED', 'CLOSED', 'ALL'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-bold text-xs uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}
                        >
                            {tab === 'OPEN' ? 'Active Issues' : tab}
                        </button>
                    ))}
                </div>

                {/* Kanban / List */}
                <div className="space-y-4">
                    {filteredTickets.map((ticket: any) => (
                        <div key={ticket.id} className="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-xs font-bold text-secondary-400 uppercase tracking-wider">{ticket.category}</span>
                                    {ticket.asset && (
                                        <div className="flex items-center gap-1 text-xs text-secondary-500 bg-secondary-50 px-2 py-1 rounded-full">
                                            <span className="opacity-60">Asset:</span>
                                            <span className="font-bold">{ticket.asset.name}</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-secondary-900">{ticket.title}</h3>
                                <p className="text-secondary-600 text-sm">{ticket.description}</p>

                                <div className="flex items-center gap-4 pt-2 text-xs text-secondary-400">
                                    <div className="flex items-center gap-1">
                                        <User size={12} />
                                        <span>{ticket.requester.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2 ml-auto">
                                        <button onClick={() => openEditModal(ticket)} className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700">View/Edit</button>
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(ticket.id)} className="text-[10px] font-black uppercase text-red-600 hover:text-red-700">Delete</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                                        ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>

                                {isAdmin && ticket.status !== 'CLOSED' && (
                                    <select
                                        className="select select-xs select-bordered w-full max-w-xs mt-2"
                                        value={ticket.status}
                                        onChange={(e) => handleStatusUpdate(ticket.id, e.target.value)}
                                    >
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredTickets.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-secondary-200">
                            <Ticket size={48} className="mx-auto text-secondary-200 mb-4" />
                            <p className="font-bold text-secondary-400">No tickets found.</p>
                        </div>
                    )}
                </div>

                {/* Create Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-6 bg-secondary-900 text-white">
                                <h2 className="text-xl font-black uppercase tracking-widest">{editingTicket ? 'Update Ticket' : 'Submit Support Request'}</h2>
                                <p className="text-white/60 text-xs font-medium">{editingTicket ? `Ticket #${editingTicket.id.slice(0, 8)}` : 'Describe your issue for the IT team'}</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Issue Summary</label>
                                    <input
                                        className="input w-full font-bold"
                                        placeholder="e.g. Email not syncing"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Priority</label>
                                        <select
                                            className="input w-full font-bold"
                                            value={formData.priority}
                                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Category</label>
                                        <select
                                            className="input w-full font-bold"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="HARDWARE">Hardware</option>
                                            <option value="SOFTWARE">Software / App</option>
                                            <option value="NETWORK">Network / Wifi</option>
                                            <option value="ACCESS">Access / Login</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Related Asset (Optional)</label>
                                    <select
                                        className="input w-full font-bold"
                                        value={formData.assetId}
                                        onChange={e => setFormData({ ...formData, assetId: e.target.value })}
                                    >
                                        <option value="">None / Not Applicable</option>
                                        {assets.map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.serialNumber})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Details</label>
                                    <textarea
                                        className="input w-full h-24 text-sm"
                                        placeholder="Please describe the problem..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {editingTicket && (
                                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-secondary-100">
                                        <div>
                                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Status</label>
                                            <select
                                                className="input w-full font-bold"
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        {formData.status === 'RESOLVED' && (
                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Resolution Notes</label>
                                                <textarea
                                                    className="input w-full h-20 text-sm"
                                                    placeholder="How was this issue resolved?"
                                                    value={formData.resolution}
                                                    onChange={e => setFormData({ ...formData, resolution: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary flex-1 py-3 font-bold rounded-xl">Cancel</button>
                                    <button onClick={handleSubmit} className="btn btn-primary flex-1 py-3 font-bold rounded-xl shadow-lg shadow-primary-200">
                                        {editingTicket ? 'Update Ticket' : 'Submit Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
