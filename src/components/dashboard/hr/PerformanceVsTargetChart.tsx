'use client';

import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { FormattedNumber } from '@/components/common/FormattedNumber';

interface PerformanceVsTargetChartProps {
    data: any[];
    scope?: 'INDIVIDUAL' | 'TEAM' | 'COMPANY';
}

export default function PerformanceVsTargetChart({ data, scope = 'INDIVIDUAL' }: PerformanceVsTargetChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No performance data available to chart.</p>
            </div>
        );
    }

    // Process data to ensure numbers
    const chartData = data.map(item => ({
        name: item.period || item.monthName || item.year,
        target: item.target || item.revenueTarget || 0,
        actual: item.revenue || item.totalRevenueGenerated || 0,
        achievement: item.achievement || item.revenueAchievement || 0
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-gray-900 mb-1">{label}</p>
                    <p className="text-indigo-600 font-semibold mb-1">
                        Actual: <FormattedNumber value={payload[0].value} currency="INR" compact />
                    </p>
                    <p className="text-gray-500 font-medium">
                        Target: <FormattedNumber value={payload[1].value} currency="INR" compact />
                    </p>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between gap-4">
                        <span>Achievement:</span>
                        <span className={`font-bold ${payload[0].payload.achievement >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                            {payload[0].payload.achievement.toFixed(1)}%
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card-premium p-4 md:p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Revenue Performance</h3>
                    <p className="text-xs text-gray-500">Actual Revenue vs Target ({scope})</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
                        <span className="text-gray-600">Actual</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-1 bg-orange-400 rounded-full"></div>
                        <span className="text-gray-600">Target</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                        <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280', fontSize: 11 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                        <Bar
                            dataKey="actual"
                            barSize={32}
                            fill="#6366f1"
                            radius={[4, 4, 0, 0]}
                        />
                        <Line
                            type="monotone"
                            dataKey="target"
                            stroke="#fb923c"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ fill: '#fb923c', r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
