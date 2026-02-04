'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueChartProps {
    data: any[]; // { name, value }
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#6366F1'];

export default function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400">No data available</div>;

    // Custom Tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-gray-100 p-3 rounded-xl shadow-lg">
                    <p className="text-gray-900 font-bold mb-1">{payload[0].name}</p>
                    <p className="text-gray-600 text-sm">₹{payload[0].value.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mb-4">
                <span className="block text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">Total</span>
                {/* This total might be misleading if the chart is filtered, but OK for now */}
            </div>
        </div>
    );
}
