'use client';

import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface Kpi {
    current: number;
    previous: number;
    deltaPercent: number;
    direction: 'up' | 'down' | 'neutral';
    comparisonLabel: string;
}

interface Stats {
    kpis: { revenue: Kpi; workforce: Kpi; itProjects: Kpi; publication: Kpi };
}

const TILES: Array<{ key: keyof Stats['kpis']; label: string; format: (n: number) => string }> = [
    { key: 'revenue', label: 'Revenue (6 mo)', format: (n) => `₹${Math.round(n).toLocaleString()}` },
    { key: 'workforce', label: 'Headcount', format: (n) => n.toLocaleString() },
    { key: 'itProjects', label: 'Open IT Projects', format: (n) => n.toLocaleString() },
    { key: 'publication', label: 'Articles (6 mo)', format: (n) => n.toLocaleString() },
];

// Group-wide KPI strip. The stats endpoint is SUPER_ADMIN-only, so for other
// viewers the strip simply doesn't render.
export default function GroupStatStrip() {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/super-admin/dashboard-stats?period=6');
                if (res.ok) setStats(await res.json());
            } catch {
                // Strip stays hidden.
            }
        })();
    }, []);

    if (!stats?.kpis) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TILES.map(({ key, label, format }) => {
                const kpi = stats.kpis[key];
                if (!kpi) return null;
                const DirectionIcon = kpi.direction === 'up' ? TrendingUp : kpi.direction === 'down' ? TrendingDown : Minus;
                const directionColor = kpi.direction === 'up' ? 'text-success-600' : kpi.direction === 'down' ? 'text-danger-600' : 'text-secondary-400';
                return (
                    <div key={key} className="card-premium p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">{label}</p>
                        <p className="text-xl font-black text-secondary-900 mt-1">{format(kpi.current)}</p>
                        <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${directionColor}`}>
                            <DirectionIcon size={12} /> {kpi.deltaPercent > 0 ? '+' : ''}{kpi.deltaPercent}% vs previous period
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
