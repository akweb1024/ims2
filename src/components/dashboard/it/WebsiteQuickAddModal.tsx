'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Save, Loader2, Link as LinkIcon, Shield, Activity } from 'lucide-react';

interface WebsiteQuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newWebsite: any) => void;
}

export default function WebsiteQuickAddModal({ isOpen, onClose, onSuccess }: WebsiteQuickAddModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        category: 'DEVELOPMENT',
        frequency: 5,
        notifyEmail: true,
        notifyWhatsapp: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/it/monitoring/websites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create website monitor');
            }

            const newWebsite = await res.json();
            onSuccess(newWebsite);
            onClose();
            // Reset form
            setFormData({
                name: '',
                url: '',
                category: 'DEVELOPMENT',
                frequency: 5,
                notifyEmail: true,
                notifyWhatsapp: true
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl">
                                <Globe className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">New Node</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deploy Website Monitor</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instance Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Primary Dashboard"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live URL</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input 
                                        type="url" 
                                        required
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://example.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-slate-900 focus:bg-white outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check Frequency</label>
                                    <select 
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white outline-none transition-all"
                                    >
                                        <option value={1}>1 min</option>
                                        <option value={5}>5 mins</option>
                                        <option value={15}>15 mins</option>
                                        <option value={60}>1 hour</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 focus:bg-white outline-none transition-all"
                                    >
                                        <option value="DEVELOPMENT">Development</option>
                                        <option value="PRODUCTION">Production</option>
                                        <option value="CLIENT">Client</option>
                                        <option value="INTERNAL">Internal</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, notifyEmail: !formData.notifyEmail })}
                                    className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.notifyEmail ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    <Shield className="h-4 w-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Email Alerts</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, notifyWhatsapp: !formData.notifyWhatsapp })}
                                    className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${formData.notifyWhatsapp ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    <Activity className="h-4 w-4" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">WA Alerts</span>
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Deploy Monitor
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
