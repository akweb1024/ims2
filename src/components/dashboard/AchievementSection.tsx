'use client';

import { CheckCircle2, TrendingUp, Target, Rocket } from 'lucide-react';

interface AchievementSectionProps {
    report: any;
}

export default function AchievementSection({ report }: AchievementSectionProps) {
    if (!report) return null;

    const metrics = [
        {
            label: 'Revenue Impact',
            value: `₹${(report.revenueGenerated || 0).toLocaleString()}`,
            icon: <TrendingUp className="text-emerald-500" size={18} />,
            color: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            show: (report.revenueGenerated || 0) > 0
        },
        {
            label: 'Tasks Crushed',
            value: `${report.tasksCompleted || 0} Units`,
            icon: <CheckCircle2 className="text-blue-500" size={18} />,
            color: 'bg-blue-50',
            textColor: 'text-blue-700',
            show: (report.tasksCompleted || 0) > 0
        },
        {
            label: 'Support Tickets',
            value: `${report.ticketsResolved || 0} Resolved`,
            icon: <Rocket className="text-rose-500" size={18} />,
            color: 'bg-rose-50',
            textColor: 'text-rose-700',
            show: (report.ticketsResolved || 0) > 0
        },
        {
            label: 'Goal Progress',
            value: `${(report.selfRating || 5) * 10}%`,
            icon: <Target className="text-indigo-500" size={18} />,
            color: 'bg-indigo-50',
            textColor: 'text-indigo-700',
            show: true
        }
    ];

    return (
        <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-sm mb-6">
            <h3 className="text-xs font-black text-secondary-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                Daily Achievement Metrics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.filter(m => m.show).map((metric, idx) => (
                    <div key={idx} className={`${metric.color} p-4 rounded-2xl border border-white/50 transition-all hover:scale-[1.02]`}>
                        <div className="flex items-center gap-2 mb-2">
                            {metric.icon}
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-tight">{metric.label}</span>
                        </div>
                        <p className={`text-xl font-black ${metric.textColor} tracking-tight`}>
                            {metric.value}
                        </p>
                    </div>
                ))}
            </div>

            {report.keyOutcome && (
                <div className="mt-4 p-4 bg-secondary-900 rounded-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Rocket size={40} />
                    </div>
                    <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-1">Star Achievement</p>
                    <p className="text-sm font-bold leading-relaxed">{report.keyOutcome}</p>
                </div>
            )}
        </div>
    );
}
