'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Globe, Shield, Zap, Search, Layout, BarChart3, AlertCircle, 
    CheckCircle2, Info, ArrowUpRight, Cpu, MousePointer2 
} from 'lucide-react';

interface AuditData {
    id: string;
    url: string;
    name: string;
    overallScore: number;
    seo: {
        score: number;
        title: string;
        metaDescription: string;
        headers: { h1: number; h2: number; h3: number };
        backlinks: number;
        keywords: string[];
        loadTime: string;
        mobileFriendly: boolean;
    };
    aeo: {
        score: number;
        directAnswers: number;
        featuredSnippets: number;
        voiceSearchScore: number;
        readability: string;
        structuredDataBreadcrumbs: boolean;
    };
    geo: {
        score: number;
        aiVisibility: string;
        contextualRelevance: number;
        citationProbability: string;
        brandAuthority: number;
    };
    schema: {
        score: number;
        types: string[];
        isVALID: boolean;
        errors: number;
        warnings: number;
    };
    security: {
        score: number;
        sslStatus: string;
        sslExpiry: string;
        securityHeaders: {
            csp: boolean;
            hsts: boolean;
            xfo: boolean;
        };
        vulnerabilities: number;
        malwareScan: string;
    };
    traffic: {
        score: number;
        monthlyVisits: number;
        bounceRate: string;
        avgSessionDuration: string;
        growth: string;
    };
}

interface WebsiteAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    websiteId: string;
    websiteName: string;
}

