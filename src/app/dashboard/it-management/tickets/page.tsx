'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
    Ticket, Plus, User, Clock, Loader2, X, Save, 
    Filter, Search, ArrowRight, CheckCircle2, AlertCircle,
    HardDrive, Monitor, Wifi, Lock, Shield, ChevronRight,
    Command, Zap, Layers, RefreshCcw
} from 'lucide-react';

interface TicketItem {
    id: string; title: string; description: string; priority: string;
    category: string; status: string; resolution?: string;
    assetId?: string;
    asset?: { name: string; serialNumber: string };
    requester: { id: string; name: string; email: string };
    createdAt: string; updatedAt: string;
}

const PRIORITY_THEME: Record<string, { bg: string, text: string, shadow: string, icon: any }> = {
    CRITICAL: { bg: 'bg-rose-500', text: 'text-rose-500', shadow: 'shadow-rose-200', icon: Shield },
    HIGH: { bg: 'bg-amber-500', text: 'text-amber-500', shadow: 'shadow-amber-200', icon: AlertCircle },
    MEDIUM: { bg: 'bg-indigo-500', text: 'text-indigo-500', shadow: 'shadow-indigo-200', icon: Clock },
    LOW: { bg: 'bg-emerald-500', text: 'text-emerald-500', shadow: 'shadow-emerald-200', icon: CheckCircle2 },
};

