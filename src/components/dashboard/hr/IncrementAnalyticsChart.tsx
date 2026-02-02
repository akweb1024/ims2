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
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="month"
                        scale="point"
                        padding={{ left: 10, right: 10 }}
                        tick={{ fontSize: 12 }}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#6366f1"
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: 'none'
                        }}
                        formatter={(value: any, name: any) => {
                            if (typeof value === 'number') {
                                if (name === 'Total Impact') return [`₹${value.toLocaleString()}`, name];
                                if (name === 'Avg Increase') return [`${value}%`, name];
                            }
                            return [value, name];
                        }}
                    />
                    <Legend />
                    <Bar
                        yAxisId="left"
                        dataKey="amount"
                        name="Total Impact"
                        barSize={30}
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="percentage"
                        name="Avg Increase"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
