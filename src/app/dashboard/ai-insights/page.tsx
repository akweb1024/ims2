'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function AIPredictionPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [selectedTab, setSelectedTab] = useState('sales');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
    }, []);

    useEffect(() => {
        fetchInsights();
    }, [selectedTab]);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/ai-insights?type=${selectedTab}`, {
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

    const tabs = [
        { id: 'sales', name: 'Sales Pipeline', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'] },
        { id: 'hr', name: 'Workforce Pulse', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_ADMIN'] },
        { id: 'executive', name: 'Executive Summary', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'] },
    ];

    const allowedTabs = tabs.filter(t => t.roles.includes(userRole));

    if (loading && !data) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">AI Predictions</h1>
                        <p className="text-secondary-500">Heuristic forecasting & risk analysis</p>
                    </div>

                    {/* Perspective Switcher */}
                    <div className="flex gap-2 bg-secondary-100 p-1.5 rounded-2xl border border-secondary-200">
                        {allowedTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedTab === tab.id ? 'bg-white text-primary-600 shadow-md' : 'text-secondary-400 hover:bg-secondary-50'}`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center animate-pulse text-secondary-400 italic font-bold">
                        AI is analyzing your data patterns...
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {selectedTab === 'sales' && (
                                <>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Projected Revenue</h3>
                                        <p className="text-4xl font-black text-secondary-900">₹{data?.metrics?.projectedRevenue?.toLocaleString()}</p>
                                        <span className="text-xs font-bold text-success-600">↑ {data?.metrics?.projectedGrowth}% growth trend</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Churn Risk</h3>
                                        <p className="text-4xl font-black text-danger-500">₹{data?.metrics?.churnRiskValue?.toLocaleString()}</p>
                                        <span className="text-xs font-bold text-secondary-500">{data?.metrics?.churnRiskCount} accounts at risk</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Upsell Potential</h3>
                                        <p className="text-4xl font-black text-primary-600">₹{data?.metrics?.upsellPotential?.toLocaleString()}</p>
                                        <span className="text-xs font-bold text-secondary-500">{data?.metrics?.upsellCount} opportunities</span>
                                    </div>
                                </>
                            )}
                            {selectedTab === 'hr' && (
                                <>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Avg Productivity</h3>
                                        <p className="text-4xl font-black text-secondary-900">{data?.metrics?.avgDailyProductivity}h / day</p>
                                        <span className="text-xs font-bold text-secondary-500">Self-reported average</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Flight Risk</h3>
                                        <p className="text-4xl font-black text-warning-600">{data?.metrics?.flightRiskCount}</p>
                                        <span className="text-xs font-bold text-secondary-500">Anomalous behavior found</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Engaged Workforce</h3>
                                        <p className="text-4xl font-black text-success-600">{data?.metrics?.activeWorkforce}</p>
                                        <span className="text-xs font-bold text-secondary-500">{data?.metrics?.teamCount} active teams</span>
                                    </div>
                                </>
                            )}
                            {selectedTab === 'executive' && (
                                <>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">MTD Revenue</h3>
                                        <p className="text-4xl font-black text-secondary-900">₹{data?.metrics?.revenue?.current?.toLocaleString()}</p>
                                        <span className="text-xs font-bold text-success-600">↑ {data?.metrics?.revenue?.growth}% vs LMTD</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Support Velocity</h3>
                                        <p className="text-4xl font-black text-primary-600">{data?.metrics?.workforce?.supportVelocity}</p>
                                        <span className="text-xs font-bold text-secondary-500">Items / staff member</span>
                                    </div>
                                    <div className="card-premium">
                                        <h3 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Market Reach</h3>
                                        <p className="text-4xl font-black text-indigo-600">{data?.metrics?.market?.activeClients}</p>
                                        <span className="text-xs font-bold text-secondary-500">Active subscriptions</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Top Performers (HR only) */}
                        {selectedTab === 'hr' && data?.topPerformers && (
                            <div className="card-premium grid grid-cols-5 gap-4">
                                <div className="col-span-full mb-2">
                                    <h3 className="text-sm font-black text-secondary-400 uppercase tracking-widest">Monthly Leaderboard</h3>
                                </div>
                                {data.topPerformers.map((p: any, i: number) => (
                                    <div key={i} className="bg-secondary-50 p-4 rounded-2xl border border-secondary-100 text-center flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-black text-xs mb-2">
                                            #{i + 1}
                                        </div>
                                        <p className="font-bold text-secondary-900 truncate w-full">{p.name}</p>
                                        <p className="text-[10px] font-black text-primary-600 uppercase mt-1">{p.score}%</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Decision Feed */}
                        <div className="card-premium">
                            <h2 className="text-xl font-bold text-secondary-900 mb-6 flex items-center gap-2">
                                <span className="p-2 bg-primary-100 rounded-lg text-lg">🤖</span>
                                {selectedTab === 'executive' ? 'Executive Decision Matrix' : 'AI Strategic Insights'}
                            </h2>
                            <div className="space-y-3">
                                {(data?.insights || data?.decisionFeed || []).map((item: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-5 rounded-[1.5rem] border ${item.severity === 'high' || item.severity === 'critical'
                                            ? 'bg-danger-50 border-danger-100 shadow-sm'
                                            : 'bg-secondary-50 border-secondary-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="text-3xl filter grayscale-[0.5]">{item.icon || (item.severity === 'critical' ? '🚨' : '⚡')}</div>
                                            <div>
                                                <h4 className={`font-black text-sm uppercase tracking-wider ${item.severity === 'high' || item.severity === 'critical' ? 'text-danger-900' : 'text-secondary-900'}`}>
                                                    {item.title}
                                                </h4>
                                                <p className="text-secondary-600 text-sm mt-0.5">{item.description}</p>
                                                {item.action && (
                                                    <p className="text-[10px] font-black text-primary-600 uppercase mt-2 tracking-widest flex items-center gap-1">
                                                        <span>👉 Recommended:</span> {item.action}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {(item.type === 'churn' || item.type === 'upsell') && (
                                            <Link
                                                href={`/dashboard/customers/${item.id}?followUp=true`}
                                                className="btn btn-secondary text-xs px-6 py-2 rounded-xl"
                                            >
                                                Action
                                            </Link>
                                        )}
                                    </div>
                                ))}
                                {(data?.insights?.length === 0 && !data?.decisionFeed) && (
                                    <div className="text-center py-10 text-secondary-400 italic font-medium">
                                        No critical anomalies detected in the current dataset.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
