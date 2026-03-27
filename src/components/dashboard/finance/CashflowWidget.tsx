'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

type ForecastPoint = {
    month: string;
    projectedRevenue: number;
    projectedExpense: number;
    isForecast?: boolean;
};

type FinanceAnalyticsResponse = {
    charts?: {
        forecast?: ForecastPoint[];
    };
};

export default function CashflowWidget() {
    const [analytics, setAnalytics] = useState<FinanceAnalyticsResponse | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const response = await fetch('/api/finance/analytics');
                if (!response.ok) return;
                setAnalytics(await response.json());
            } catch (error) {
                console.error('Failed to load cashflow widget analytics', error);
            }
        };

        loadAnalytics();
    }, []);

    const chartData = useMemo(
        () =>
            (analytics?.charts?.forecast ?? []).map((item) => ({
                month: item.month,
                value: Number((item.projectedRevenue - item.projectedExpense).toFixed(2)),
            })),
        [analytics?.charts?.forecast]
    );

    const projectedBalance = useMemo(
        () => chartData.reduce((sum, item) => sum + item.value, 0),
        [chartData]
    );

    const formattedProjectedBalance = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 1,
        notation: 'compact',
    }).format(projectedBalance || 0);

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Target className="h-6 w-6 text-white" />
                    </div>
                    <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        AI Forecast
                    </span>
                </div>

                <h3 className="text-3xl font-black mb-1">{formattedProjectedBalance}</h3>
                <p className="text-indigo-200 text-xs font-medium mb-6">Projected Balance (next 30 days)</p>

                <Link href="/dashboard/finance/forecasting" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:gap-3 transition-all">
                    View Analysis <ArrowRight size={14} />
                </Link>
            </div>

            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-30 translate-y-2 translate-x-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <Area type="monotone" dataKey="value" stroke="none" fill="#ffffff" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
