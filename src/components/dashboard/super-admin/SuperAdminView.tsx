
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// New Advanced Components
import AdvancedKPIStats from "./AdvancedKPIStats";
import RevenueTrendsChart from "./RevenueTrendsChart";
import HeadcountTrends from "./HeadcountTrends";
import PendingApprovals from "./PendingApprovals";
import QuickActions from "./QuickActions";
import AlertsWidget from "./AlertsWidget";

// Existing Components (enhanced versions)
import CompanyPerformanceGrid from "./CompanyPerformanceGrid";
import SalaryAnalysisSection from "./SalaryAnalysisSection";

interface DashboardData {
    executive: any;
    financials: any[];
    companyStats: any[];
    salary: any;
    trends: any;
    approvals: any;
    alerts: any[];
}

export default function SuperAdminView() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/super-admin/analytics');
                if (res.status === 403) {
                    router.push('/dashboard');
                    return;
                }
                if (!res.ok) throw new Error("Failed to fetch data");
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error(err);
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleExport = () => {
        // Export dashboard data as JSON
        if (data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `superadmin-dashboard-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="animate-spin h-10 w-10 text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="p-10 text-red-500">{error}</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-8 p-8 bg-secondary-50 min-h-screen">
            {/* Dashboard Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-black text-secondary-900 mb-2">Executive Dashboard</h1>
                <p className="text-secondary-500 text-sm">
                    Managing Director Overview • {data.executive?.activeCompanies || 0} Companies • {data.executive?.totalHeadcount || 0} Employees
                </p>
            </div>

            {/* 1. Advanced KPI Stats Row */}
            {data.executive && (
                <section className="mb-8">
                    <AdvancedKPIStats data={data.executive} />
                </section>
            )}

            {/* 2. Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {data.trends && (
                    <RevenueTrendsChart data={data.trends} />
                )}
                <HeadcountTrends data={{ companies: data.companyStats || [] }} />
            </div>

            {/* 3. Company Performance & Approvals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <CompanyPerformanceGrid
                        financials={data.financials || []}
                        employees={data.companyStats?.map((c: any) => ({ companyName: c.companyName, total: c.total })) || []}
                    />
                </div>
                <div className="space-y-6">
                    {data.approvals && <PendingApprovals data={data.approvals} />}
                    <AlertsWidget data={{ alerts: data.alerts || [] }} />
                </div>
            </div>

            {/* 4. Salary Analysis & Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <SalaryAnalysisSection data={data.salary} />
                </div>
                <QuickActions onExport={handleExport} />
            </div>

            {/* 5. Footer Info */}
            <div className="text-center text-xs text-secondary-400 pt-4">
                <p>Last updated: {new Date().toLocaleString()} • Data refreshes automatically every 5 minutes</p>
            </div>
        </div>
    );
}
