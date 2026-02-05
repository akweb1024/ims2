
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, LayoutDashboard, Landmark, HardDrive, Download } from "lucide-react";

// New Advanced Components
import AdvancedKPIStats from "./AdvancedKPIStats";
import RevenueTrendsChart from "./RevenueTrendsChart";
import HeadcountTrends from "./HeadcountTrends";
import PendingApprovals from "./PendingApprovals";
import QuickActions from "./QuickActions";
import AlertsWidget from "./AlertsWidget";
import AuditLogFeed from "./AuditLogFeed";
import SystemSettingsControl from "./SystemSettingsControl";

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
    system: {
        settings: any;
        auditLogs: any[];
    }
}

type TabType = "overview" | "financials" | "system";

export default function SuperAdminView() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const [error, setError] = useState("");
    const router = useRouter();

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

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
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();

        // Auto refresh every 5 minutes
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleExport = () => {
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
            <div className="flex items-center justify-center p-20 min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
                    <p className="text-secondary-500 font-medium animate-pulse">Initializing Control Tower...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <div className="bg-danger-50 text-danger-600 p-6 rounded-2xl border border-danger-100 max-w-md mx-auto">
                    <p className="font-bold text-lg mb-2">Error Loading Dashboard</p>
                    <p className="text-sm mb-4">{error}</p>
                    <button onClick={() => fetchData()} className="btn-danger py-2 px-6">Try Again</button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 p-8 bg-secondary-50 min-h-screen">
            {/* 1. Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-secondary-900 tracking-tight mb-2">Executive Control Tower</h1>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-[10px] font-black uppercase tracking-widest">
                            Managing Director View
                        </span>
                        <p className="text-secondary-500 text-xs font-medium">
                            {data.executive?.activeCompanies || 0} Companies • {data.executive?.totalHeadcount || 0} Employees • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="p-2.5 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors disabled:opacity-50"
                        title="Manual Refresh"
                    >
                        <RefreshCw size={20} className={`text-secondary-600 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium text-sm"
                        title="Export Dashboard Data"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Data</span>
                    </button>
                </div>
            </div>

            {/* 2. Advanced KPI Stats Row */}
            {data.executive && (
                <section>
                    <AdvancedKPIStats data={data.executive} />
                </section>
            )}

            {/* 3. Navigation Tabs */}
            <div className="flex items-center border-b border-secondary-200 gap-8 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === "overview" ? "border-primary-500 text-primary-600" : "border-transparent text-secondary-400 hover:text-secondary-600"}`}
                >
                    <LayoutDashboard size={16} />
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("financials")}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === "financials" ? "border-primary-500 text-primary-600" : "border-transparent text-secondary-400 hover:text-secondary-600"}`}
                >
                    <Landmark size={16} />
                    Financial Analysis
                </button>
                <button
                    onClick={() => setActiveTab("system")}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === "system" ? "border-primary-500 text-primary-600" : "border-transparent text-secondary-400 hover:text-secondary-600"}`}
                >
                    <HardDrive size={16} />
                    System Admin
                </button>
            </div>

            {/* 4. Tab Content */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {activeTab === "overview" && (
                    <>
                        {/* Quick Actions - Prominent Widget */}
                        <QuickActions onExport={handleExport} />

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {data.trends && <RevenueTrendsChart data={data.trends} />}
                            <HeadcountTrends data={{ companies: data.companyStats || [] }} />
                        </div>

                        {/* Company Performance & Widgets */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    </>
                )}

                {activeTab === "financials" && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <SalaryAnalysisSection
                                    data={data.salary}
                                    companyStats={data.companyStats}
                                />
                            </div>
                            <div className="space-y-6">
                                <Card className="border-secondary-200">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-black text-secondary-900">Revenue Distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {data.financials.sort((a, b) => b.totalRevenue - a.totalRevenue).map((item, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-secondary-700">{item.companyName}</span>
                                                    <span className="text-sm font-black text-primary-600">₹{(item.totalRevenue / 100000).toFixed(1)}L</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "system" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <SystemSettingsControl settings={data.system?.settings} />
                            <div className="card-premium p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                                <h3 className="text-xl font-black mb-2 italic">Broadcast Message</h3>
                                <p className="text-white/80 text-sm mb-6 font-medium">Send a global notification to all active companies and employees.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type your announcement..."
                                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:bg-white/20 placeholder:text-white/50"
                                    />
                                    <button className="bg-white text-indigo-700 font-black px-6 py-2 rounded-xl hover:bg-white/90 transition-colors uppercase text-xs tracking-widest">
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="h-[600px]">
                            <AuditLogFeed logs={data.system?.auditLogs || []} />
                        </div>
                    </div>
                )}
            </div>

            {/* 5. Footer Info */}
            <div className="flex items-center justify-between text-[10px] text-secondary-400 pt-8 border-t border-secondary-100">
                <p>System Status: <span className="text-success-500 font-bold">ONLINE</span> • {data.executive?.totalRevenue > 0 ? 'Revenue Verified' : 'Checking Financials'}</p>
                <p>Last updated: {new Date().toLocaleString()} • Auto-refreshes every 300s</p>
            </div>
        </div>
    );
}

// Small Card wrapper to avoid import issues if not exported
function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-white rounded-2xl border ${className}`}>
            {children}
        </div>
    );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return <div className={`p-6 pb-4 ${className}`}>{children}</div>;
}

function CardTitle({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return <h3 className={className}>{children}</h3>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}
