'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementAnalyticsDashboard from '@/components/dashboard/hr/IncrementAnalyticsDashboard';
import { Activity, RefreshCw, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export default function IncrementAnalyticsPage() {
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
