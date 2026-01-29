
"use client";

import { useEffect, useState } from "react";
import FinancialsSection from "./FinancialsSection";
import EmployeeStatsSection from "./EmployeeStatsSection";
import SalaryAnalysisSection from "./SalaryAnalysisSection";
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
            <h1 className="text-3xl font-black text-secondary-900">Organization Overview</h1>

            {/* Financial Overview */}
            <FinancialsSection data={data.financials} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Employee Breakdown */}
                <EmployeeStatsSection data={data.demographics} />

                {/* Salary Info */}
                <div className="col-span-1">
                    <p className="text-gray-500 mb-4">Detailed salary analysis by department and management hierarchy.</p>
                    {/* We can put a summary here, but SalaryAnalysisSection is full width usually. Let's make it full width below. */}
                </div>
            </div>

            <SalaryAnalysisSection data={data.salary} />

        </div>
    );
}
