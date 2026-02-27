'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
    Computer, Plus, Search, Filter, AlertCircle, CheckCircle, 
    User, Server, Smartphone, List, LayoutGrid, X, Save,
    Cpu, Calendar, DollarSign, Fingerprint, Layers, Activity,
    Box, Monitor, HelpCircle, ArrowRight
} from 'lucide-react';

export default function ITAssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '', type: 'LAPTOP', serialNumber: '', status: 'AVAILABLE',
        assignedToId: '', details: '', value: '', purchaseDate: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchAssets();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setEmployees(await res.json());
        } catch (error) { console.error('Staff sync failure'); }
    };

    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/it/assets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAssets(await res.json());
        } catch (error) { console.error('Asset scan failure'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = editingAsset ? `/api/it/assets/${editingAsset.id}` : '/api/it/assets';
            const method = editingAsset ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchAssets();
                resetForm();
            }
        } catch (error) { console.error('Uplink failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to decommission this asset?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/it/assets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchAssets();
        } catch (error) { console.error('Decommission failed'); }
    };

    const resetForm = () => {
        setEditingAsset(null);
        setFormData({ name: '', type: 'LAPTOP', serialNumber: '', status: 'AVAILABLE', assignedToId: '', details: '', value: '', purchaseDate: '' });
    };

    const openEditModal = (asset: any) => {
        setEditingAsset(asset);
        setFormData({
            name: asset.name,
            type: asset.type,
            serialNumber: asset.serialNumber || '',
            status: asset.status,
            assignedToId: asset.assignedToId || '',  // This is already a User.id from the DB
            details: asset.details || '',
            value: asset.value?.toString() || '',
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const TYPE_THEME: Record<string, { icon: any, color: string }> = {
        LAPTOP: { icon: Monitor, color: 'text-blue-500 bg-blue-500/10' },
        DESKTOP: { icon: Computer, color: 'text-indigo-500 bg-indigo-500/10' },
        MOBILE: { icon: Smartphone, color: 'text-emerald-500 bg-emerald-500/10' },
        SERVER: { icon: Server, color: 'text-slate-500 bg-slate-500/10' },
        LICENSE: { icon: Fingerprint, color: 'text-amber-500 bg-amber-500/10' },
        OTHER: { icon: Box, color: 'text-rose-500 bg-rose-500/10' },
    };

    const STATUS_THEME: Record<string, string> = {
        AVAILABLE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        ASSIGNED: 'bg-blue-50 text-blue-600 border-blue-100',
        MAINTENANCE: 'bg-amber-50 text-amber-600 border-amber-100',
        RETIRED: 'bg-slate-50 text-slate-400 border-slate-200',
        LOST: 'bg-rose-50 text-rose-600 border-rose-100',
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);

    const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assignedTo?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-slate-600/20 border-t-slate-900 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Scanning Asset Matrix...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole={userRole}>
            <div className="min-h-screen bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:250px] bg-repeat pb-20">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* Header Architecture */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">Inventory Node</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hardware & License Repository</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4">
                            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm flex gap-1">
                                <button onClick={() => setViewMode('grid')} className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    <LayoutGrid size={18} />
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                                    <List size={18} />
                                </button>
                            </div>
                            {isAdmin && (
                                <button onClick={() => { resetForm(); setShowModal(true); }}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
                                >
                                    <Plus size={16} /> Register Asset
                                </button>
                            )}
                        </motion.div>
                    </div>

                    {/* Stats Deck */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-2">
                        {[
                            { label: 'Global Assets', val: assets.length, icon: Box, color: 'text-slate-900' },
                            { label: 'In Operation', val: assets.filter(a => a.status === 'ASSIGNED').length, icon: Activity, color: 'text-blue-600' },
                            { label: 'Unassigned', val: assets.filter(a => a.status === 'AVAILABLE').length, icon: CheckCircle, color: 'text-emerald-600' },
                            { label: 'Critical / Fault', val: assets.filter(a => ['MAINTENANCE', 'LOST'].includes(a.status)).length, icon: AlertCircle, color: 'text-rose-600' },
                        ].map((s, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                key={i} className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50 group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <s.icon className={`h-5 w-5 ${s.color} opacity-40 group-hover:opacity-100 transition-all`} />
                                    <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Search / Filter Row */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-4 border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-6"
                    >
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-slate-600 transition-colors" />
                            <input 
                                type="text" placeholder="Scan serials, models or agents..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-8 py-4 text-xs font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                            />
                        </div>
                    </motion.div>

                    {/* Asset Content Matrix */}
                    <AnimatePresence mode='wait'>
                        {viewMode === 'grid' ? (
                            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                            >
                                {filteredAssets.map((asset, idx) => {
                                    const Theme = TYPE_THEME[asset.type] || TYPE_THEME.OTHER;
                                    return (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                                            key={asset.id} className="group bg-white/80 hover:bg-white backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 transition-all relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`p-4 rounded-2xl ${Theme.color} group-hover:scale-110 transition-transform duration-500`}>
                                                    <Theme.icon size={24} />
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_THEME[asset.status]}`}>
                                                    {asset.status}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-lg text-slate-900 mb-1 group-hover:text-slate-600 transition-colors">{asset.name}</h3>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <Layers className="h-3 w-3" /> {asset.serialNumber || 'No Serial Registry'}
                                            </div>

                                            <div className="pt-6 border-t border-slate-50 space-y-4">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Prime Agent</span>
                                                    <span className="text-slate-900">{asset.assignedTo?.name || 'Unassigned'}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-slate-400">Fiscal Value</span>
                                                    <span className="text-slate-900">{asset.value ? `₹${asset.value}` : 'N/A'}</span>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex gap-4 pt-2">
                                                        <button onClick={() => openEditModal(asset)} className="text-[9px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-all flex items-center gap-1.5">
                                                            Edit <ArrowRight size={10} />
                                                        </button>
                                                        <button onClick={() => handleDelete(asset.id)} className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all ml-auto">
                                                            Decom
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        ) : (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                                            <tr>
                                                <th className="px-10 py-6">Asset Core</th>
                                                <th className="px-10 py-6">Type</th>
                                                <th className="px-10 py-6">Registry #</th>
                                                <th className="px-10 py-6">State</th>
                                                <th className="px-10 py-6">Prime Agent</th>
                                                {isAdmin && <th className="px-10 py-6 text-right">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredAssets.map((asset, idx) => (
                                                <tr key={asset.id} className="hover:bg-slate-50 transition-colors group cursor-crosshair">
                                                    <td className="px-10 py-6 font-black text-slate-900 text-sm">{asset.name}</td>
                                                    <td className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.type}</td>
                                                    <td className="px-10 py-6 font-black text-slate-600 text-xs">{asset.serialNumber || '-'}</td>
                                                    <td className="px-10 py-6">
                                                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${STATUS_THEME[asset.status]}`}>
                                                            {asset.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">{asset.assignedTo?.name || '-'}</td>
                                                    {isAdmin && (
                                                        <td className="px-10 py-6 text-right">
                                                            <div className="flex justify-end gap-4">
                                                                <button onClick={() => openEditModal(asset)} className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-white p-3 rounded-2xl shadow-sm transition-all">Edit</button>
                                                                <button onClick={() => handleDelete(asset.id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 p-3 rounded-2xl transition-all">Del</button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Asset Registration Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto"
                    >
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white"
                        >
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{editingAsset ? 'Update Registry' : 'Register Asset'}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Hardware & Identity Management</p>
                                </div>
                                <button onClick={() => { setShowModal(false); resetForm(); }} className="p-4 hover:bg-white rounded-2xl transition-all shadow-sm">
                                    <X className="h-5 w-5 text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Moniker *</label>
                                        <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white transition-all outline-none"
                                            placeholder="e.g. Precision Workstation Z420" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Type</label>
                                        <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[10px] font-black text-slate-900 uppercase focus:bg-white outline-none"
                                            value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="LAPTOP">Laptop / Portable</option>
                                            <option value="DESKTOP">Desktop / Tower</option>
                                            <option value="MOBILE">Mobile / Tablet</option>
                                            <option value="SERVER">Server / Compute Node</option>
                                            <option value="LICENSE">Digital License</option>
                                            <option value="OTHER">Miscellaneous</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Serial / GUID</label>
                                        <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white transition-all outline-none"
                                            placeholder="S/N: XXX-XXX-XXX" value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset State</label>
                                        <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[10px] font-black text-slate-900 uppercase focus:bg-white outline-none"
                                            value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="AVAILABLE">Available</option>
                                            <option value="ASSIGNED">Operational / Assigned</option>
                                            <option value="MAINTENANCE">Maintenance Rack</option>
                                            <option value="RETIRED">Archive / Retired</option>
                                            <option value="LOST">Lost / Compromised</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Value (₹)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-slate-900 focus:bg-white transition-all outline-none"
                                                placeholder="0.00" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procurement Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                            <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-slate-900 focus:bg-white transition-all outline-none"
                                                value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Command Assignment</label>
                                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-[10px] font-black text-slate-900 uppercase focus:bg-white outline-none"
                                        value={formData.assignedToId} onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}>
                                        <option value="">-- No Agent Assigned --</option>
                                        {employees.map(emp => (
                                            <option key={emp.user?.id || emp.id} value={emp.user?.id || emp.userId}>
                                                {emp.user?.name || emp.name} ({emp.employeeId || 'EXT'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technical Specs</label>
                                    <textarea className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs text-slate-600 focus:bg-white transition-all outline-none resize-none"
                                        rows={3} placeholder="Full hardware manifest..." value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="submit" className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200">
                                        <Save className="h-4 w-4 inline-block mr-2" /> {editingAsset ? 'Update Protocol' : 'Initialize Registry'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
