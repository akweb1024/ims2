'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Target,
    AlertTriangle,
    RefreshCw,
    Sliders,
    DollarSign,
    Zap
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    ComposedChart,
    Bar,
    Line
} from 'recharts';

export default function CashflowForecastingPage() {
    const [scenarios, setScenarios] = useState({
        hiring: 0,
        marketingSpend: 0,
        salesGrowth: 10 // Default 10% growth
    });

    const [loading, setLoading] = useState(true);
    const [forecastData, setForecastData] = useState<any[]>([]);

    useEffect(() => {
        // Simulate advanced AI calculation
        setLoading(true);
        setTimeout(() => {
            generateForecast();
            setLoading(false);
        }, 800);
    }, [scenarios]);

    const generateForecast = () => {
        const baseData = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

        let currentBalance = 1200000;
        let monthlyRevenue = 450000;
        let monthlyExpense = 320000;

        for (let i = 0; i < 15; i++) {
            // Apply Growth & Scenarios
            if (i > 5) { // Future months (after June)
                monthlyRevenue = monthlyRevenue * (1 + (scenarios.salesGrowth / 100));
                monthlyExpense = monthlyExpense + (scenarios.hiring * 50000) + scenarios.marketingSpend;
            }

            // Fluctuation
            const revenueVariance = Math.random() * 50000 - 25000;
            const expenseVariance = Math.random() * 30000 - 15000;

            const inflow = monthlyRevenue + revenueVariance;
            const outflow = monthlyExpense + expenseVariance;
            const net = inflow - outflow;
            currentBalance += net;

            baseData.push({
                month: months[i],
                isFuture: i > 5,
                inflow: Math.round(inflow),
                outflow: Math.round(outflow),
                netCash: Math.round(net),
                balance: Math.round(currentBalance),
                confidenceLower: i > 5 ? Math.round(currentBalance * 0.9) : null,
                confidenceUpper: i > 5 ? Math.round(currentBalance * 1.1) : null
            });
        }
        setForecastData(baseData);
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Target size={32} />
                            </span>
                            AI Cashflow Forecast
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium ml-1 flex items-center gap-2">
                            Predicting liquidity with <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md text-xs">94% Confidence</span>
                        </p>
                    </div>
                    <button onClick={() => setScenarios({ hiring: 0, marketingSpend: 0, salesGrowth: 10 })} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors">
                        <RefreshCw size={16} /> Reset
                    </button>
                    {/* Background blob */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-12 -mt-12 pointer-events-none" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Controls Panel */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold">
                                <Sliders size={20} className="text-indigo-500" />
                                Scenario Planning
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Sales Growth</label>
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">+{scenarios.salesGrowth}%</span>
                                    </div>
                                    <input
                                        type="range" min="-20" max="50" step="5"
                                        value={scenarios.salesGrowth}
                                        onChange={(e) => setScenarios({ ...scenarios, salesGrowth: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">New Hires (monthly)</label>
                                        <span className="text-xs font-black text-gray-900">{scenarios.hiring}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="10" step="1"
                                        value={scenarios.hiring}
                                        onChange={(e) => setScenarios({ ...scenarios, hiring: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Est. ₹50k cost per hire</p>
                                </div>

                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Marketing Boost</label>
                                        <span className="text-xs font-black text-gray-900">₹{(scenarios.marketingSpend / 1000)}k</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="200000" step="10000"
                                        value={scenarios.marketingSpend}
                                        onChange={(e) => setScenarios({ ...scenarios, marketingSpend: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Quick Insights */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                            <h3 className="font-bold text-lg mb-2 relative z-10">Runway Forecast</h3>
                            <div className="text-4xl font-black mb-1 relative z-10">18 Months</div>
                            <p className="text-emerald-100 text-xs font-medium relative z-10">Assuming current spend rate</p>
                            <TrendingUp className="absolute bottom-4 right-4 text-white opacity-20 w-24 h-24" />
                        </div>
                    </div>

                    {/* Main Chart Area */}
                    <div className="lg:col-span-9 space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 min-h-[500px]">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-bold text-xl text-gray-900">Projected Balance (Next 9 Months)</h3>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Projection
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <div className="w-3 h-3 rounded-full bg-gray-300"></div> Historical
                                    </div>
                                </div>
                            </div>

                            <div className="h-96">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            tickFormatter={(val) => `₹${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [value ? `₹${Number(value).toLocaleString()}` : '', '']}
                                        />
                                        <ReferenceLine x="Jun" stroke="#9CA3AF" strokeDasharray="3 3" label={{ position: 'top', value: 'Today', fill: '#9CA3AF', fontSize: 12 }} />
                                        <Area
                                            type="monotone"
                                            dataKey="balance"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorBalance)"
                                        />
                                        {/* Confidence Interval (Visual Trick) */}
                                        <Area
                                            type="monotone"
                                            dataKey="confidenceUpper"
                                            stroke="none"
                                            fill="#e0e7ff"
                                            fillOpacity={0.2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-xl text-gray-900 mb-6">Cashflow Breakdown</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="inflow" fill="#10b981" barSize={12} radius={[4, 4, 0, 0]} name="Inflow" />
                                        <Bar dataKey="outflow" fill="#ef4444" barSize={12} radius={[4, 4, 0, 0]} name="Outflow" />
                                        <Line type="monotone" dataKey="netCash" stroke="#f59e0b" strokeWidth={2} dot={false} name="Net Cash" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
