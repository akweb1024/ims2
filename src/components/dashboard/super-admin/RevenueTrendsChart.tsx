
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendData {
    revenue: Record<string, Record<string, number>>;
}

interface ChartDataPoint {
    month: string;
    [key: string]: string | number;
}

export default function RevenueTrendsChart({ data }: { data: TrendData }) {
    // Transform data for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Get last 6 months
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        last6Months.push(months[monthIndex]);
    }

    // Build chart data
    const chartData: ChartDataPoint[] = last6Months.map((month, idx) => {
        const actualMonthIndex = (currentMonth - 5 + idx);
        const monthKey = new Date(new Date().getFullYear(), actualMonthIndex, 1).toISOString().slice(0, 7);

        const point: ChartDataPoint = { month };

        Object.entries(data.revenue).forEach(([company, monthlyData]) => {
            point[company] = monthlyData[monthKey] || 0;
        });

        return point;
    });

    // Get top 5 companies by total revenue
    const companyTotals = Object.entries(data.revenue).map(([name, monthlyData]) => ({
        name,
        total: Object.values(monthlyData).reduce((a, b) => (a as number) + (b as number), 0) as number
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

    const formatYAxis = (value: number) => {
        if (value >= 1000000) return `₹${(value / 1000000).toFixed(0)}M`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
        return `₹${value}`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Revenue Trends (Last 6 Months)</span>
                    <span className="text-xs font-normal text-secondary-500">All Companies</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                        <Tooltip
                            formatter={(value: number | undefined) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <Legend />
                        {companyTotals.map((company, idx) => (
                            <Line
                                key={company.name}
                                type="monotone"
                                dataKey={company.name}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
