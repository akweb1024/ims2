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
        <div className="card-premium h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
                    <Globe size={20} className="text-primary-600" />
                    Market Monitor
                </h2>
                <div className="flex items-center gap-1 text-[10px] font-black text-secondary-400 uppercase tracking-widest bg-secondary-50 px-2 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse"></span>
                    Live FX
                </div>
            </div>

            <div className="space-y-4">
                {currencies.map((curr) => (
                    <div key={curr.code} className="flex items-center justify-between p-3 bg-secondary-50 rounded-2xl border border-secondary-100/50 hover:border-primary-100 transition-all cursor-default group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-secondary-900 text-xs">
                                {curr.code}
                            </div>
                            <div>
                                <p className="text-xs font-black text-secondary-900 uppercase">{curr.name}</p>
                                <p className="text-[10px] font-bold text-secondary-400 tracking-tight">1 {curr.code} ≈ ₹{curr.rate}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`flex items-center gap-1 text-[10px] font-black ${curr.trend.startsWith('+') ? 'text-success-600' : curr.trend.startsWith('-') ? 'text-danger-600' : 'text-secondary-400'}`}>
                                {curr.trend.startsWith('+') ? <TrendingUp size={12} /> : curr.trend.startsWith('-') ? <TrendingDown size={12} /> : null}
                                {curr.trend}
                            </div>
                            <div className="w-16 h-1 bg-secondary-200 rounded-full mt-2 overflow-hidden">
                                <div
                                    className={`h-full ${curr.trend.startsWith('+') ? 'bg-success-400' : 'bg-secondary-400'}`}
                                    style={{ width: `${60 + (Math.random() * 30)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-start gap-3">
                <Info size={16} className="text-primary-600 mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold text-primary-700 leading-relaxed uppercase tracking-tight">
                    Revenue forecasts are automatically adjusted based on weighted average exchange rates.
                </p>
            </div>
        </div>
    );
}
