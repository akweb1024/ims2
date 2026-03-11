'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FinanceClientLayout from '../FinanceClientLayout';

export default function FinancialReportsPage() {
    const [reportType, setReportType] = useState<'pl' | 'bs'>('pl');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: reportType,
                start: dateRange.start,
                end: dateRange.end
            });
            const res = await fetch(`/api/finance/reports?${params}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [reportType, dateRange]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    const ReportSection = ({ title, total, accounts, colorClass }: any) => (
        <div className="mb-8">
            <h3 className={`text-sm sm:text-lg font-black border-b pb-2 mb-4 flex justify-between uppercase tracking-wider ${colorClass}`}>
                <span>{title}</span>
                <span>{formatCurrency(total)}</span>
            </h3>
            <div className="space-y-1">
                {accounts.map((acc: any, i: number) => (
                    <div key={i} className="flex justify-between text-[11px] sm:text-sm py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{acc.code} - {acc.name}</span>
                        <span className="font-bold text-gray-900 dark:text-gray-200">{formatCurrency(acc.balance)}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <FinanceClientLayout>
            <div className="space-y-6 print:space-y-4 page-animate">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Financial Reports</h1>
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-secondary-100 dark:border-gray-700 shadow-sm w-full md:w-auto">
                        <button
                            onClick={() => setReportType('pl')}
                            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${reportType === 'pl' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Profit & Loss
                        </button>
                        <button
                            onClick={() => setReportType('bs')}
                            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${reportType === 'bs' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Balance Sheet
                        </button>
                    </div>
                </div>

                <div className="glass-card-premium p-3 sm:p-4 rounded-2xl border border-secondary-100 dark:border-gray-700 shadow-sm flex flex-wrap gap-4 items-center print:hidden">
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">From</span>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="flex-1 sm:flex-initial p-2 border border-secondary-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                    <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">To</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="flex-1 sm:flex-initial p-2 border border-secondary-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/20" />
                    </div>
                    <button onClick={() => window.print()} className="ml-auto w-full sm:w-auto px-4 py-2 text-xs font-black uppercase tracking-widest border border-secondary-200 dark:border-gray-700 rounded-lg hover:bg-secondary-50 dark:hover:bg-gray-700 transition-colors">🖨️ Print Report</button>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400 animate-pulse font-black uppercase tracking-widest text-xs">Generating Report...</div>
                ) : data && (
                    <div className="glass-card-premium p-6 sm:p-10 rounded-2xl border border-secondary-100 dark:border-gray-800 shadow-xl print:shadow-none print:border-0 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${reportType === 'pl' ? 'from-emerald-500 to-primary-600' : 'from-blue-500 to-indigo-600'}`}></div>
                        
                        <div className="text-center mb-10 border-b border-gray-100 dark:border-gray-800 pb-8">
                            <h2 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-[0.2em]">
                                {reportType === 'pl' ? 'Statement of Profit & Loss' : 'Balance Sheet'}
                            </h2>
                            <p className="text-xs sm:text-sm text-secondary-500 dark:text-gray-400 mt-3 font-bold uppercase tracking-widest">
                                {reportType === 'pl'
                                    ? `Period: ${new Date(dateRange.start).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })} — ${new Date(dateRange.end).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}`
                                    : `Effective Date: ${new Date(dateRange.end).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}`
                                }
                            </p>
                        </div>

                        {reportType === 'pl' ? (
                            <div className="max-w-3xl mx-auto">
                                <ReportSection title="Revenue" total={data.revenue.total} accounts={data.revenue.accounts} colorClass="text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" />
                                <ReportSection title="Expenses" total={data.expense.total} accounts={data.expense.accounts} colorClass="text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" />
                                <div className="mt-8 pt-8 border-t-2 border-gray-900 dark:border-gray-700 flex justify-between items-center text-lg sm:text-2xl font-black">
                                    <span className="text-gray-900 dark:text-gray-100 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">Net Profit</span>
                                    <span className={data.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                        {formatCurrency(data.netProfit)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                <ReportSection title="Assets" total={data.assets.total} accounts={data.assets.accounts} colorClass="text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30" />
                                <ReportSection title="Liabilities" total={data.liabilities.total} accounts={data.liabilities.accounts} colorClass="text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/30" />
                                <ReportSection title="Equity" total={data.equity.total} accounts={data.equity.accounts} colorClass="text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-900/30" />
                                <div className={`text-center text-[10px] mt-8 font-mono ${Math.abs(data.check) < 0.01 ? 'text-emerald-500/50' : 'text-rose-500 font-bold'}`}>
                                    Verification Hash: {Math.abs(data.check).toFixed(4)} | Assets - L&E = 0
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </FinanceClientLayout>
    );
}
