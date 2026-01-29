
"use client";

import { useEffect, useState } from "react";
import FinancialsSection from "./FinancialsSection";
import EmployeeStatsSection from "./EmployeeStatsSection";
import SalaryAnalysisSection from "./SalaryAnalysisSection";
import ExecutiveSummary from "./ExecutiveSummary";
import CompanyPerformanceGrid from "./CompanyPerformanceGrid";
import { Card } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminView() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/super-admin/analytics');
                if (res.status === 403) {
                    router.push('/dashboard'); // Redirect unauthorized
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

    return (
        <div className="space-y-8 p-8">
            {/* Dashboard Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-secondary-900 mb-2">Executive Overview</h1>
                <p className="text-secondary-500 text-sm">Strategic insights across {data?.executive?.activeCompanies} companies.</p>
            </div>

            {/* 1. Executive Summary Cards (MD Level) */}
            {data?.executive && (
                <section className="mb-10">
                    <ExecutiveSummary data={data.executive} />
                </section>
            )}

            {/* 2. Company Performance Grid */}
            <section className="mb-10">
                <CompanyPerformanceGrid financials={data?.financials || []} employees={data?.demographics || []} />
            </section>

            {/* 3. Deep Dive Analytics */}
            <div className="space-y-10 border-t border-secondary-200 pt-10">
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-2xl font-bold text-secondary-900">Detailed Analytics</h2>
                    <span className="h-px flex-1 bg-secondary-200"></span>
                </div>
            </div>

            <SalaryAnalysisSection data={data.salary} />

        </div>
    );
}
