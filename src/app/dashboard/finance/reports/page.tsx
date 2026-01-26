'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function FinancialReportsPage() {
    const [reportType, setReportType] = useState<'pl' | 'bs'>('pl');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchReport();
    }, [reportType, dateRange]);

    const fetchReport = async () => {
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
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
    };

    const ReportSection = ({ title, total, accounts, colorClass }: any) => (
        <div className="mb-8">
            <h3 className={`text-lg font-bold border-b pb-2 mb-4 flex justify-between ${colorClass}`}>
                <span>{title}</span>
                <span>{formatCurrency(total)}</span>
            </h3>
            <div className="space-y-2">
                {accounts.map((acc: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <span className="text-gray-600">{acc.code} - {acc.name}</span>
                        <span className="font-medium">{formatCurrency(acc.balance)}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 print:space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                    <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                        <button
                            onClick={() => setReportType('pl')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportType === 'pl' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Profit & Loss
                        </button>
                        <button
                            onClick={() => setReportType('bs')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${reportType === 'bs' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            Balance Sheet
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-center print:hidden">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500">From</span>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="p-2 border rounded-lg text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500">To</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="p-2 border rounded-lg text-sm" />
                    </div>
                    <button onClick={() => window.print()} className="ml-auto px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">🖨️ Print</button>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-400">Loading Report...</div>
                ) : data && (
                    <div className="bg-white p-8 rounded-xl border shadow-lg print:shadow-none print:border-0">
                        <div className="text-center mb-8 border-b pb-6">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest">
                                {reportType === 'pl' ? 'Income Statement (P&L)' : 'Balance Sheet'}
                            </h2>
                            <p className="text-gray-500 mt-2">
                                {reportType === 'pl'
                                    ? `For the period ${new Date(dateRange.start).toLocaleDateString()} to ${new Date(dateRange.end).toLocaleDateString()}`
                                    : `As of ${new Date(dateRange.end).toLocaleDateString()}`
                                }
                            </p>
                        </div>

                        {reportType === 'pl' ? (
                            <div className="max-w-3xl mx-auto">
                                <ReportSection title="Revenue" total={data.revenue.total} accounts={data.revenue.accounts} colorClass="text-green-700 border-green-200" />
                                <ReportSection title="Expenses" total={data.expense.total} accounts={data.expense.accounts} colorClass="text-red-700 border-red-200" />
                                <div className="mt-8 pt-6 border-t-2 border-gray-900 flex justify-between items-center text-xl font-black">
                                    <span>Net Profit</span>
                                    <span className={data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatCurrency(data.netProfit)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                <ReportSection title="Assets" total={data.assets.total} accounts={data.assets.accounts} colorClass="text-blue-700 border-blue-200" />
                                <ReportSection title="Liabilities" total={data.liabilities.total} accounts={data.liabilities.accounts} colorClass="text-orange-700 border-orange-200" />
                                <ReportSection title="Equity" total={data.equity.total} accounts={data.equity.accounts} colorClass="text-purple-700 border-purple-200" />
                                <div className={`text-center text-xs mt-8 ${Math.abs(data.check) < 0.01 ? 'text-green-500' : 'text-red-500 font-bold'}`}>
                                    Balance Check (Assets - L&E): {formatCurrency(data.check)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
