
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

    // Check if there's any data
    const hasData = companyTotals.length > 0 && companyTotals.some(c => c.total > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Revenue Trends (Last 6 Months)</span>
                    <span className="text-xs font-normal text-secondary-500">All Companies</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                {!hasData ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="text-secondary-400 mb-2">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <p className="text-secondary-500 font-medium">No revenue data available</p>
                            <p className="text-secondary-400 text-sm mt-1">Revenue trends will appear here once data is recorded</p>
                        </div>
                    </div>
                ) : (
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
                )}
            </CardContent>
        </Card>
    );
}
