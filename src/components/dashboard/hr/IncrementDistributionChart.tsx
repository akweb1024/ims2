'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface IncrementDistributionChartProps {
    data: {
        name: string;
        value: number;
    }[];
}

export default function IncrementDistributionChart({ data }: IncrementDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
                No data available
            </div>
        );
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -10,
                        bottom: 0,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e2e8f0'
                        }}
                    />
                    <Bar dataKey="value" barSize={50} radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={[
                                    '#6366f1', // Indigo
                                    '#8b5cf6', // Violet
                                    '#ec4899', // Pink
                                    '#f43f5e', // Rose
                                    '#f59e0b'  // Amber
                                ][index % 5]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
