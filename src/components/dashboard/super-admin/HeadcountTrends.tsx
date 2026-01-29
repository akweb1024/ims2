
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CompanyStats {
    companyId: string;
    companyName: string;
    total: number;
    breakdown: Record<string, number>;
    avgSalary: number;
    totalSalary: number;
    monthlyHeadcount: Record<string, number>;
}

interface HeadcountData {
    companies: CompanyStats[];
}

export default function HeadcountTrends({ data }: { data: HeadcountData }) {
    // Prepare data for headcount chart
    const chartData = data.companies.map(c => ({
        name: c.companyName.length > 10 ? c.companyName.substring(0, 10) + '...' : c.companyName,
        fullName: c.companyName,
        headcount: c.total,
        avgSalary: Math.round(c.avgSalary / 1000), // in thousands
        totalSalary: Math.round(c.totalSalary / 1000) // in thousands
    })).sort((a, b) => b.headcount - a.headcount);

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Headcount & Salary Distribution</span>
                    <span className="text-xs font-normal text-secondary-500">By Company</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Headcount', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Avg Salary (K)', angle: 90, position: 'insideRight' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            formatter={(value, name) => {
                                const val = (value as number) || 0;
                                const label = (name as string) || '';
                                if (label === 'headcount') return [val, 'Headcount'];
                                if (label === 'avgSalary') return [`₹${val}K`, 'Avg Salary'];
                                return [val, label];
                            }}
                        />
                        <Bar yAxisId="left" dataKey="headcount" name="headcount" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Bar>
                        <Bar yAxisId="right" dataKey="avgSalary" name="avgSalary" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
