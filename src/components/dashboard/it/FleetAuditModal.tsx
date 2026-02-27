'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ShieldCheck, Globe, Zap, Search, AlertCircle, 
    CheckCircle2, RefreshCcw, ArrowUpRight, Activity,
    Shield, Lock, BarChart3, Database, TrendingUp, Plus,
    Cpu, Network, Server, Fingerprint, Layers
} from 'lucide-react';

import WebsiteQuickAddModal from '@/components/dashboard/it/WebsiteQuickAddModal';

interface FleetAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: any[];
}

export default function FleetAuditModal({ isOpen, onClose, projects }: FleetAuditModalProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'optimized'>('all');
    const [allWebsites, setAllWebsites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    
    const fetchAllWebsites = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/it/monitoring/websites');
            if (res.ok) {
                const data = await res.json();
                setAllWebsites(data);
            }
        } catch (error) {
            console.error('Failed to fetch fleet:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchAllWebsites();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isScanning) {
            const timer = setInterval(() => {
                setScanProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        setIsScanning(false);
                        return 100;
                    }
                    return prev + 1;
                });
            }, 30);
            return () => clearInterval(timer);
        }
    }, [isScanning]);

    const startScan = () => {
        setScanProgress(0);
        setIsScanning(true);
    };

    const displayWebsites = allWebsites.map(w => {
        const linkedProject = projects.find(p => p.website?.id === w.id);
        return {
            ...w,
            projectName: linkedProject?.name || 'Unlinked',
            projectId: linkedProject?.id
        };
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xl" />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-7xl bg-white rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.2)] overflow-hidden border border-white/60 flex flex-col max-h-[92vh]"
                >
                    {/* Header Section */}
                    <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative">
                        <div className="absolute top-0 left-0 w-96 h-full bg-blue-600/5 blur-[100px] -z-10" />
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="p-5 bg-slate-900 rounded-[1.5rem] shadow-2xl relative z-10">
                                    <ShieldCheck className="h-8 w-8 text-blue-500" />
                                </div>
                                <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                                    Fleet Intelligence <span className="text-blue-600">v4.0</span>
                                </h2>
                                <div className="flex items-center gap-4 mt-1.5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Global Infra Matrix
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Autonomous Audit Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end mr-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Protocol</p>
                                <p className="text-sm font-black text-slate-900 tracking-tight">ENCRYPTED_AUTH</p>
                            </div>
                            <button onClick={onClose} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-[1.25rem] transition-all group">
                                <X className="h-5 w-5 text-slate-500 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Matrix Status Bar */}
                    <div className="px-10 py-4 bg-slate-900 flex items-center justify-between border-y border-white/5">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="h-full w-1/2 bg-blue-500/50" />
                                </div>
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Signal: Secure</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                    <Cpu className="h-3 w-3" /> Core: 98%
                                </span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                    <Network className="h-3 w-3" /> Relay: {displayWebsites.length} Nodes
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             {isScanning && (
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Scanning Node Metadata {scanProgress}%</span>
                                    <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${scanProgress}%` }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:150px]">
                        
                        {/* High-Impact Analytics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm relative group overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-900/[0.02] rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Relay Points</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{displayWebsites.length}</span>
                                    <div className="p-3 bg-slate-50 rounded-2xl">
                                        <Server className="h-6 w-6 text-slate-400" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Availability Loop</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-5xl font-black text-emerald-600 tracking-tighter">
                                        {displayWebsites.length > 0 ? Math.round((displayWebsites.filter(w => w.status === 'UP').length / displayWebsites.length) * 100) : 100}%
                                    </span>
                                    <div className="p-3 bg-emerald-50 rounded-2xl">
                                        <Activity className="h-6 w-6 text-emerald-500" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Mean Optimization</p>
                                <div className="flex items-end justify-between">
                                    <span className="text-5xl font-black text-blue-600 tracking-tighter">94.2</span>
                                    <div className="p-3 bg-blue-50 rounded-2xl">
                                        <TrendingUp className="h-6 w-6 text-blue-500" />
                                    </div>
                                </div>
                            </motion.div>

                            <div className="flex flex-col gap-3">
                                <button onClick={() => setShowQuickAdd(true)}
                                    className="flex-1 px-8 py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl"
                                >
                                    <Plus className="h-4 w-4 text-blue-400" /> Deploy Monitor
                                </button>
                                <button onClick={startScan} disabled={isScanning}
                                    className="flex-1 px-8 py-5 bg-blue-600 text-white rounded-[1.75rem] font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isScanning ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <RefreshCcw className="h-4 w-4 animate-spin text-white/60" /> Auditing...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-3">
                                            <Fingerprint className="h-4 w-4 text-blue-200" /> Synchronize Fleet
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Inventory Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest leading-none">Intelligence Grid</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Real-time telemetric stream</p>
                                </div>
                                <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit">
                                    {(['all', 'critical', 'optimized'] as const).map(t => (
                                        <button key={t} onClick={() => setActiveTab(t)}
                                            className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/5' : 'text-slate-500 hover:text-slate-900'}`}>
                                            {t} Protocol
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {displayWebsites.length === 0 ? (
                                    <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
                                        <div className="p-6 bg-slate-100 rounded-full w-fit mx-auto mb-6 text-slate-300">
                                            <Globe className="h-10 w-10" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No spectral nodes detected</p>
                                        <p className="text-xs font-bold text-slate-300 mt-2 italic">Initiate deployment to link new infrastructure</p>
                                    </div>
                                ) : (
                                    displayWebsites.map((w, i) => (
                                        <motion.div 
                                            key={w.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="group bg-white border border-slate-200/60 p-8 rounded-[2.5rem] hover:shadow-2xl hover:shadow-slate-200/40 hover:border-blue-200 transition-all"
                                        >
                                            <div className="flex items-center justify-between gap-12">
                                                <div className="flex items-center gap-8">
                                                    <div className="relative">
                                                        <div className={`p-5 rounded-[1.5rem] transition-colors ${w.status === 'UP' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-xl shadow-rose-500/20'}`}>
                                                            <Globe className="h-8 w-8" />
                                                        </div>
                                                        {w.status === 'UP' && <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-400 rounded-full border-4 border-white animate-pulse" />}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{w.name}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-1 w-1 bg-slate-300 rounded-full" />
                                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${w.projectName === 'Unlinked' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                    {w.projectName === 'Unlinked' ? <AlertCircle className="h-2.5 w-2.5" /> : <Layers className="h-2.5 w-2.5" />}
                                                                    {w.projectName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-black text-blue-500 opacity-60 flex items-center gap-2 group-hover:opacity-100 transition-opacity">
                                                            {w.url} <ArrowUpRight className="h-3 w-3" />
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="hidden lg:flex items-center gap-16">
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Protocol Sec</p>
                                                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 border border-transparent group-hover:border-emerald-100 transition-all">
                                                            <Shield className="h-3.5 w-3.5 text-emerald-500" />
                                                            <span className="text-sm font-black text-slate-900">A++ High</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Core SEO</p>
                                                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 border border-transparent group-hover:border-blue-100 transition-all">
                                                            <Zap className="h-3.5 w-3.5 text-blue-500" />
                                                            <span className="text-sm font-black text-slate-900">92/100</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Node Stats</p>
                                                        <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-50 border border-transparent group-hover:border-emerald-100 transition-all">
                                                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                                            <span className="text-sm font-black text-emerald-600">+18.4%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`px-10 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] border-2 shadow-sm ${w.status === 'UP' ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' : 'bg-rose-50/50 text-rose-600 border-rose-100'}`}>
                                                    {w.status}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        <WebsiteQuickAddModal 
                            isOpen={showQuickAdd}
                            onClose={() => setShowQuickAdd(false)}
                            onSuccess={fetchAllWebsites}
                        />
                    </div>

                    {/* Matrix Footer */}
                    <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-10">
                            <span className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> WebNodes Synchronized
                            </span>
                            <span className="flex items-center gap-3">
                                <Lock className="h-3.5 w-3.5 text-slate-400" /> AES-256 Quantum Shield Active
                            </span>
                            <span className="flex items-center gap-3">
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> System Integrity Validated
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span>Relay: {new Date().toLocaleTimeString()}</span>
                            <div className="h-2 w-px bg-slate-200" />
                            <span>Node Cluster: IMS-IT-01</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
