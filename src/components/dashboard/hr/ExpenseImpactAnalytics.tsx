'use client';

import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TrendingUp, PieChart as PieIcon } from 'lucide-react';

interface ExpenseImpactProps {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ExpenseImpactAnalytics({ employeeId, startDate, endDate }: ExpenseImpactProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchImpact() {
            try {
                let url = `/api/revenue/analytics/expense-impact?`;
                if (employeeId) url += `employeeId=${employeeId}&`;
                if (startDate) url += `startDate=${startDate}&`;
                if (endDate) url += `endDate=${endDate}&`;

                const res = await fetch(url.slice(0, -1));
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchImpact();
    }, [employeeId, startDate, endDate]);

    if (loading) return <div className="h-64 flex items-center justify-center text-secondary-400">Loading Impact Analysis...</div>;
    if (!data || data.chartData.length === 0) return (
        <div className="h-48 flex flex-col items-center justify-center text-secondary-400 border-2 border-dashed border-secondary-100 rounded-3xl">
            <PieIcon size={40} className="mb-2 opacity-20" />
            <p className="text-sm font-bold italic">No expense allocation data available</p>
            <p className="text-[10px] uppercase font-black tracking-widest mt-1">Configure rules in Settings</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-premium bg-gradient-to-br from-indigo-50 to-white">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-tighter">Budget Allocation Impact</h4>
                        <TrendingUp size={16} className="text-indigo-600" />
                    </div>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.chartData}
                                    innerRadius={45}
                                    outerRadius={65}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.chartData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card-premium">
                    <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tighter mb-4">Total Amount Re-allocated</h4>
                    <p className="text-3xl font-black text-secondary-900">₹{data.totalImpact.toLocaleString()}</p>
                    <p className="text-xs text-secondary-500 mt-2 font-medium">Generated from {data.count} revenue transactions.</p>

                    <div className="mt-6 space-y-3">
                        {data.chartData.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="font-bold text-secondary-700">{item.name}</span>
                                </div>
                                <span className="font-black text-secondary-900">₹{item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
