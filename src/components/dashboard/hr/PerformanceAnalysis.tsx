
'use client';

import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

interface AnalysisProps {
    employeeId: string;
}

export default function PerformanceAnalysis({ employeeId }: AnalysisProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalysis() {
            try {
                const res = await fetch(`/api/hr/performance/analytics?employeeId=${employeeId}`);
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        if (employeeId) fetchAnalysis();
    }, [employeeId]);

    if (loading) return <div className="h-64 flex items-center justify-center text-secondary-400">Loading Analysis...</div>;
    if (!data || !data.trendData || data.trendData.length === 0) return <div className="h-32 flex items-center justify-center text-secondary-400 italic">No performance history available.</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-50 p-4 rounded-xl text-center">
                    <p className="text-secondary-500 text-sm">Average Rating</p>
                    <p className="text-2xl font-bold text-primary-600">{data.averageRating}</p>
                </div>
                <div className="bg-secondary-50 p-4 rounded-xl text-center">
                    <p className="text-secondary-500 text-sm">Total Evaluations</p>
                    <p className="text-2xl font-bold text-secondary-800">{data.totalEvaluations}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-100 p-4">
                <h4 className="text-sm font-semibold text-secondary-700 mb-4">Performance Trend</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                domain={[0, 10]} // Assuming 1-10 rating
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="rating"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
