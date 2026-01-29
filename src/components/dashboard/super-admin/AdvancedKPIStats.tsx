
"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { TrendingUp, TrendingDown, DollarSign, Users, Flame, Target, Building2, Activity } from "lucide-react";

interface ExecutiveData {
    totalRevenue: number;
    totalHeadcount: number;
    monthlyBurnRate: number;
    netProfitEstimate: number;
    activeCompanies: number;
    overallGrowth: number;
    avgRevenuePerCompany: number;
    avgHeadcountPerCompany: number;
    employeeTypeBreakdown: Record<string, number>;
}

interface KPIMetric {
    label: string;
    value: string;
    subtext: string;
    icon: any;
    color: string;
    bg: string;
    trend: number;
    trendLabel: string;
}

export default function AdvancedKPIStats({ data }: { data: ExecutiveData }) {
    const formatCurrency = (value: number) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value}`;
    };

    const metrics: KPIMetric[] = [
        {
            label: "Total Group Revenue",
            value: formatCurrency(data.totalRevenue),
            subtext: `Avg ₹${(data.avgRevenuePerCompany / 100000).toFixed(1)}L per company`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            trend: data.overallGrowth,
            trendLabel: "vs last month"
        },
        {
            label: "Net Profit (Est.)",
            value: formatCurrency(data.netProfitEstimate),
            subtext: "Revenue - Annualized Burn",
            icon: Activity,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            trend: data.netProfitEstimate > 0 ? 15 : -5,
            trendLabel: "profit margin"
        },
        {
            label: "Monthly Burn Rate",
            value: formatCurrency(data.monthlyBurnRate),
            subtext: `Avg ₹${(data.monthlyBurnRate / (data.totalHeadcount || 1)).toFixed(0)}K/employee`,
            icon: Flame,
            color: "text-rose-600",
            bg: "bg-rose-50",
            trend: -2,
            trendLabel: "optimization"
        },
        {
            label: "Total Workforce",
            value: data.totalHeadcount.toString(),
            subtext: `Across ${data.activeCompanies} companies`,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            trend: 8,
            trendLabel: "new hires"
        },
        {
            label: "Active Companies",
            value: data.activeCompanies.toString(),
            subtext: "Fully operational entities",
            icon: Building2,
            color: "text-violet-600",
            bg: "bg-violet-50",
            trend: 0,
            trendLabel: "stable"
        },
        {
            label: "Avg Headcount/Company",
            value: data.avgHeadcountPerCompany.toFixed(1),
            subtext: "Employees per entity",
            icon: Target,
            color: "text-amber-600",
            bg: "bg-amber-50",
            trend: 5,
            trendLabel: "growth"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics.map((metric, i) => (
                <Card key={i} className="border-secondary-200 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${metric.bg} ${metric.color}`}>
                                <metric.icon size={18} />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-secondary-500 uppercase tracking-wider">{metric.label}</p>
                        <h3 className="text-xl font-black text-secondary-900 mt-1">{metric.value}</h3>

                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-secondary-400">{metric.subtext}</span>
                            {metric.trend !== 0 && (
                                <div className={`flex items-center gap-1 text-xs font-bold ${metric.trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {metric.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {metric.trend > 0 ? '+' : ''}{metric.trend}%
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
