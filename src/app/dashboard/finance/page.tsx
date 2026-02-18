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

export default function FinancePage() {
    const { data: session } = useSession();
    const [analytics, setAnalytics] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
            const res = await fetch('/api/finance/analytics');
            if (!res.ok) throw new Error('Failed to fetch analytics');
            const data = await res.json();
            setAnalytics(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load financial insights');
        }
    }, []);

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

    return (
        <FinanceClientLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Finance Control Tower</h1>
                        <p className="text-secondary-500 font-medium mt-1">Real-time financial overview and management</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={refreshData}
                            className={`p-2.5 rounded-xl bg-white border border-secondary-200 text-secondary-600 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCcw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => window.location.href = '/api/finance/export'}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-secondary-200 text-secondary-700 font-bold rounded-xl hover:bg-secondary-50 transition-all shadow-sm group"
                        >
                            <Download className="w-5 h-5 text-secondary-400 group-hover:text-secondary-600" />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95"
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
                        trend={analytics?.stats?.burnRate ? Math.round((analytics?.stats?.netCashFlow / analytics.stats.burnRate) * 10) / 10 : 0} // Fake trend calculation for demo
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl shadow-secondary-200/50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-secondary-900">Cash Flow Trends</h3>
                                <p className="text-sm text-secondary-400 font-medium">Income vs Expenses over time</p>
                            </div>
                            <div className="flex gap-2">
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
                    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 shadow-xl shadow-secondary-200/50">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-secondary-900">Revenue Composition</h3>
                            <p className="text-sm text-secondary-400 font-medium">Source Breakdown</p>
                        </div>
                        <div className="h-[300px] w-full">
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
                            <div className="bg-white border border-secondary-100 rounded-xl p-4 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer group">
                                <h4 className="font-bold text-secondary-700 group-hover:text-primary-600 transition-colors">{item.label}</h4>
                                <p className="text-xs text-secondary-400 mt-1">View Details →</p>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Transaction Table */}
                <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-1 shadow-xl shadow-secondary-200/50 overflow-hidden">
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
