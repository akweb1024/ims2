
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
import { Target, CheckCircle } from 'lucide-react';

interface GoalAchievementChartProps {
    data: any[];
}

export default function GoalAchievementChart({ data }: GoalAchievementChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No goal data available to chart.</p>
            </div>
        );
    }

    const chartData = data.map(item => ({
        name: item.monthName,
        target: item.goalTarget || 0,
        achieved: item.goalAchieved || 0,
        percentage: item.goalAchievement || 0
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-secondary-200 shadow-lg rounded-xl text-xs">
                    <p className="font-black text-secondary-900 mb-2 uppercase tracking-wider">{label}</p>
                    <div className="space-y-1.5">
                        <p className="flex items-center justify-between gap-4">
                            <span className="text-secondary-500">Target Value:</span>
                            <span className="font-bold text-secondary-900">{payload[0].value}</span>
                        </p>
                        <p className="flex items-center justify-between gap-4">
                            <span className="text-orange-500">Achieved:</span>
                            <span className="font-bold text-orange-600">{payload[1].value}</span>
                        </p>
                        <div className="mt-2 pt-2 border-t border-secondary-100 flex items-center justify-between gap-4">
                            <span className="font-bold text-secondary-700">Achievement Rate:</span>
                            <span className={`font-black ${payload[0].payload.percentage >= 100 ? 'text-success-600' : 'text-orange-500'}`}>
                                {payload[0].payload.percentage.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card-premium p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="font-black text-secondary-900 flex items-center gap-2">
                        <Target className="text-primary-600" size={18} /> Goal Achievement Trends
                    </h3>
                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest mt-1">
                        Monthly KRA/KPI Completion Performance
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-secondary-200 rounded-full"></div>
                        <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-tighter">Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-tighter">Achieved</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                    >
                        <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
                        <Bar
                            dataKey="target"
                            barSize={32}
                            fill="#e2e8f0"
                            radius={[4, 4, 0, 0]}
                        />
                        <Bar
                            dataKey="achieved"
                            barSize={32}
                            fill="#f97316"
                            radius={[4, 4, 0, 0]}
                        />
                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            yAxisId={0}
                            hide={true} // Hidden trend line but used in tooltip
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
