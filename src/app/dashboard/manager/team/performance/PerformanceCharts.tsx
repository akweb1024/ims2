'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

interface PerformanceChartsProps {
    data: {
        date: Date;
        rating: number;
        type: string;
    }[];
}

export default function PerformanceCharts({ data }: PerformanceChartsProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400">
                No performance data available for trends
            </div>
        );
    }

    // Format dates for display
    const chartData = data.map(item => ({
        ...item,
        dateStr: format(new Date(item.date), 'MMM d'),
        fullDate: format(new Date(item.date), 'PPP')
    }));

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="dateStr"
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #F3F4F6'
                        }}
                        formatter={(value: any) => [`${value} / 5`, 'Rating']}
                        labelFormatter={(label) => `Date: ${label}`}
                    />
                    <ReferenceLine y={3} stroke="#F59E0B" strokeDasharray="3 3" />
                    <Area
                        type="monotone"
                        dataKey="rating"
                        stroke="#4F46E5"
                        fill="#EEF2FF"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
