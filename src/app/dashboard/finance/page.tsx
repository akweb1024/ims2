'use client';

import { useState, useCallback, useEffect } from 'react';
import FinanceClientLayout from './FinanceClientLayout';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Download,
    Plus,
    RefreshCcw,
    TrendingUp,
    TrendingDown,
    Activity,
    Wallet,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import TransactionTable from '@/components/dashboard/finance/TransactionTable';
import FinanceStatsCard from '@/components/dashboard/finance/FinanceStatsCard';
import CashFlowChart from '@/components/dashboard/finance/CashFlowChart';
import RevenueChart from '@/components/dashboard/finance/RevenueChart';
import TransactionModal from '@/components/dashboard/finance/TransactionModal';

const calculateMonthOverMonthChange = (current: number, previous: number) => {
    if (!previous && !current) return 0;
    if (!previous) return 100;
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
};

export default function FinancePage() {
    const { data: session } = useSession();
    const [analytics, setAnalytics] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'3m' | '6m' | '12m'>('12m');

    // Filters for transactions
    const [filters, setFilters] = useState({
        type: '',
        category: '',
        date: ''
    });

    // Dummy Modal State (To be integrated properly if reusing existing modal)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch(`/api/finance/analytics?period=${analyticsPeriod}`);
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setAnalytics(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load financial insights');
        }
    }, [analyticsPeriod]);

    const fetchTransactions = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.type) params.append('type', filters.type);
            if (filters.category) params.append('category', filters.category);

            const res = await fetch(`/api/finance?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch transactions');
            const data = await res.json();
            setTransactions(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load transactions');
        }
    }, [filters]);

    const refreshData = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchAnalytics(), fetchTransactions()]);
        setIsRefreshing(false);
        toast.success('Dashboard updated');
    };

    useEffect(() => {
        if (session) {
            setLoading(true);
            Promise.all([fetchAnalytics(), fetchTransactions()])
                .finally(() => setLoading(false));
        }
    }, [session, fetchAnalytics, fetchTransactions]);

    const cashFlowSeries = analytics?.charts?.cashFlow || [];
    const currentMonth = cashFlowSeries[cashFlowSeries.length - 1];
    const previousMonth = cashFlowSeries[cashFlowSeries.length - 2];
    const netCashFlowTrend = calculateMonthOverMonthChange(
        (currentMonth?.revenue || 0) - (currentMonth?.expense || 0),
        (previousMonth?.revenue || 0) - (previousMonth?.expense || 0)
    );

    return (
        <FinanceClientLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="p-1 sm:p-0">
                        <h1 className="text-2xl sm:text-3xl font-black text-secondary-900 dark:text-gray-100 tracking-tight">Finance Control Tower</h1>
                        <p className="text-sm sm:text-base text-secondary-500 font-medium mt-1">Real-time financial overview and management</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                        <button
                            onClick={refreshData}
                            className={`p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-secondary-200 dark:border-gray-700 text-secondary-600 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => window.location.href = '/api/finance/export'}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-secondary-200 dark:border-gray-700 text-secondary-700 dark:text-gray-300 font-bold rounded-xl hover:bg-secondary-50 dark:hover:bg-gray-700 transition-all shadow-sm group"
                        >
                            <Download className="w-5 h-5 text-secondary-400 group-hover:text-secondary-600" />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>New Transaction</span>
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FinanceStatsCard
                        title="Verified Revenue"
                        amount={analytics?.stats?.totalVerifiedRevenue || 0}
                        color="emerald"
                        icon={<CheckCircle2 className="w-6 h-6" />}
                        subtitle="Confirmed Income"
                        loading={loading}
                    />
                    <FinanceStatsCard
                        title="Pending Validation"
                        amount={analytics?.stats?.totalPendingRevenue || 0}
                        color="amber"
                        icon={<AlertCircle className="w-6 h-6" />}
                        subtitle="Pipeline / Needs Proof"
                        loading={loading}
                    />
                    <FinanceStatsCard
                        title="Total Expenses"
                        amount={analytics?.stats?.totalExpenses || 0}
                        color="rose"
                        icon={<TrendingDown className="w-6 h-6" />}
                        subtitle="All Categories"
                        loading={loading}
                    />
                    <FinanceStatsCard
                        title="Net Cash Flow"
                        amount={analytics?.stats?.netCashFlow || 0}
                        color={analytics?.stats?.netCashFlow >= 0 ? 'blue' : 'rose'}
                        icon={<Wallet className="w-6 h-6" />}
                        subtitle="Liquid Position"
                        loading={loading}
                        trend={netCashFlowTrend}
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 glass-card-premium border border-white/60 dark:border-gray-800 rounded-3xl p-6 shadow-xl shadow-secondary-200/50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-secondary-900">Cash Flow Trends</h3>
                                <p className="text-sm text-secondary-400 font-medium">
                                    Income vs Expenses over the selected {analytics?.period || analyticsPeriod} window
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: '3m', label: '3 Months' },
                                    { id: '6m', label: '6 Months' },
                                    { id: '12m', label: '12 Months' },
                                ].map((periodOption) => (
                                    <button
                                        key={periodOption.id}
                                        onClick={() => setAnalyticsPeriod(periodOption.id as typeof analyticsPeriod)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                                            analyticsPeriod === periodOption.id
                                                ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                                : 'bg-white text-secondary-500 border-secondary-200 hover:border-primary-200 hover:text-primary-600'
                                        }`}
                                    >
                                        {periodOption.label}
                                    </button>
                                ))}
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Revenue
                                </span>
                                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div> Expense
                                </span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <CashFlowChart data={analytics?.charts?.cashFlow || []} />
                        </div>
                    </div>

                    {/* Donut Chart */}
                    <div className="glass-card-premium border border-white/60 dark:border-gray-800 rounded-3xl p-6 shadow-xl shadow-secondary-200/50">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-secondary-900 dark:text-gray-100">Revenue Composition</h3>
                            <p className="text-sm text-secondary-400 font-medium">Source Breakdown</p>
                        </div>
                        <div className="h-[250px] sm:h-[300px] w-full">
                            <RevenueChart data={analytics?.charts?.revenueComposition || []} />
                        </div>
                    </div>
                </div>

                {/* Navigation Links (Quick Access) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Chart of Accounts', path: 'coa' },
                        { label: 'Journal Entries', path: 'journal' },
                        { label: 'General Ledger', path: 'ledger' },
                        { label: 'Reports', path: 'reports' }
                    ].map((item) => (
                        <Link href={`/dashboard/finance/${item.path}`} key={item.path}>
                            <div className="glass-card-premium border border-secondary-100 dark:border-gray-800 rounded-xl p-4 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer group">
                                <h4 className="font-bold text-secondary-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors text-sm sm:text-base">{item.label}</h4>
                                <p className="text-[10px] sm:text-xs text-secondary-400 mt-1">View Details →</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Transaction Table */}
                <div className="glass-card-premium border border-white/60 dark:border-gray-800 rounded-3xl p-1 shadow-xl shadow-secondary-200/50 overflow-hidden">
                    <div className="p-6 pb-2">
                        <h3 className="text-lg font-bold text-secondary-900">Recent Transactions</h3>
                        <p className="text-sm text-secondary-400 font-medium">Monitor your financial activity</p>
                    </div>
                    <div className="p-2">
                        <TransactionTable
                            transactions={transactions}
                            onEdit={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                            onDelete={async (id) => {
                                if (confirm('Are you sure?')) {
                                    await fetch(`/api/finance?id=${id}`, { method: 'DELETE' });
                                    fetchTransactions();
                                    fetchAnalytics();
                                }
                            }}
                            onSearch={(q) => { /* Client side search inside component for now */ }}
                            onFilter={(f, v) => setFilters(prev => ({ ...prev, [f]: v }))}
                            filters={filters}
                            loading={loading}
                            onRefresh={refreshData}
                        />
                    </div>
                </div>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchTransactions();
                    fetchAnalytics();
                    toast.success('Transaction saved successfully');
                }}
                editingTransaction={editingTransaction}
            />
        </FinanceClientLayout>
    );
}
