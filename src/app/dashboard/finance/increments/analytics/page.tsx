'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementAnalyticsDashboard from '@/components/dashboard/hr/IncrementAnalyticsDashboard';
import { Activity, RefreshCw, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function FinanceIncrementAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/hr/increments/analytics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-12 text-center animate-pulse">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="text-blue-600 animate-spin" size={32} />
                    </div>
                    <p className="text-secondary-600 font-bold text-lg">Loading Financial Budget Intelligence...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-8 text-sm font-bold">
                    <Link href="/dashboard" className="text-secondary-400 hover:text-blue-600 transition-colors">
                        <Home size={16} />
                    </Link>
                    <ChevronRight size={14} className="text-secondary-300" />
                    <Link href="/dashboard/finance" className="text-secondary-400 hover:text-blue-600 transition-colors">
                        Finance
                    </Link>
                    <ChevronRight size={14} className="text-secondary-300" />
                    <span className="text-blue-600">Salary Budget 360°</span>
                </div>

                {data ? (
                    <IncrementAnalyticsDashboard data={data} />
                ) : (
                    <div className="card-premium p-12 text-center border-blue-100">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="text-blue-500" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-secondary-900 mb-2">Budget Analytics Unavailable</h3>
                        <p className="text-secondary-500 max-w-md mx-auto">Access to payroll impact statistics is restricted or data is currently being re-indexed.</p>
                        <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all">Retry Secure Connection</button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
