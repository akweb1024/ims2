'use client';

import { TrendingUp, TrendingDown, Globe, Info } from 'lucide-react';
import { EXCHANGE_RATES } from '@/lib/exchange-rates';

export default function MarketMonitor() {
    const currencies = [
        { code: 'USD', name: 'US Dollar', rate: EXCHANGE_RATES['USD'], trend: '+0.2%' },
        { code: 'EUR', name: 'Euro', rate: EXCHANGE_RATES['EUR'], trend: '-0.1%' },
        { code: 'GBP', name: 'British Pound', rate: EXCHANGE_RATES['GBP'], trend: '+0.5%' },
        { code: 'AED', name: 'UAE Dirham', rate: EXCHANGE_RATES['AED'], trend: '0.0%' },
    ];

    return (
        <div className="glass-card h-full p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <Globe size={20} className="text-primary" />
                    Market Monitor
                </h2>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500 animate-pulse"></span>
                    Live FX
                </div>
            </div>

            <div className="space-y-4">
                {currencies.map((curr) => (
                    <div key={curr.code} className="group flex cursor-default items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-3 transition-all hover:border-primary/30">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-xs font-black text-foreground shadow-sm">
                                {curr.code}
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase text-foreground">{curr.name}</p>
                                <p className="text-[10px] font-bold tracking-tight text-muted-foreground">1 {curr.code} ≈ ₹{curr.rate}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`flex items-center gap-1 text-[10px] font-black ${curr.trend.startsWith('+') ? 'text-success-600' : curr.trend.startsWith('-') ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {curr.trend.startsWith('+') ? <TrendingUp size={12} /> : curr.trend.startsWith('-') ? <TrendingDown size={12} /> : null}
                                {curr.trend}
                            </div>
                            <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-border/80">
                                <div
                                    className={`h-full ${curr.trend.startsWith('+') ? 'bg-success-400' : 'bg-muted-foreground/60'}`}
                                    style={{ width: `${60 + (Math.random() * 30)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
                <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-tight text-primary">
                    Revenue forecasts are automatically adjusted based on weighted average exchange rates.
                </p>
            </div>
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
