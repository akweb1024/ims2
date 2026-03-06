"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CustomerGrowthChart({ data }: { data: { name: string; customers: number }[] }) {
    if (!data || data.length === 0) {
        return <div className="h-full flex items-center justify-center text-secondary-400 italic">No growth data available</div>;
    }
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="customers" stroke="#8884d8" fillOpacity={1} fill="url(#colorCustomers)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}
