'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function AIPredictionPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        const fetchInsights = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/ai-insights', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    // Fallback if data is null or empty
    const metrics = data?.metrics || {
        projectedRevenue: 0,
        projectedGrowth: 0,
        churnRiskCount: 0,
        churnRiskValue: 0,
        upsellCount: 0,
        upsellPotential: 0
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">AI Insights & Predictions</h1>
                    <p className="text-secondary-600 mt-1">
                        Predictive analytics powered by heuristic algorithms on your data.
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-premium">
                        <h3 className="text-secondary-600 font-medium text-sm">Projected Revenue (Next Month)</h3>
                        <p className="text-3xl font-bold text-secondary-900 mt-2">${metrics.projectedRevenue.toLocaleString()}</p>
                        <p className={`text-sm mt-1 ${metrics.projectedGrowth >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {metrics.projectedGrowth >= 0 ? '↑' : '↓'} {Math.abs(metrics.projectedGrowth)}% vs average
                        </p>
                    </div>
                    <div className="card-premium">
                        <h3 className="text-secondary-600 font-medium text-sm">Churn Risk Value</h3>
                        <p className="text-3xl font-bold text-secondary-900 mt-2">${metrics.churnRiskValue.toLocaleString()}</p>
                        <p className="text-danger-600 text-sm mt-1">{metrics.churnRiskCount} accounts at risk</p>
                    </div>
                    <div className="card-premium">
                        <h3 className="text-secondary-600 font-medium text-sm">Growth Opportunity</h3>
                        <p className="text-3xl font-bold text-secondary-900 mt-2">${metrics.upsellPotential.toLocaleString()}</p>
                        <p className="text-success-600 text-sm mt-1">{metrics.upsellCount} potential upsells</p>
                    </div>
                </div>

                {/* Chart Area Mockup (kept as visual placeholder but labelled) */}
                <div className="card-premium h-96 flex items-center justify-center bg-secondary-50 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center z-10">
                            <div className="text-6xl mb-4">📈</div>
                            <h3 className="text-xl font-bold text-secondary-900">Predictive Sales Trend</h3>
                            <p className="text-secondary-600">Model: Historical Weighted Average</p>
                            <p className="text-xs text-secondary-400 mt-2 uppercase tracking-widest">(Simple Projection)</p>
                        </div>
                    </div>
                    {/* Visual graph lines */}
                    <svg viewBox="0 0 800 300" className="w-full h-full opacity-20 absolute bottom-0">
                        <path d="M0,250 C150,200 300,280 400,150 S600,0 800,50" fill="none" stroke="#2563eb" strokeWidth="4" />
                        <path d="M0,280 C150,260 300,290 400,200 S600,100 800,80" fill="none" stroke="#dc2626" strokeWidth="4" strokeDasharray="10,10" />
                    </svg>
                </div>

                {/* Insights List */}
                <div className="card-premium">
                    <h2 className="text-xl font-bold text-secondary-900 mb-4">Key Insights</h2>
                    <div className="space-y-4">
                        {data?.insights?.length === 0 && (
                            <p className="text-secondary-500 italic">No specific insights generated at this time.</p>
                        )}
                        {data?.insights?.map((insight: any, idx: number) => (
                            <div
                                key={idx}
                                className={`flex items-start justify-between space-x-3 p-4 rounded-lg border ${insight.type === 'churn'
                                        ? 'bg-warning-50 border-warning-100'
                                        : 'bg-indigo-50 border-indigo-100'
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="text-2xl mt-1">{insight.icon}</div>
                                    <div>
                                        <h4 className={`font-bold ${insight.type === 'churn' ? 'text-warning-900' : 'text-indigo-900'}`}>
                                            {insight.type === 'churn' ? 'Retention Risk Alert' : 'Upsell Opportunity detected'}
                                        </h4>
                                        <p className={`${insight.type === 'churn' ? 'text-warning-800' : 'text-indigo-800'} text-sm mt-1`}>
                                            <strong>{insight.name}</strong>: {insight.reason}
                                        </p>
                                        <p className="text-xs font-bold mt-2 opacity-75">
                                            Value at stake: ${insight.value.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <Link
                                        href={`/dashboard/customers/${insight.id}?followUp=true`}
                                        className={`btn btn-sm ${insight.type === 'churn' ? 'bg-warning-600 hover:bg-warning-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                    >
                                        Take Action
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