const CATEGORY_ICON: Record<string, any> = {
    HARDWARE: HardDrive,
    SOFTWARE: Monitor,
    NETWORK: Wifi,
    ACCESS: Lock,
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
    const [searchQuery, setSearchQuery] = useState('');
    
    const [formData, setFormData] = useState({ 
        title: '', description: '', priority: 'MEDIUM', 
        category: 'HARDWARE', assetId: '', status: 'OPEN', resolution: '' 
    });

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
        } catch { console.error('Uplink failed'); }
        finally { setLoading(false); }
    };

    const fetchMyAssets = async () => {
        try {
            const res = await fetch('/api/it/assets');
            if (res.ok) setAssets(await res.json());
        } catch { console.error('Asset scan failed'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingTicket ? `/api/it/tickets/${editingTicket.id}` : '/api/it/tickets';
            const method = editingTicket ? 'PATCH' : 'POST';
            const res = await fetch(url, { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(formData) 
            });
            if (res.ok) { setShowModal(false); resetForm(); fetchTickets(); }
        } catch { alert('Transmission failed'); }
        finally { setSubmitting(false); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await fetch(`/api/it/tickets/${id}`, { 
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ status }) 
            });
            fetchTickets();
        } catch { console.error('Status sync failed'); }
    };

    const resetForm = () => {
        setEditingTicket(null);
        setFormData({ title: '', description: '', priority: 'MEDIUM', category: 'HARDWARE', assetId: '', status: 'OPEN', resolution: '' });
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);

    const filteredTickets = tickets.filter((t) => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.description.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        
        if (activeTab === 'ALL') return true;
        if (activeTab === 'OPEN') return ['OPEN', 'IN_PROGRESS'].includes(t.status);
        if (activeTab === 'RESOLVED') return t.status === 'RESOLVED';
        return t.status === activeTab;
    });

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50 relative overflow-hidden">
                {/* Visual Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-6xl mx-auto space-y-10 py-10 px-4 relative z-10">
                    
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-4 border-b border-slate-200/60">
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                                    <Zap className="h-5 w-5 text-white" />
                                </div>
                                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">IT Command Center</h1>
                            </div>
                            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                <Command className="h-4 w-4" /> Systems Monitoring & Support Dispatch
                            </p>
                        </motion.div>
                        
                        <div className="flex items-center gap-4">
                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={fetchTickets}
                                className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                            >
                                <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                            </motion.button>
                            <motion.button 
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05, translateY: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { resetForm(); setShowModal(true); }}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm tracking-wide flex items-center gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                            >
                                <Plus className="h-5 w-5" /> Raise Ticket
                            </motion.button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white/70 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-xl shadow-slate-200/40 flex flex-col lg:flex-row items-center gap-6"
                    >
                        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar">
                            {['OPEN', 'RESOLVED', 'CLOSED', 'ALL'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        activeTab === tab 
                                        ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {tab === 'OPEN' ? 'Active Matrix' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" placeholder="Search operational protocols, assets or requester metadata..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-100/50 rounded-2xl pl-16 pr-8 py-4 text-sm font-medium text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </motion.div>

                    {/* Content Grid */}
                    {loading ? (
                        <div className="py-32 flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Layers className="h-6 w-6 text-indigo-600/30" />
                                </div>
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Node Data...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center bg-white/40 backdrop-blur-md rounded-[3rem] border border-dashed border-slate-300">
                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Ticket className="h-10 w-10 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Active Logs Detected</h3>
                            <p className="text-slate-500 font-medium">All systems nominal across current filter parameters.</p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            <AnimatePresence mode='popLayout'>
                                {filteredTickets.map((ticket, idx) => {
                                    const Theme = PRIORITY_THEME[ticket.priority] || PRIORITY_THEME.LOW;
                                    const CatIcon = CATEGORY_ICON[ticket.category] || Ticket;
                                    return (
                                        <motion.div 
                                            layout
                                            key={ticket.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
                                            onClick={() => { 
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
                                            }}
                                            className="group bg-white/60 hover:bg-white backdrop-blur-xl rounded-[2.5rem] p-1 border border-white/80 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-100 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="p-8 flex flex-col lg:flex-row items-start lg:items-center gap-10">
                                                {/* Left: Metadata & Status */}
                                                <div className="flex flex-col items-center gap-3 shrink-0 lg:w-32">
                                                    <div className={`p-4 rounded-3xl ${Theme.bg} bg-opacity-10 ${Theme.text} shadow-sm flex items-center justify-center mb-1 group-hover:scale-110 transition-transform`}>
                                                        <Theme.icon className="h-6 w-6" />
                                                    </div>
                                                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${Theme.bg} text-white ${Theme.shadow} shadow-lg`}>
                                                        {ticket.priority}
                                                    </div>
                                                </div>

                                                {/* Middle: Content */}
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                                                            <CatIcon className="h-3.5 w-3.5" /> {ticket.category}
                                                        </span>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                            ID: {ticket.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors mb-3 leading-tight">{ticket.title}</h3>
                                                        <p className="text-slate-500 text-sm font-medium line-clamp-2 max-w-3xl leading-relaxed">{ticket.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-6 pt-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-[10px] text-white font-black shadow-lg">
                                                                {ticket.requester.name.charAt(0)}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{ticket.requester.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 capitalize">
                                                            <Clock className="h-3.5 w-3.5 text-slate-300" /> {new Date(ticket.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex flex-col items-center lg:items-end gap-4 shrink-0 lg:w-48">
                                                    <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                                        ticket.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50' :
                                                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-50' :
                                                        'bg-slate-50 text-slate-400 border-slate-200'
                                                    }`}>
                                                        {ticket.status.replace('_', ' ')}
                                                    </div>
                                                    {isAdmin && (
                                                        <select 
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={(e) => handleStatusUpdate(ticket.id, e.target.value)}
                                                            value={ticket.status}
                                                            className="w-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-2xl px-6 py-3 cursor-pointer border-none outline-none focus:ring-4 ring-indigo-500/20 shadow-xl transition-all"
                                                        >
                                                            <option value="OPEN">Open Protocol</option>
                                                            <option value="IN_PROGRESS">Active Logic</option>
                                                            <option value="RESOLVED">Resolution Handled</option>
                                                            <option value="CLOSED">Secure Close</option>
                                                        </select>
                                                    )}
                                                </div>
                                                
                                                {/* Hover Indication */}
                                                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:right-8 transition-all duration-300">
                                                    <ChevronRight className="h-8 w-8 text-indigo-200" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Modal Architecture */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 40, opacity: 0 }} 
                            animate={{ scale: 1, y: 0, opacity: 1 }} 
                            exit={{ scale: 0.9, y: 40, opacity: 0 }}
                            className="bg-white rounded-[3.5rem] shadow-3xl w-full max-w-2xl overflow-hidden border border-white relative"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] pointer-events-none -translate-x-32 -translate-y-32" />
                            
                            <div className="p-12 pb-8 flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingTicket ? 'Edit Transmission' : 'New Support Request'}</h2>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operational Intelligence & Issue Tracking</p>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => { setShowModal(false); resetForm(); }} 
                                    className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all font-bold"
                                >
                                    <X className="h-6 w-6" />
                                </motion.button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-12 pt-0 space-y-8 relative z-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Descriptor *</label>
                                    <input className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-8 py-5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all outline-none" 
                                        placeholder="Brief summary of the disruption..." required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Priority</label>
                                        <div className="relative">
                                            <select className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-8 py-5 text-[10px] font-black text-slate-900 uppercase focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none appearance-none cursor-pointer" 
                                                value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                                <option value="LOW">Low Threshold</option>
                                                <option value="MEDIUM">Standard Operational</option>
                                                <option value="HIGH">High Criticality</option>
                                                <option value="CRITICAL">Critical Disruption</option>
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logic Segment</label>
                                        <div className="relative">
                                            <select className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-8 py-5 text-[10px] font-black text-slate-900 uppercase focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none appearance-none cursor-pointer" 
                                                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                <option value="HARDWARE">Physical Assets</option>
                                                <option value="SOFTWARE">Kernel & Applications</option>
                                                <option value="NETWORK">Data Transmission</option>
                                                <option value="ACCESS">Credential / Access</option>
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disruption Intel *</label>
                                    <textarea className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-8 py-5 text-sm font-medium text-slate-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all outline-none resize-none" 
                                        rows={5} placeholder="Full diagnostic description of the fault condition..." required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                
                                <div className="flex gap-4 pt-6">
                                    <motion.button 
                                        type="submit" disabled={submitting} 
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (editingTicket ? (
                                            <>
                                                <Save className="h-5 w-5" /> Commit Updates
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-5 w-5 fill-white shadow-lg shadow-white" /> Initialize Dispatch
                                            </>
                                        ))}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