export default function WebsiteAuditModal({ isOpen, onClose, websiteId, websiteName }: WebsiteAuditModalProps) {
    const [loading, setLoading] = useState(true);
    const [auditData, setAuditData] = useState<AuditData | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'aeo' | 'geo' | 'security' | 'traffic'>('overview');

    useEffect(() => {
        if (isOpen && websiteId) {
            fetchAudit();
        }
    }, [isOpen, websiteId]);

    const fetchAudit = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/it/monitoring/websites/${websiteId}/analysis`);
            if (res.ok) {
                setAuditData(await res.json());
            }
        } catch (err) {
            console.error('Audit failed', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const ScoreRing = ({ score, size = 60, stroke = 4 }: { score: number; size?: number; stroke?: number }) => {
        const radius = (size - stroke) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (score / 100) * circumference;
        const color = score > 80 ? '#10b981' : score > 60 ? '#f59e0b' : '#ef4444';

        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90 w-full h-full">
                    <circle cx={size / 2} cy={size / 2} r={radius} stroke="#f1f5f9" strokeWidth={stroke} fill="transparent" />
                    <motion.circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="transparent"
                        strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: "easeOut" }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black" style={{ color }}>{score}</span>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
                
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl shadow-slate-900/20 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-blue-600 rounded-[1.5rem] shadow-xl shadow-blue-200">
                                <Globe className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">Vanguard UI Audit</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{websiteName} • Intelligence Pulse</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-20">
                            <div className="relative">
                                <div className="h-20 w-20 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                                <Cpu className="absolute inset-0 m-auto h-8 w-8 text-blue-600 animate-pulse" />
                            </div>
                            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Generating Neural Audit Report...</p>
                        </div>
                    ) : auditData ? (
                        <>
                            {/* Tabs */}
                            <div className="px-8 pt-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-50">
                                {[
                                    { id: 'overview', label: 'Matrix', icon: Layout },
                                    { id: 'seo', label: 'SEO/Indexing', icon: Search },
                                    { id: 'aeo', label: 'Answers (AEO)', icon: Info },
                                    { id: 'geo', label: 'AI Experience', icon: Cpu },
                                    { id: 'security', label: 'Fortress', icon: Shield },
                                    { id: 'traffic', label: 'Flow', icon: BarChart3 },
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-6 py-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <tab.icon className="h-4 w-4" /> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:150px]">
                                
                                {activeTab === 'overview' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col items-center text-center">
                                                <ScoreRing score={auditData.overallScore} size={120} stroke={10} />
                                                <h4 className="mt-6 text-2xl font-black text-slate-900 tracking-tight">Vanguard Score</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-4">Composite site health index</p>
                                            </div>
                                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Latency', val: auditData.seo.loadTime, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
                                                    { label: 'Security Level', val: auditData.security.sslStatus, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                                    { label: 'Mobile Link', val: auditData.seo.mobileFriendly ? 'Active' : 'Offline', icon: MousePointer2, color: 'text-purple-500', bg: 'bg-purple-50' },
                                                    { label: 'Growth', val: auditData.traffic.growth, icon: ArrowUpRight, color: 'text-orange-500', bg: 'bg-orange-50' }
                                                ].map(stat => (
                                                    <div key={stat.label} className="bg-white/80 p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-5">
                                                        <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>
                                                            <stat.icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                                            <p className="text-sm font-black text-slate-900 tracking-tight">{stat.val}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl" />
                                                <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                                                    <Cpu className="h-4 w-4 text-blue-400" /> Neural Insight
                                                </h4>
                                                <p className="text-sm leading-relaxed text-slate-300 italic">
                                                    The system detects a {auditData.overallScore > 80 ? 'highly optimized' : 'moderately efficient'} architecture. 
                                                    Priority focus should be on {auditData.aeo.score < 70 ? 'AEO (Answer Engine Optimization)' : 'Schema precision'} 
                                                     to capture future search paradigms.
                                                </p>
                                            </div>
                                            <div className="bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-sm">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                                    <Layout className="h-4 w-4 text-emerald-500" /> Structure Markers
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {auditData.schema.types.map(type => (
                                                        <span key={type} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                                            {type}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'seo' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight">Search Engine Optimization</h4>
                                            <ScoreRing score={auditData.seo.score} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Page Title</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-slate-700">{auditData.seo.title}</span>
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    </div>
                                                </div>
                                                <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta Description</p>
                                                    <span className="text-sm font-bold text-slate-700">{auditData.seo.metaDescription}</span>
                                                </div>
                                            </div>
                                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Header Hierarchy</h5>
                                                <div className="flex gap-4">
                                                    {Object.entries(auditData.seo.headers).map(([key, val]) => (
                                                        <div key={key} className="flex-1 p-4 bg-slate-50 rounded-2xl text-center">
                                                            <p className="text-[10px] font-black text-slate-400 mb-1 uppercase">{key}</p>
                                                            <p className="text-xl font-black text-slate-900">{val}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight">Fortress Security Shield</h4>
                                            <ScoreRing score={auditData.security.score} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] text-center space-y-3">
                                                <Shield className="h-10 w-10 text-emerald-500 mx-auto" />
                                                <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">SSL Perimeter</h5>
                                                <p className="font-black text-emerald-700">{auditData.security.sslExpiry} Remaining</p>
                                            </div>
                                            <div className="md:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Active Defensive Headers</h5>
                                                <div className="space-y-4">
                                                    {Object.entries(auditData.security.securityHeaders).map(([key, val]) => (
                                                        <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{key}</span>
                                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${val ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                                {val ? 'Hardened' : 'Exposed'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'aeo' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 text-center">
                                        <div className="max-w-md mx-auto space-y-4">
                                            <div className="p-6 bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-200">
                                                <Info className="h-12 w-12 mx-auto mb-4" />
                                                <h4 className="text-xl font-black tracking-tight mb-2">AEO Score: {auditData.aeo.score}%</h4>
                                                <p className="text-xs font-medium text-blue-100 px-4">Answer Engine Optimization measures how likely AI search models (like Search Generative Experience) are to use your data as a primary answer source.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                            {[
                                                { label: 'Direct Answers', val: auditData.aeo.directAnswers },
                                                { label: 'Featured Snippets', val: auditData.aeo.featuredSnippets },
                                                { label: 'Voice Score', val: auditData.aeo.voiceSearchScore + '%' },
                                                { label: 'Breadcrumbs', val: auditData.aeo.structuredDataBreadcrumbs ? 'Active' : 'Missing' }
                                            ].map(i => (
                                                <div key={i.label} className="bg-white p-6 rounded-3xl border border-slate-100">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{i.label}</p>
                                                    <p className="text-xl font-black text-slate-900">{i.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other tabs can be implemented similarly or with charts */}

                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Intelligence Sweep: {new Date().toLocaleTimeString()}</p>
                                </div>
                                <button onClick={onClose} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200">
                                    Acknowledge Insights
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-20 text-center">
                            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                            <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Uplink Severed: Audit Unavailable</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
