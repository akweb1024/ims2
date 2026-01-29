import { Card, CardContent } from "@/components/ui/Card";
import { TrendingUp, Users, Flame, Wallet, Building2 } from "lucide-react";

interface ExecutiveData {
    totalRevenue: number;
    totalHeadcount: number;
    monthlyBurnRate: number;
    netProfitEstimate: number;
    activeCompanies: number;
}

export default function ExecutiveSummary({ data }: { data: ExecutiveData }) {
    const metrics = [
        {
            label: "Total Group Revenue",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(data.totalRevenue),
            subtext: "Across all entities",
            icon: Wallet,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            trend: "+12%" // Mock trend
        },
        {
            label: "Net Profit (Est.)",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(data.netProfitEstimate),
            subtext: "Revenue - Annualized Burn",
            icon: TrendingUp,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            trend: "+5%"
        },
        {
            label: "Monthly Burn Rate",
            value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(data.monthlyBurnRate),
            subtext: "Total Salaries / Month",
            icon: Flame,
            color: "text-rose-600",
            bg: "bg-rose-50",
            trend: "-2%"
        },
        {
            label: "Total Workforce",
            value: data.totalHeadcount,
            subtext: `Across ${data.activeCompanies} Companies`,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            trend: "+8"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, i) => (
                <Card key={i} className="border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-secondary-500 uppercase tracking-wider">{metric.label}</p>
                                <h3 className="text-2xl font-black text-secondary-900 mt-2">{metric.value}</h3>
                                <p className="text-xs text-secondary-400 mt-1">{metric.subtext}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${metric.bg} ${metric.color}`}>
                                <metric.icon size={24} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-bold">
                            <span className={metric.trend.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}>
                                {metric.trend}
                            </span>
                            <span className="text-secondary-400 ml-1">vs last month</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
