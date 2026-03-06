"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    LayoutDashboard, 
    TrendingUp, 
    Users, 
    HardDrive, 
    BookOpen, 
    AlertTriangle, 
    RefreshCcw,
    Filter,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Bell,
    ChevronRight,
    ExternalLink,
    PieChart as PieChartIcon,
    BarChart3,
    Activity,
    ClipboardCheck,
    Cpu
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    PieChart, 
    Pie, 
    Cell,
    BarChart,
    Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface DashboardStats {
    finance: {
        invoices: any[];
        transactions: any[];
        revenueTrend: any[];
        summary: {
            totalRevenue: number;
            invoiceCount: number;
        }
    };
    hr: {
        headcount: any[];
        employeeTypes: any[];
        metrics: {
            avgPerformance: number;
            avgAttendance: number;
        }
    };
    it: {
        projects: any[];
        assets: any[];
        tickets: any[];
    };
    publication: {
        topJournals: any[];
        articles: any[];
    };
    recentActivity: any[];
}

const COLORS = ['#6366f1', '#4ade80', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SuperAdminOverhaulDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeDomain, setActiveDomain] = useState<'ALL' | 'IT' | 'HR' | 'FINANCE' | 'PUB'>('ALL');
    const [timeRange, setTimeRange] = useState('6M');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch(`/api/super-admin/dashboard-stats?period=${timeRange === '6M' ? 6 : 12}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 300000); // 5 mins auto-refresh
        return () => clearInterval(interval);
    }, [timeRange, fetchData]);

    const kpiSummary = useMemo(() => {
        if (!stats) return null;
        return [
            { 
                label: 'Total Group Revenue', 
                value: `₹${(stats.finance.summary.totalRevenue / 100000).toFixed(1)}L`, 
                change: '+12.5%', 
                up: true, 
                icon: TrendingUp,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50'
            },
            { 
                label: 'Global Workforce', 
                value: stats.hr.headcount.reduce((acc, c) => acc + c.count, 0).toString(), 
                change: '+3.2%', 
                up: true, 
                icon: Users,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50'
            },
            { 
                label: 'Active IT Projects', 
                value: stats.it.projects.reduce((acc, p) => acc + p.count, 0).toString(), 
                change: '-2', 
                up: false, 
                icon: HardDrive,
                color: 'text-amber-600',
                bg: 'bg-amber-50'
            },
            { 
                label: 'Pub. Throughput', 
                value: stats.publication.articles.reduce((acc, a) => acc + a.count, 0).toString(), 
                change: '+18.4%', 
                up: true, 
                icon: BookOpen,
                color: 'text-rose-600',
                bg: 'bg-rose-50'
            }
        ];
    }, [stats]);

    if (loading) return <FullScreenLoader />;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Enterprise Command</h1>
                    <p className="text-slate-500 font-medium">Consolidated Cross-Domain Analytics</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                        {['6M', '1Y'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${timeRange === range ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        onClick={fetchData}
                        className={`p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw size={20} className="text-slate-600" />
                    </button>
                    
                    <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 font-bold hover:bg-indigo-700 transition-all active:scale-95">
                        <Activity size={18} />
                        Live Status
                    </button>
                </div>
            </header>

            {/* Dashboard Tabs */}
            <nav className="flex items-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-3xl w-fit border border-slate-200 shadow-inner">
                {[
                    { id: 'ALL', label: 'Overview', icon: LayoutDashboard },
                    { id: 'FINANCE', label: 'Financials', icon: TrendingUp },
                    { id: 'HR', label: 'Talent', icon: Users },
                    { id: 'IT', label: 'Infrastructure', icon: Cpu },
                    { id: 'PUB', label: 'Publication', icon: BookOpen }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveDomain(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeDomain === tab.id ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </nav>

            <main className="space-y-8">
                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {kpiSummary?.map((kpi, idx) => (
                        <KPICard key={idx} {...kpi} />
                    ))}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Charts */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Revenue and Performance Section */}
                        <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60" />
                            
                            <div className="relative">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue Dynamics</h3>
                                        <p className="text-sm text-slate-500">Consolidated growth across all business units</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">
                                            <TrendingUp size={12} />
                                            Active Growth
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[350px] w-full">
                                    {isMounted && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats?.finance.revenueTrend}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                                    dy={10}
                                                />
                                                <YAxis 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                                    tickFormatter={(val) => `₹${val/100000}L`}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="value" 
                                                    stroke="#6366f1" 
                                                    strokeWidth={4}
                                                    fillOpacity={1} 
                                                    fill="url(#colorRev)" 
                                                    animationDuration={1500}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Domain Specific Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* IT Infrastructure Status */}
                            <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">IT Infrastructure</h3>
                                    <span className="p-2 bg-slate-50 rounded-xl"><Cpu size={18} className="text-slate-400" /></span>
                                </div>
                                <div className="space-y-6">
                                    {stats?.it.projects.map((p, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                                                <span>{p.status} Projects</span>
                                                <span>{p.count}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(p.count / stats.it.projects.reduce((a,c)=>a+c.count,0)) * 100}%` }}
                                                    className={`h-full ${p.status === 'ACTIVE' ? 'bg-indigo-500' : p.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Human Resource Metrics */}
                            <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Talent Ecosystem</h3>
                                    <span className="p-2 bg-slate-50 rounded-xl"><Users size={18} className="text-slate-400" /></span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Attendance</p>
                                        <h4 className="text-2xl font-black text-emerald-700">{(stats?.hr.metrics.avgAttendance || 0).toFixed(1)}%</h4>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">Performance</p>
                                        <h4 className="text-2xl font-black text-indigo-700">{(stats?.hr.metrics.avgPerformance || 0).toFixed(1)}</h4>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Right Column - Activity & Distribution */}
                    <div className="space-y-8">
                        {/* Domain Distribution */}
                        <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-100">
                            <h3 className="text-lg font-black text-slate-800 mb-6 tracking-tight">Workforce Diversity</h3>
                            <div className="h-[250px] relative">
                                {isMounted && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats?.hr.employeeTypes}
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={8}
                                                dataKey="count"
                                                stroke="none"
                                            >
                                                {stats?.hr.employeeTypes.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-2xl font-black text-slate-800">{stats?.hr.headcount.reduce((a,c)=>a+c.count, 0)}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Staff</p>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-y-3">
                                {stats?.hr.employeeTypes.map((type, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                        <span className="text-xs font-bold text-slate-600 truncate">{type.type}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Recent Activity Log */}
                        <section className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl shadow-slate-100 flex-1">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">System Audit</h3>
                                <Activity size={18} className="text-indigo-400" />
                            </div>
                            <div className="space-y-6">
                                {stats?.recentActivity.map((log, idx) => (
                                    <div key={idx} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 group-hover:bg-indigo-400 transition-colors" />
                                            {idx !== stats.recentActivity.length - 1 && <div className="w-[1px] h-full bg-slate-100" />}
                                        </div>
                                        <div className="pb-6">
                                            <p className="text-sm font-black text-slate-800 leading-tight mb-1">{log.action}</p>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                <span className="text-indigo-500">{log.entity}</span>
                                                <span>•</span>
                                                <span>{log.user}</span>
                                                <span>•</span>
                                                <span className="bg-slate-50 px-1.5 py-0.5 rounded text-[9px]">{format(new Date(log.timestamp), 'HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-4 mt-6 bg-slate-50 rounded-2xl text-xs font-black text-indigo-600 hover:bg-slate-100 transition-all uppercase tracking-widest border border-slate-100 active:scale-[0.98]">
                                View All Audit Logs
                            </button>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

function KPICard({ label, value, change, up, icon: Icon, color, bg }: any) {
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-100 transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${bg}`}>
                    <Icon size={24} className={color} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black ${up ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-2 py-1 rounded-full`}>
                    {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {change}
                </div>
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h2>
        </motion.div>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label || payload[0].payload.name || payload[0].payload.type}</p>
                <p className="text-lg font-black text-white">
                    {typeof payload[0].value === 'number' && payload[0].value > 1000 ? `₹${(payload[0].value/100000).toFixed(2)}L` : payload[0].value}
                </p>
                {payload[0].payload.status && (
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded mt-2 block w-fit">
                        {payload[0].payload.status}
                    </span>
                )}
            </div>
        );
    }
    return null;
}

function FullScreenLoader() {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
            />
            <h2 className="text-white text-xl font-black tracking-widest mb-2 animate-pulse uppercase">Initializing Core Dash</h2>
            <p className="text-indigo-400 text-xs font-black uppercase tracking-tighter">Syncing Domain Realms • Authenticating Super Admin</p>
        </div>
    );
}
