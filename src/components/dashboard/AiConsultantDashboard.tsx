'use client';

import { useState, useEffect, useRef } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Users,
    ShieldAlert,
    ArrowRight,
    CheckCircle2,
    DollarSign,
    Lightbulb,
    HelpCircle,
    RotateCcw
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface Insight {
    type: 'GROWTH' | 'PROFIT' | 'EMPLOYEE' | 'RISK';
    title: string;
    description: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    icon: string;
}

export default function AiConsultantDashboard() {
    const [loading, setLoading] = useState(true);
    const [originalData, setOriginalData] = useState<any>(null);
    const [simulatedData, setSimulatedData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'growth' | 'profit' | 'employee'>('all');
    const [isSimulating, setIsSimulating] = useState(false);
    
    // Sliders state
    const [marketingSpend, setMarketingSpend] = useState(0); // -100% to +100%
    const [supportStaff, setSupportStaff] = useState(0);     // -10 to +10 headcount
    const [discountRate, setDiscountRate] = useState(0);     // -20% to +20%
    
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const fetchOriginal = async () => {
        try {
            const res = await fetch('/api/ai-insights?type=consultant', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const resData = await res.json();
            setOriginalData(resData);
            setSimulatedData(resData); // Init simulated data with original data
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch AI insights', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOriginal();
    }, []);

    // Automatically trigger simulation when sliders change (with a debounce)
    useEffect(() => {
        if (loading || !originalData) return;

        // Skip API request if sliders are all set to 0
        if (marketingSpend === 0 && supportStaff === 0 && discountRate === 0) {
            setSimulatedData(originalData);
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(async () => {
            setIsSimulating(true);
            try {
                const res = await fetch('/api/ai-insights', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        type: 'consultant',
                        changes: {
                            marketingSpendChange: marketingSpend,
                            supportStaffChange: supportStaff,
                            discountRateChange: discountRate
                        }
                    })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setSimulatedData(data);
                }
            } catch (err) {
                console.error('Simulation API failed', err);
            } finally {
                setIsSimulating(false);
            }
        }, 500);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [marketingSpend, supportStaff, discountRate, originalData, loading]);

    const handleReset = () => {
        setMarketingSpend(0);
        setSupportStaff(0);
        setDiscountRate(0);
        setSimulatedData(originalData);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-100 rounded-full animate-pulse"></div>
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 animate-bounce" size={24} />
                </div>
                <p className="text-secondary-600 font-bold italic animate-pulse">AI Consultant is analyzing your business data...</p>
            </div>
        );
    }

    const currentProfile = originalData?.profile;
    const simProfile = simulatedData?.profile || currentProfile;

    const filteredInsights = simulatedData?.insights?.filter((i: Insight) =>
        activeTab === 'all' || i.type.toLowerCase() === activeTab
    ) || [];

    // Calculate a dynamic health score based on metrics
    const calculateHealth = (profile: any) => {
        if (!profile) return 70;
        const unpaidRatio = profile.financials.totalUnpaidInvoices / (profile.financials.avgMonthlyRevenue || 1);
        const unpaidDeduction = Math.min(25, unpaidRatio * 20);
        const growthBonus = Math.min(15, Math.max(-15, profile.financials.revenueGrowthRate * 1.5));
        const kraScore = (profile.employees.kraComplianceAvg || 0.6) * 40;
        const base = 50 + growthBonus + kraScore - unpaidDeduction;
        return Math.min(100, Math.max(10, Math.round(base)));
    };

    const originalHealth = calculateHealth(currentProfile);
    const simulatedHealth = calculateHealth(simProfile);
    const healthDiff = simulatedHealth - originalHealth;

    // Prepare chart data for comparative visualization
    const monthsLabels = ['Month -5', 'Month -4', 'Month -3', 'Month -2', 'Month -1', 'Current Month'];
    const revenueTrendData = (currentProfile?.financials?.last6MonthsRevenue || []).map((rev: number, idx: number) => {
        const simRev = simProfile?.financials?.last6MonthsRevenue?.[idx] ?? rev;
        return {
            name: monthsLabels[idx] || `M-${5 - idx}`,
            'Current Revenue': rev,
            'Simulated Revenue': simRev
        };
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Top Stat Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6 border-none relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                        <Target size={140} />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-primary-100 text-sm font-bold uppercase tracking-wider">Business Health Score</p>
                            <h2 className="text-5xl font-black mt-2 transition-all duration-300">
                                {simulatedHealth}%
                            </h2>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Target size={32} />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-sm font-medium bg-white/10 p-2 rounded-lg">
                        {healthDiff > 0 ? (
                            <TrendingUp size={16} className="text-green-300" />
                        ) : healthDiff < 0 ? (
                            <TrendingDown size={16} className="text-rose-300" />
                        ) : (
                            <TrendingUp size={16} />
                        )}
                        <span>
                            {healthDiff > 0 
                                ? `Simulating +${healthDiff}% improvement` 
                                : healthDiff < 0 
                                    ? `Simulating ${healthDiff}% decrease` 
                                    : 'Showing base quarterly evaluation'}
                        </span>
                    </div>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-secondary-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Avg Productivity</p>
                            <h2 className="text-3xl font-black text-secondary-900 mt-2 transition-all duration-300">
                                {simProfile?.employees?.avgDailyProductivity}%
                            </h2>
                        </div>
                        <div className="p-3 bg-secondary-100 rounded-2xl">
                            <Users className="text-secondary-600" size={24} />
                        </div>
                    </div>
                    <p className="mt-4 text-xs text-secondary-600 leading-relaxed italic">
                        Reflects task logs, support desk load, and KRA metrics.
                    </p>
                </div>

                <div className="card-premium p-6 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Revenue Growth</p>
                            <h2 className={`text-3xl font-black mt-2 transition-all duration-300 ${simProfile?.financials?.revenueGrowthRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {simProfile?.financials?.revenueGrowthRate?.toFixed(1)}%
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <DollarSign className="text-emerald-600" size={24} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(10, 65 + (simProfile?.financials?.revenueGrowthRate || 0) * 1.5))}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-secondary-500 uppercase">
                            {simProfile?.financials?.revenueGrowthRate >= 0 ? 'Exceeding target margin' : 'Deficit vs targets'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Scenario Simulator & Recharts comparative graph */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Simulator controls */}
                <div className="card-premium p-6 space-y-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <Zap className="text-primary-600" size={20} />
                                Speculative Sandbox
                            </h3>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 text-xs text-secondary-400 hover:text-secondary-800 transition-colors font-bold uppercase"
                            >
                                <RotateCcw size={12} /> Reset
                            </button>
                        </div>

                        {/* Slider 1: Marketing spend */}
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-secondary-600 uppercase">Marketing Budget</span>
                                <span className={marketingSpend >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {marketingSpend >= 0 ? `+${marketingSpend}` : marketingSpend}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="-100"
                                max="100"
                                value={marketingSpend}
                                onChange={(e) => setMarketingSpend(Number(e.target.value))}
                                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                        </div>

                        {/* Slider 2: Support Staff headcount */}
                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-secondary-600 uppercase">Support Headcount</span>
                                <span className={supportStaff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {supportStaff >= 0 ? `+${supportStaff}` : supportStaff} staff
                                </span>
                            </div>
                            <input
                                type="range"
                                min="-10"
                                max="10"
                                value={supportStaff}
                                onChange={(e) => setSupportStaff(Number(e.target.value))}
                                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                        </div>

                        {/* Slider 3: Discount pricing rate */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-secondary-600 uppercase">Pricing Discount</span>
                                <span className={discountRate >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {discountRate >= 0 ? `+${discountRate}` : discountRate}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min="-20"
                                max="20"
                                value={discountRate}
                                onChange={(e) => setDiscountRate(Number(e.target.value))}
                                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-secondary-100 flex items-center justify-between text-[10px] text-secondary-400 font-bold uppercase tracking-widest">
                        <span>Simulator status:</span>
                        <div className="flex items-center gap-1.5">
                            {isSimulating ? (
                                <>
                                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                    <span className="text-amber-500">Recalculating...</span>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span className="text-green-500">Synced</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recharts chart */}
                <div className="card-premium p-6 lg:col-span-2">
                    <h3 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-primary-600" size={20} />
                        Revenue Projection Analysis
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#888' }} />
                                <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']} labelStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Line type="monotone" dataKey="Current Revenue" stroke="#888888" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Simulated Revenue" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4 }} strokeDasharray={discountRate !== 0 || marketingSpend !== 0 ? undefined : "5 5"} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Actionable Insights Feed */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                            <Lightbulb className="text-primary-600" />
                            AI Actionable Strategies Feed
                        </h3>
                        <p className="text-secondary-600 mt-1">Strategies generated dynamically based on active scenario variables</p>
                    </div>

                    <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl">
                        {(['all', 'growth', 'profit', 'employee'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-black rounded-lg transition-all capitalize ${activeTab === tab
                                        ? 'bg-white text-primary-700 shadow-sm'
                                        : 'text-secondary-500 hover:text-secondary-800'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredInsights.length > 0 ? (
                            filteredInsights.map((insight: Insight, idx: number) => (
                                <motion.div
                                    layout
                                    key={insight.title}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="card-premium p-6 border-t-4 border-t-primary-500 shadow-lg hover:shadow-xl transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute -right-4 -top-4 text-secondary-50/10 group-hover:text-secondary-50/20 transition-colors pointer-events-none">
                                        <span className="text-8xl font-black">{idx + 1}</span>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="text-4xl p-2 bg-secondary-50 rounded-xl group-hover:scale-110 transition-transform">
                                            {insight.icon}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${insight.impact === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-primary-100 text-primary-700'
                                                    }`}>
                                                    {insight.impact} IMPACT
                                                </span>
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">
                                                    ID: AI-{idx + 101}
                                                </span>
                                            </div>
                                            <h4 className="text-lg font-black text-secondary-900">{insight.title}</h4>
                                            <p className="text-sm text-secondary-600 leading-relaxed font-medium">
                                                {insight.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 bg-secondary-50 rounded-xl border border-secondary-100 group-hover:bg-secondary-900 group-hover:text-white transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Zap size={16} className="text-amber-500" />
                                                <span className="text-xs font-black">AI RECOMMENDED ACTION</span>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm font-bold leading-snug">
                                            {insight.action}
                                        </p>
                                        <button className="mt-3 flex items-center gap-1 text-[10px] font-black uppercase text-primary-600 group-hover:text-primary-300">
                                            Implement Now <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-2 py-12 card-premium text-center border-dashed">
                                <ShieldAlert size={48} className="mx-auto text-secondary-300" />
                                <p className="mt-4 text-secondary-500 font-bold italic">No insights found for this category.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Performance Spotlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card-premium p-6">
                    <h4 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                        <Users className="text-primary-600" size={20} />
                        Leadership & Merit Spotlight
                    </h4>
                    <div className="space-y-4">
                        {simulatedData?.profile?.employees?.topPerformers?.map((emp: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl hover:bg-primary-50 transition-colors border-l-4 border-l-primary-500">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-secondary-200 flex items-center justify-center font-black text-xs text-secondary-600 uppercase">
                                        {emp.name.substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-secondary-900">{emp.name}</p>
                                        <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-tighter">Consistency: 🔥 High</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary-700">+{emp.totalPoints} PTS</p>
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase">Point Index</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/50 rounded-bl-full -mr-10 -mt-10"></div>
                    <Target size={64} className="text-primary-200 mb-4" />
                    <h4 className="text-xl font-black text-secondary-900 text-center">Profit Waterfall Analysis</h4>
                    <p className="text-sm text-secondary-600 text-center mt-2 px-6 font-medium italic">
                        The AI suggests that focusing on **Institutional Agencies** could increase profit margins by **12.4%** next FY.
                    </p>
                    <button className="btn btn-primary mt-8 px-10 font-black shadow-lg shadow-primary-200">
                        View Profit Map
                    </button>
                </div>
            </div>
        </div>
    );
}


// Style guide accessibility compliance: aria-label placeholder <label>
