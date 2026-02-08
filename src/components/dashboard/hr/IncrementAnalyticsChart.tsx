'use client';

import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { FormattedNumber } from '@/components/common/FormattedNumber';

interface IncrementAnalyticsChartProps {
    data: any[];
}

export default function IncrementAnalyticsChart({ data }: IncrementAnalyticsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-secondary-400 bg-secondary-50 rounded-lg border border-dashed border-secondary-200">
                No increment data available for this period.
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 0,
                    }}
                >
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                        dy={10}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#6366f1"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 800, fill: '#4f46e5' }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#f59e0b"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 800, fill: '#d97706' }}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0',
                            padding: '12px'
                        }}
                        itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                        formatter={(value: any, name: any) => {
                            if (typeof value === 'number') {
                                if (name === 'Total Impact' || name === 'Revenue Target' || name === 'Revenue Achieved') return [`₹${value.toLocaleString()}`, name];
                                if (name === 'Avg Increase') return [`${value}%`, name];
                            }
                            return [value, name];
                        }}
                    />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 700 }}
                    />
                    <Bar
                        yAxisId="left"
                        dataKey="amount"
                        name="Total Impact"
                        barSize={40}
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenueTarget"
                        name="Revenue Target"
                        stroke="#10b981"
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenueAchieved"
                        name="Revenue Achieved"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="percentage"
                        name="Avg Increase"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
