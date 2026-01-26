'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const chartData = [
    { name: 'Jan', Courses: 12000, Workshops: 5000 },
    { name: 'Feb', Courses: 19000, Workshops: 10000 },
    { name: 'Mar', Courses: 3000, Workshops: 15000 },
    { name: 'Apr', Courses: 5000, Workshops: 10000 },
    { name: 'May', Courses: 2000, Workshops: 20000 },
    { name: 'Jun', Courses: 3000, Workshops: 25000 },
];

export default function LMSCharts() {
    return (
        <div className="lg:col-span-2 card-dashboard p-6">
            <h3 className="font-bold text-lg mb-4">Revenue Trends</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Courses" stroke="#8b5cf6" />
                        <Line type="monotone" dataKey="Workshops" stroke="#ec4899" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
