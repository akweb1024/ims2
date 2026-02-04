'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CashFlowChartProps {
    data: any[];
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
    if (!data || data.length === 0) return <div className="h-full w-full flex items-center justify-center text-gray-400">No data available</div>;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm border border-gray-100 p-4 rounded-xl shadow-xl">
                    <p className="text-gray-900 font-bold mb-2">{label}</p>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-sm text-gray-600">Verified Revenue</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">
                                ₹{payload[0]?.value?.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                <span className="text-sm text-gray-600">Expenses</span>
                            </div>
                            <span className="text-sm font-bold text-rose-600">
                                ₹{payload[1]?.value?.toLocaleString()}
                            </span>
                        </div>
                        {/* {payload[2] && (
                             <div className="flex items-center justify-between gap-4 border-t pt-2 mt-2 border-dashed">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                    <span className="text-sm text-gray-600">Pending</span>
                                </div>
                                <span className="text-sm font-bold text-amber-600">
                                    ₹{payload[2]?.value?.toLocaleString()}
                                </span>
                            </div>
                        )} */}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full bg-white rounded-2xl p-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        stackId="1" // Do NOT stack IF you want absolute comparison. But stacked is 'net' visual sometimes. Let's start with unstacked for comparison.
                    // Actually, unstacked is better for comparison.
                    />
                    <Area
                        type="monotone"
                        dataKey="expense"
                        name="Expense"
                        stroke="#F43F5E"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
