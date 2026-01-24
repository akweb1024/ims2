'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementAnalyticsDashboard from '@/components/dashboard/hr/IncrementAnalyticsDashboard';
import { Activity, RefreshCw, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function IncrementAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [fiscalYear, setFiscalYear] = useState<string>(''); // Empty means all time

    // Generate FY options (last 3 years + current + next)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const fyOptions = [];
    for (let i = -2; i <= 1; i++) {
        const startYear = currentMonth >= 3 ? currentYear + i : currentYear + i - 1;
        const endYear = startYear + 1;
        fyOptions.push({
            value: `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`,
            label: `FY ${startYear}-${endYear}`
        });
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const url = fiscalYear
                    ? `/api/hr/increments/analytics?fiscalYear=${fiscalYear}`
                    : '/api/hr/increments/analytics';
                const res = await fetch(url, {
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
    }, [fiscalYear]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-12 text-center animate-pulse">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="text-primary-600 animate-spin" size={32} />
                    </div>
                    <p className="text-secondary-600 font-bold text-lg">Synthesizing Analytics Intelligence...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="p-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-8 text-sm font-bold">
                    <Link href="/dashboard" className="text-secondary-400 hover:text-primary-600 transition-colors">
                        <Home size={16} />
                    </Link>
                    <ChevronRight size={14} className="text-secondary-300" />
                    <Link href="/dashboard/hr-management" className="text-secondary-400 hover:text-primary-600 transition-colors">
                        HR Management
                    </Link>
                    <ChevronRight size={14} className="text-secondary-300" />
                    <Link href="/dashboard/hr-management/increments" className="text-secondary-400 hover:text-primary-600 transition-colors">
                        Increments
                    </Link>
                    <ChevronRight size={14} className="text-secondary-300" />
                    <span className="text-primary-600">360° Analysis</span>
                </div>

                {/* Fiscal Year Selector */}
                <div className="mb-6 flex items-center gap-4">
                    <label className="text-sm font-bold text-secondary-700">Filter by Fiscal Year:</label>
                    <select
                        value={fiscalYear}
                        onChange={(e) => setFiscalYear(e.target.value)}
                        className="px-4 py-2 border-2 border-secondary-200 rounded-lg font-bold text-sm focus:border-primary-500 focus:outline-none transition-colors bg-white"
                    >
                        <option value="">All Time</option>
                        {fyOptions.map(fy => (
                            <option key={fy.value} value={fy.value}>{fy.label}</option>
                        ))}
                    </select>
                    {fiscalYear && (
                        <button
                            onClick={() => setFiscalYear('')}
                            className="text-sm text-primary-600 hover:text-primary-700 font-bold underline"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>

                {data ? (
                    <IncrementAnalyticsDashboard data={data} />
                ) : (
                    <div className="card-premium p-12 text-center">
                        <div className="w-20 h-20 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Activity className="text-danger-500" size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-secondary-900 mb-2">Analytics Engine Offline</h3>
                        <p className="text-secondary-500 max-w-md mx-auto">We encountered an issue retrieving the salary data. Please ensure you have sufficient permissions and data records exist.</p>
                        <button onClick={() => window.location.reload()} className="mt-8 btn btn-primary px-8">Re-Initialize Session</button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
