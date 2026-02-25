'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Ticket, Plus, User, Clock, Loader2, X, Save } from 'lucide-react';

interface TicketItem {
    id: string; title: string; description: string; priority: string;
    category: string; status: string; resolution?: string;
    assetId?: string;
    asset?: { name: string; serialNumber: string };
    requester: { id: string; name: string; email: string };
    createdAt: string; updatedAt: string;
}

const PRIORITY_COLOR: Record<string, string> = {
    CRITICAL: 'bg-danger-100 text-danger-700 border-danger-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM: 'bg-primary-100 text-primary-700 border-primary-200',
    LOW: 'bg-secondary-100 text-secondary-600 border-secondary-200',
};

const STATUS_COLOR: Record<string, string> = {
    OPEN: 'bg-primary-100 text-primary-700',
    IN_PROGRESS: 'bg-warning-100 text-warning-700',
    RESOLVED: 'bg-success-100 text-success-700',
    CLOSED: 'bg-secondary-100 text-secondary-500',
};

export default function ITTicketsPage() {
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState('OPEN');
    const [editingTicket, setEditingTicket] = useState<TicketItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'HARDWARE', assetId: '', status: 'OPEN', resolution: '' });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchTickets();
        fetchMyAssets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/it/tickets');
            if (res.ok) setTickets(await res.json());
        } catch { console.error('Failed to fetch tickets'); }
        finally { setLoading(false); }
    };

    const fetchMyAssets = async () => {
        try {
            const res = await fetch('/api/it/assets');
            if (res.ok) setAssets(await res.json());
        } catch { console.error('Failed to fetch assets'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingTicket ? `/api/it/tickets/${editingTicket.id}` : '/api/it/tickets';
            const method = editingTicket ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
            if (res.ok) { setShowModal(false); resetForm(); fetchTickets(); }
        } catch { alert('Failed to submit ticket'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this ticket?')) return;
        try {
            const res = await fetch(`/api/it/tickets/${id}`, { method: 'DELETE' });
            if (res.ok) fetchTickets();
        } catch { console.error('Delete failed'); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await fetch(`/api/it/tickets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
            fetchTickets();
        } catch { console.error('Status update failed'); }
    };

    const resetForm = () => {
        setEditingTicket(null);
        setFormData({ title: '', description: '', priority: 'MEDIUM', category: 'HARDWARE', assetId: '', status: 'OPEN', resolution: '' });
    };

    const openEditModal = (ticket: TicketItem) => {
        setEditingTicket(ticket);
        setFormData({ title: ticket.title, description: ticket.description, priority: ticket.priority, category: ticket.category || 'HARDWARE', assetId: ticket.assetId || '', status: ticket.status, resolution: ticket.resolution || '' });
        setShowModal(true);
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);

    const filteredTickets = tickets.filter((t) => {
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OPEN') return ['OPEN', 'IN_PROGRESS'].includes(t.status);
        if (activeTab === 'RESOLVED') return t.status === 'RESOLVED';
        return t.status === activeTab;
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                                <Ticket className="h-5 w-5 text-orange-600" />
                            </span>
                            IT Service Desk
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Raise requests and track support tickets</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary text-sm">
                        <Plus className="h-4 w-4" /> New Request
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-secondary-200">
                    {['OPEN', 'RESOLVED', 'CLOSED', 'ALL'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-700'}`}>
                            {tab === 'OPEN' ? 'Active Issues' : tab}
                        </button>
                    ))}
                </div>

                {/* Tickets List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="card-premium flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mb-4">
                            <Ticket className="h-7 w-7 text-secondary-400" />
                        </div>
                        <p className="font-semibold text-secondary-900 mb-1">No tickets found</p>
                        <p className="text-secondary-400 text-sm">No {activeTab.toLowerCase()} tickets at the moment.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket.id} className="card-premium flex flex-col md:flex-row gap-5">
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${PRIORITY_COLOR[ticket.priority] || 'bg-secondary-100 text-secondary-600 border-secondary-200'}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className="text-xs font-semibold text-secondary-400 uppercase tracking-wider">{ticket.category}</span>
                                        {ticket.asset && (
                                            <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-0.5 rounded-full">
                                                Asset: <strong>{ticket.asset.name}</strong>
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-secondary-900">{ticket.title}</h3>
                                    <p className="text-secondary-600 text-sm line-clamp-2">{ticket.description}</p>
                                    <div className="flex items-center gap-4 pt-1 text-xs text-secondary-400">
                                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{ticket.requester.name}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        <div className="flex gap-3 ml-auto">
                                            <button onClick={() => openEditModal(ticket)} className="text-primary-600 font-bold text-xs hover:underline">View/Edit</button>
                                            {isAdmin && <button onClick={() => handleDelete(ticket.id)} className="text-danger-600 font-bold text-xs hover:underline">Delete</button>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${STATUS_COLOR[ticket.status] || 'bg-secondary-100 text-secondary-500'}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    {isAdmin && ticket.status !== 'CLOSED' && (
                                        <select className="text-xs border border-secondary-200 rounded-xl px-3 py-1.5 bg-white text-secondary-700 focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
                                            value={ticket.status} onChange={(e) => handleStatusUpdate(ticket.id, e.target.value)} title="Update status">
                                            <option value="OPEN">Open</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="RESOLVED">Resolved</option>
                                            <option value="CLOSED">Closed</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-secondary-900">{editingTicket ? 'Update Ticket' : 'Submit Support Request'}</h2>
                                    <p className="text-xs text-secondary-400 mt-0.5">{editingTicket ? `Ticket #${editingTicket.id.slice(0, 8)}` : 'Describe your issue for the IT team'}</p>
                                </div>
                                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-secondary-100 rounded-xl transition-colors">
                                    <X className="h-5 w-5 text-secondary-500" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="label-premium">Issue Summary *</label>
                                    <input className="input-premium" placeholder="e.g. Email not syncing" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-premium">Priority</label>
                                        <select className="input-premium" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} title="Priority">
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label-premium">Category</label>
                                        <select className="input-premium" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} title="Category">
                                            <option value="HARDWARE">Hardware</option>
                                            <option value="SOFTWARE">Software / App</option>
                                            <option value="NETWORK">Network / WiFi</option>
                                            <option value="ACCESS">Access / Login</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-premium">Related Asset (Optional)</label>
                                    <select className="input-premium" value={formData.assetId} onChange={e => setFormData({ ...formData, assetId: e.target.value })} title="Asset">
                                        <option value="">None / Not Applicable</option>
                                        {assets.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.serialNumber})</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Details *</label>
                                    <textarea className="input-premium" rows={3} placeholder="Please describe the problem..." required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                {editingTicket && (
                                    <div className="space-y-4 pt-3 border-t border-secondary-100">
                                        <div>
                                            <label className="label-premium">Status</label>
                                            <select className="input-premium" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} title="Status">
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        {formData.status === 'RESOLVED' && (
                                            <div>
                                                <label className="label-premium">Resolution Notes</label>
                                                <textarea className="input-premium" rows={2} placeholder="How was this issue resolved?" value={formData.resolution} onChange={e => setFormData({ ...formData, resolution: e.target.value })} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 btn border border-secondary-200 text-secondary-600 hover:bg-secondary-50">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 btn btn-primary disabled:opacity-50">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {editingTicket ? 'Update Ticket' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
