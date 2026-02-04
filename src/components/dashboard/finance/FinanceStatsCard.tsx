import { ArrowUpRight, ArrowDownRight, TrendingUp, Info } from 'lucide-react';

interface FinanceStatsCardProps {
    title: string;
    amount: number; // Raw amount
    currency?: string;
    trend?: number; // Percentage change
    trendUpGood?: boolean; // Is positive trend good? (e.g. yes for Revenue, no for Burn Rate)
    icon?: React.ReactNode;
    subtitle?: string; // e.g. "vs last month"
    color?: 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'violet';
    loading?: boolean;
}

export default function FinanceStatsCard({
    title,
    amount,
    currency = '₹',
    trend,
    trendUpGood = true,
    icon,
    subtitle = "vs last month",
    color = 'blue',
    loading = false
}: FinanceStatsCardProps) {
    if (loading) {
        return (
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm h-[160px] animate-pulse relative overflow-hidden">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 w-2/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
            </div>
        )
    }

    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-500/10',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-500/10',
        rose: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-500/10',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-500/10',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-500/10',
        violet: 'bg-violet-50 text-violet-600 border-violet-100 ring-violet-500/10',
    };

    const styles = colorClasses[color];

    const isTrendPositive = trend && trend > 0;
    const isTrendNeutral = !trend || trend === 0;

    // Determine trend color based on "good" direction
    let trendColor = 'text-gray-500';
    if (!isTrendNeutral && trend) {
        if (trendUpGood) {
            trendColor = isTrendPositive ? 'text-emerald-600' : 'text-rose-600';
        } else {
            trendColor = isTrendPositive ? 'text-rose-600' : 'text-emerald-600';
        }
    }

    return (
        <div className="group relative bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ring-1 ring-black/5">
            {/* Background Decor */}
            <div className={`absolute top-0 right-0 p-24 rounded-full bg-gradient-to-br from-${color}-500/5 to-transparent blur-2xl -mr-10 -mt-10 pointer-events-none`}></div>

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                        {title}
                        <Info className="w-3 h-3 text-gray-300 cursor-help" />
                    </h3>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-black text-gray-800 tracking-tight">
                            {currency}{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>

                <div className={`p-3 rounded-2xl ${styles} shadow-inner`}>
                    {icon || <TrendingUp className="w-6 h-6" />}
                </div>
            </div>

            {/* Footer / Trend Section */}
            <div className="mt-6 flex items-center gap-2">
                {trend !== undefined && (
                    <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${trendColor} bg-opacity-10 bg-gray-100`}>
                        {isTrendPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
                <span className="text-xs text-gray-400 font-medium">
                    {subtitle}
                </span>
            </div>
        </div>
    );
}
