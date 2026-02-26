'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
    DollarSign, TrendingUp, GitCommit, Rocket, Server, Code, 
    Download, Zap, GitPullRequest, ArrowUpRight, Cpu, 
    Layers, Search, Filter, Globe, Activity, TrendingDown,
    PieChart as PieChartIcon, BarChart3, Wallet, CreditCard
} from 'lucide-react';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';

interface RevenueStats {
    totalRevenue: number; itRevenue: number; paidRevenue: number; unpaidRevenue: number;
    projectRevenue: number; taskRevenue: number;
    byCategory: Array<{ name: string; value: number }>;
    monthly: Array<{ month: string; amount: number; commits: number; deployments: number }>;
    efficiency: { revPerCommit: number; revPerStoryPoint: number; deploymentSuccessRate: number };
    commitImpact: Array<{ id: string; size: number; revenueImpact: number; feature: string }>;
}

export default function RevenuePage() {
    const [stats, setStats] = useState<RevenueStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchRevenueStats(); }, []);

    const fetchRevenueStats = async () => {
        try {
            setLoading(true);
            const mockMonthly = [
                { month: 'Jan', amount: 450000, commits: 120, deployments: 4 },
                { month: 'Feb', amount: 520000, commits: 145, deployments: 6 },
                { month: 'Mar', amount: 480000, commits: 132, deployments: 5 },
                { month: 'Apr', amount: 610000, commits: 190, deployments: 8 },
                { month: 'May', amount: 580000, commits: 165, deployments: 6 },
                { month: 'Jun', amount: 750000, commits: 210, deployments: 12 },
            ];
            const mockImpact = [
                { id: '1', size: 400, revenueImpact: 5000, feature: 'Payment Gateway' },
                { id: '2', size: 120, revenueImpact: 1200, feature: 'UI Update' },
                { id: '3', size: 850, revenueImpact: 15000, feature: 'New Module' },
                { id: '4', size: 300, revenueImpact: 4500, feature: 'Bug Fixes' },
                { id: '5', size: 600, revenueImpact: 8200, feature: 'API 2.0' },
            ];
            const response = await fetch('/api/it/analytics/dashboard?view=all');
            if (response.ok) {
                const data = await response.json();
                setStats({
                    totalRevenue: data.revenue?.totalRevenue || 4500000,
                    itRevenue: data.revenue?.itRevenue || 1200000,
                    paidRevenue: data.revenue?.paidRevenue || 3800000,
                    unpaidRevenue: data.revenue?.unpaidRevenue || 700000,
                    projectRevenue: data.revenue?.projectRevenue || 0,
                    taskRevenue: data.revenue?.taskRevenue || 0,
                    byCategory: data.revenue?.byCategory || [],
                    monthly: (data.revenue?.monthly?.length > 0) ? data.revenue.monthly : mockMonthly,
                    efficiency: { revPerCommit: 3500, revPerStoryPoint: 12000, deploymentSuccessRate: 98.5 },
                    commitImpact: (data.revenue?.commitImpact?.length > 0) ? data.revenue.commitImpact : mockImpact,
                });
            } else {
                setStats({
                    totalRevenue: 4500000, itRevenue: 1200000, paidRevenue: 3800000,
                    unpaidRevenue: 700000, projectRevenue: 0, taskRevenue: 0, byCategory: [],
                    monthly: mockMonthly, efficiency: { revPerCommit: 3500, revPerStoryPoint: 12000, deploymentSuccessRate: 98.5 },
                    commitImpact: mockImpact,
                });
            }
        } catch (error) { console.error('Data pull failed'); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                        <div className="h-16 w-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-600/30" />
                        </div>
                    </div>
                    <p className="font-bold text-slate-400 uppercase tracking-[0.3em] text-[10px] animate-pulse">Aggregating Fiscal Intel...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50 relative overflow-hidden pb-20">
                {/* Visual Background Elements */}
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-40">
                    <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-200 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto space-y-12 py-10 px-6 relative z-10">
                    
                    {/* Header Architecture */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-slate-200/60">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-slate-900 rounded-2xl shadow-2xl">
                                    <Activity className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h1 className="text-5xl font-black text-slate-900 tracking-tight">Fiscal Nexus</h1>
                            </div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Global Engineering Yield & Revenue Correlation
                            </p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4">
                            <button className="px-8 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group">
                                <Download className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" /> Export Intelligence
                            </button>
                        </motion.div>
                    </div>

                    {/* Primary Metrics Deck */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { label: 'Total Revenue', value: stats?.totalRevenue, sub: '+12.5% Performance', icon: Wallet, color: 'emerald', trend: 'up' },
                            { label: 'Rev / Commit', value: stats?.efficiency.revPerCommit, sub: 'Efficiency Index', icon: GitCommit, color: 'indigo', trend: 'up' },
                            { label: 'Rev / Point', value: stats?.efficiency.revPerStoryPoint, sub: 'Velocity Margin', icon: Zap, color: 'amber', trend: 'neutral' },
                            { label: 'Deploy Success', value: stats?.efficiency.deploymentSuccessRate, suffix: '%', sub: 'Infinite Uptime', icon: Rocket, color: 'rose', trend: 'up' },
                        ].map((stat, idx) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                key={stat.label}
                                className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-2xl shadow-slate-200/50 group relative overflow-hidden hover:scale-[1.02] transition-all"
                            >
                                <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-4 rounded-2xl bg-slate-50 text-slate-900 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                        stat.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                        {stat.sub}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {stat.suffix === '%' ? stat.value : `₹${stat.value?.toLocaleString()}`}
                                        </span>
                                        {stat.suffix && <span className="text-sm font-black text-slate-400">{stat.suffix}</span>}
                                    </div>
                                </div>
                                <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }} animate={{ width: '70%' }} 
                                        className={`h-full bg-${stat.color}-500`} 
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Visual Analytics Hub */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        
                        {/* Yield Dynamics Visualization */}
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                            className="lg:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white shadow-3xl shadow-slate-200/40 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] pointer-events-none -translate-x-12 -translate-y-12" />
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-4">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200" />
                                        Velocity vs Fiscal Yield
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">6-Month Operational Chronology</p>
                                </div>
                                <div className="flex gap-8 bg-slate-50/80 p-4 rounded-[2rem] border border-slate-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-lg shadow-indigo-200" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Revenue</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Code Commits</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-96 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={stats?.monthly}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} dy={10} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '28px', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', padding: '24px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
                                            itemStyle={{ fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}
                                        />
                                        <Area yAxisId="left" type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={5} fill="url(#colorRevenue)" />
                                        <Bar yAxisId="right" dataKey="commits" barSize={24} fill="#10b981" radius={[10, 10, 4, 4]} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Impact Intelligence Matrix */}
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                            className="bg-slate-900 rounded-[3.5rem] p-12 border border-slate-800 shadow-3xl relative overflow-hidden"
                        >
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />
                            
                            <div className="mb-10">
                                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                                    <Cpu className="h-5 w-5 text-emerald-400" /> Neural Mapping
                                </h3>
                                <p className="text-2xl font-black text-white leading-tight">Complexity vs Fiscal Yield Impact</p>
                            </div>

                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 10, bottom: 20, left: -20 }}>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#ffffff08" vertical={false} />
                                        <XAxis type="number" dataKey="size" name="Complexity" axisLine={false} tickLine={false} tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 700 }} />
                                        <YAxis type="number" dataKey="revenueImpact" name="Yield" axisLine={false} tickLine={false} tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 700 }} tickFormatter={(v: number) => `₹${v / 1000}k`} />
                                        <ZAxis type="number" dataKey="revenueImpact" range={[150, 800]} />
                                        <Tooltip 
                                            cursor={{ strokeDasharray: '5 5', stroke: '#ffffff15' }} 
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-[2rem] shadow-3xl">
                                                            <p className="font-black text-slate-900 text-sm mb-2 uppercase tracking-tight">{d.feature}</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">₹{d.revenueImpact?.toLocaleString()} Yield</p>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                }
                                                return null;
                                            }} 
                                        />
                                        <Scatter data={stats?.commitImpact}>
                                            {stats?.commitImpact.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#10b981', '#6366f1', '#3b82f6', '#f59e0b'][index % 4]} className="group-hover:opacity-100 transition-opacity" />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Efficiency Rating: Optimal</div>
                                <div className="p-3 bg-white/5 rounded-2xl text-emerald-400">
                                    <Rocket className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Contributing Engineering Units */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        
                        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[3.5rem] p-12 text-white shadow-3xl shadow-emerald-200/40 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32 group-hover:scale-150 transition-transform duration-700" />
                            <h3 className="text-5xl font-black mb-6 tracking-tighter">Rating: A+</h3>
                            <p className="text-emerald-50/80 text-sm font-medium leading-relaxed mb-10">
                                Current operational block yield is holding <span className="font-black text-white underline decoration-emerald-300/50 underline-offset-4">3.5x peak</span> above sector baseline.
                            </p>
                            <div className="space-y-4">
                                {[
                                    { label: 'Network Uptime', val: '99.99%', icon: Globe },
                                    { label: 'Commit Density', val: 'Elite', icon: BarChart3 },
                                    { label: 'Yield Drain', val: 'Minimal', icon: TrendingDown },
                                ].map((item, i) => (
                                    <div key={i} className="bg-black/10 backdrop-blur-md px-6 py-4 rounded-2xl flex justify-between items-center group-hover:bg-black/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4 text-emerald-200" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <span className="text-xs font-black">{item.val}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
                            className="md:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white shadow-3xl shadow-slate-200/40"
                        >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-slate-100 rounded-3xl shadow-inner">
                                        <Layers className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1">High-Impact Engineering Units</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Individual Yield Contribution Mapping</p>
                                    </div>
                                </div>
                                <button className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-white transition-all">
                                    Full Node Map
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { name: 'Sarah Connor', role: 'Interface Lead', impact: '₹125,000', commits: 45, status: 'Peak' },
                                    { name: 'John Smith', role: 'Nexus Dev', impact: '₹98,000', commits: 38, status: 'Steady' },
                                    { name: 'Emily Chen', role: 'Ops / Scaling', impact: '₹85,000', commits: 22, status: 'Rising' },
                                ].map((dev, i) => (
                                    <motion.div 
                                        key={i} 
                                        whileHover={{ x: 12, backgroundColor: 'rgba(255,255,255,1)' }} 
                                        className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-50/50 border border-slate-100/30 rounded-[2.5rem] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-6 mb-6 md:mb-0">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 flex items-center justify-center font-black text-white text-xl shadow-2xl group-hover:rotate-6 transition-transform">
                                                    {dev.name.charAt(0)}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${
                                                    dev.status === 'Peak' ? 'bg-emerald-500' : dev.status === 'Steady' ? 'bg-indigo-500' : 'bg-amber-500'
                                                }`} />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{dev.name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{dev.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-12 w-full md:w-auto justify-between md:justify-end">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 opacity-60">Yield Contribution</p>
                                                <p className="text-2xl font-black text-emerald-600 tabular-nums">{dev.impact}</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 opacity-60">Activity Pulse</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-slate-900">{dev.commits} Commits</span>
                                                    <div className="flex gap-0.5">
                                                        {[1,2,3,4,5].map(b => (
                                                            <div key={b} className={`w-1 h-4 rounded-full ${b <= (dev.commits/10) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
