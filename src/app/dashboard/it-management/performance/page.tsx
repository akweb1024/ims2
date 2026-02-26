'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    BarChart3, TrendingUp, Users, Clock, Award, Target,
    ArrowUpRight, ArrowDownRight, Search, Zap,
    Cpu, Activity, Layers, Star, ZapOff, Trophy
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area,
} from 'recharts';

interface PerformanceData {
    members: Array<{
        userId: string; name: string; email: string; designation: string;
        stats: { completedTasks: number; totalHours: number; billableHours: number; billablePercentage: number; revenueGenerated: number };
    }>;
    trends: Array<{ month: string; year: number; completedTasks: number; revenue: number; hours: number }>;
    servicePopularity: Array<{ name: string; count: number; revenue: number }>;
}

export default function PerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState('6');

    const fetchPerformanceData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/analytics/performance?months=${timeRange}`);
            if (response.ok) setData(await response.json());
        } catch (error) { console.error('Data pull failed'); }
        finally { setLoading(false); }
    }, [timeRange]);

    useEffect(() => { fetchPerformanceData(); }, [fetchPerformanceData]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Calibrating Achievements...</p>
                </div>
            </DashboardLayout>
        );
    }

    const filteredMembers = data?.members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.designation.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalRevenue = data?.trends.reduce((sum, t) => sum + t.revenue, 0) || 0;
    const totalTasks = data?.trends.reduce((sum, t) => sum + t.completedTasks, 0) || 0;
    const totalHours = data?.trends.reduce((sum, t) => sum + t.hours, 0) || 0;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:250px] bg-repeat pb-20">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* Header Architecture */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2 text-glow-amber">Peak Efficiency</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Quotient & Agent Ranking</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-4">
                            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} 
                                className="bg-white/80 border border-slate-200 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:ring-4 ring-amber-600/5 transition-all outline-none"
                            >
                                <option value="3">Quarterly Window</option>
                                <option value="6">Bi-Annual View</option>
                                <option value="12">Annual Chronology</option>
                            </select>
                        </motion.div>
                    </div>

                    {/* Elite Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Tactical Wins', value: totalTasks, icon: Target, sub: '+12%', color: 'blue' },
                            { label: 'Fiscal Weight', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, sub: '+8%', color: 'emerald' },
                            { label: 'Logic Hours', value: `${totalHours.toLocaleString()}h`, icon: Clock, sub: 'Nominal', color: 'purple' },
                        ].map((stat, idx) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                key={stat.label}
                                className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/50 group"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`p-4 bg-slate-50 rounded-2xl group-hover:bg-slate-900 transition-all duration-500`}>
                                        <stat.icon className="h-6 w-6 text-slate-400 group-hover:text-white transition-all" />
                                    </div>
                                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                                        {stat.sub}
                                    </span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Chart Matrix */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                            className="bg-slate-900 rounded-[3rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <Activity className="h-4 w-4 text-blue-400" /> Tactical Performance Trends
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.trends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#ffffff30', fontSize: 10, fontWeight: 900 }} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#ffffff20', fontSize: 9 }} />
                                        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff' }} />
                                        <Bar yAxisId="left" dataKey="completedTasks" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50"
                        >
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <Clock className="h-4 w-4 text-purple-600" /> Operational Clock Cycles
                            </h3>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.trends}>
                                        <defs>
                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                                        <Tooltip contentStyle={{ border: 'none', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorHours)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    </div>

                    {/* Achievement Ranking Matrix */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1 flex items-center gap-3">
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Agent Hierarchy
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Ranking by Logic Contribution</p>
                            </div>
                            <div className="relative group min-w-[300px]">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-slate-600 transition-all" />
                                <input type="text" placeholder="Identify Agent..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-xs font-black text-slate-900 focus:ring-4 ring-slate-900/5 transition-all outline-none" />
                            </div>
                        </div>
                        <div className="overflow-x-auto overflow-visible">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-10 py-6">Operator Node</th>
                                        <th className="px-10 py-6 text-center">Wins</th>
                                        <th className="px-10 py-6 text-center">Cycles (H)</th>
                                        <th className="px-10 py-6 text-center">Stability Index</th>
                                        <th className="px-10 py-6 text-right">Yield</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMembers.map((member, i) => (
                                        <motion.tr 
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                            key={member.userId} className="group hover:bg-slate-50/80 transition-all cursor-crosshair"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-xs shadow-xl group-hover:scale-110 transition-transform">
                                                        {member.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight">{member.name}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.designation}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-center">
                                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 font-black text-xs border border-blue-100 uppercase">
                                                    {member.stats.completedTasks}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-center font-black text-slate-900 text-xs">
                                                {member.stats.totalHours}
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="w-32 mx-auto space-y-2">
                                                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span>SYNC</span><span>{member.stats.billablePercentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }} animate={{ width: `${member.stats.billablePercentage}%` }}
                                                            className={`h-full rounded-full ${member.stats.billablePercentage > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-right font-black text-emerald-600 text-sm">
                                                ₹{member.stats.revenueGenerated.toLocaleString()}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Elite Rewards Floor */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
                            className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -translate-x-10 translate-y-10 group-hover:bg-white/10 transition-all duration-700" />
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Elite Operator Badge</h3>
                                    <p className="text-indigo-100 text-xs font-black uppercase tracking-widest opacity-60">Status: Restricted Acknowledge</p>
                                </div>
                                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                                    <Trophy className="h-8 w-8 text-amber-300 shadow-glow" />
                                </div>
                            </div>
                            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-sm">
                                Awarded for maintaining stability index / (SX) over 85% across 3 consecutive cycles.
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
                            className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white shadow-xl shadow-slate-200/50 flex flex-col justify-center"
                        >
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                                <Zap className="h-4 w-4 text-amber-500" /> Pulse Insight
                            </h3>
                            <p className="text-slate-900 font-black text-xl italic leading-relaxed tracking-tight">
                                &ldquo;System efficiency surged by <span className="text-emerald-600 underline">24%</span> following the logic block migration. Maintain high-frequency output.&rdquo;
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
