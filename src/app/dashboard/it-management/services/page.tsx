'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Search, Edit, Trash2, Zap, LayoutGrid, Loader2, X, Save, DollarSign, Clock, Layers, ArrowRight, ShieldCheck } from 'lucide-react';

interface ServiceDefinition {
    id: string; name: string; description: string | null;
    category: string; price: number; unit: string; estimatedDays: number | null;
}

const CATEGORY_CONFIG = {
    GENERAL: { bg: 'bg-slate-100/50', text: 'text-slate-600', dot: 'bg-slate-400', label: 'General' },
    SOFTWARE: { bg: 'bg-blue-100/50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Software' },
    HARDWARE: { bg: 'bg-orange-100/50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Hardware' },
    SUPPORT: { bg: 'bg-amber-100/50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Support' },
    INFRASTRUCTURE: { bg: 'bg-indigo-100/50', text: 'text-indigo-700', dot: 'bg-indigo-500', label: 'Infrastructure' },
    REVENUE: { bg: 'bg-emerald-100/50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Revenue' },
};

export default function ITServiceManagementPage() {
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);
    const [modalData, setModalData] = useState({ name: '', description: '', category: 'GENERAL', price: '', unit: 'each', estimatedDays: '' });
    const [saving, setSaving] = useState(false);

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/it/services');
            if (response.ok) setServices(await response.json());
        } catch (error) { console.error('Failed to fetch services:', error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleOpenModal = (service: ServiceDefinition | null = null) => {
        if (service) {
            setEditingService(service);
            setModalData({ name: service.name, description: service.description || '', category: service.category, price: service.price.toString(), unit: service.unit, estimatedDays: service.estimatedDays?.toString() || '' });
        } else {
            setEditingService(null);
            setModalData({ name: '', description: '', category: 'GENERAL', price: '', unit: 'each', estimatedDays: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingService ? `/api/it/services/${editingService.id}` : '/api/it/services';
            const response = await fetch(url, {
                method: editingService ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...modalData, price: parseFloat(modalData.price), estimatedDays: modalData.estimatedDays ? parseInt(modalData.estimatedDays) : null }),
            });
            if (response.ok) { setIsModalOpen(false); fetchServices(); }
            else { const err = await response.json(); alert(err.error || 'Failed to save service'); }
        } catch { alert('An unexpected error occurred'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Abort this service definition?')) return;
        try {
            const response = await fetch(`/api/it/services/${id}`, { method: 'DELETE' });
            if (response.ok) fetchServices();
            else alert('Failed to delete service');
        } catch (error) { console.error('Error deleting service:', error); }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="min-h-screen pb-20 space-y-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:200px] bg-repeat">
                
                {/* Modern Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
                >
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                                <Zap className="h-6 w-6 text-white" />
                            </div>
                            Service Catalog
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Standardizing digital offerings and infrastructure unit pricing.</p>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> Define New Service
                    </button>
                </motion.div>

                {/* Glass Search Area */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-1 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-inner group"
                >
                    <div className="p-6 flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input type="text" placeholder="Trace service definition, category or keyword..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400" />
                        </div>
                        <div className="bg-slate-900 rounded-xl px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                            {filteredServices.length} Active Modules
                        </div>
                    </div>
                </motion.div>

                {/* Content Area */}
                {loading ? (
                    <div className="py-32 flex flex-col items-center justify-center space-y-4">
                        <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Service Matrix...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center text-center">
                        <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/60 shadow-xl max-w-lg space-y-6">
                            <div className="h-20 w-20 rounded-[2.5rem] bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                                <LayoutGrid className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-900">Catalog Empty</h3>
                                <p className="text-slate-500 font-medium">No service definitions detected. Begin by establishing a new digital offering.</p>
                            </div>
                            <button onClick={() => handleOpenModal()}
                                className="px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all">
                                Establish First Service
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredServices.map((service, idx) => {
                                const cfg = CATEGORY_CONFIG[service.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.GENERAL;
                                return (
                                    <motion.div 
                                        key={service.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group relative bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/80 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all border-b-4 hover:border-b-blue-500 overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:shadow-xl group-hover:shadow-blue-200 transition-all">
                                                <Layers className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button onClick={() => handleOpenModal(service)} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(service.id)} className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:shadow-lg transition-all">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{service.name}</h3>
                                        <p className="text-slate-500 text-xs font-medium line-clamp-2 mb-8 min-h-[32px]">{service.description || 'Generic IT operational unit with standard delivery parameters.'}</p>

                                        <div className="space-y-6 pt-6 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate (INR)</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-black text-slate-900">₹{service.price.toLocaleString()}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/ {service.unit}</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${cfg.bg} ${cfg.text} border-current/10`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{cfg.label}</span>
                                                </div>
                                            </div>

                                            {service.estimatedDays && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    SLA: ~{service.estimatedDays} Operational Cycle{service.estimatedDays !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>

                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl transition-all group-hover:bg-blue-500/10" />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {/* Definitions Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />
                            
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden"
                            >
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                                            <Plus className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{editingService ? 'Refine Logic' : 'Establish Service'}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Offering Definition</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white hover:shadow-lg rounded-xl transition-all text-slate-400 hover:text-slate-900">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSave} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Module Heading</label>
                                        <input type="text" required value={modalData.name} onChange={(e) => setModalData({ ...modalData, name: e.target.value })} 
                                            className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" placeholder="e.g., Cloud Logic Optimization" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Description</label>
                                        <textarea value={modalData.description} onChange={(e) => setModalData({ ...modalData, description: e.target.value })} 
                                            className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 resize-none" rows={3} placeholder="Define service parameters..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rating (INR)</label>
                                            <input type="number" required value={modalData.price} onChange={(e) => setModalData({ ...modalData, price: e.target.value })} 
                                                className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20" placeholder="0.00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Metric Unit</label>
                                            <input type="text" value={modalData.unit} onChange={(e) => setModalData({ ...modalData, unit: e.target.value })} 
                                                className="w-full bg-white border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 shadow-sm" placeholder="each, hour..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">System Stream</label>
                                            <select value={modalData.category} onChange={(e) => setModalData({ ...modalData, category: e.target.value })} 
                                                className="w-full bg-white border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 shadow-sm">
                                                {Object.keys(CATEGORY_CONFIG).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Target SLA (Days)</label>
                                            <input type="number" value={modalData.estimatedDays} onChange={(e) => setModalData({ ...modalData, estimatedDays: e.target.value })} 
                                                className="w-full bg-white border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 shadow-sm" placeholder="e.g., 2" />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} 
                                            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">Abort</button>
                                        <button type="submit" disabled={saving} 
                                            className="flex-1 px-6 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            {editingService ? 'Commit Changes' : 'Deploy Module'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </DashboardLayout>
    );
}
