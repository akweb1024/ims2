'use client';
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Download, RefreshCw, TrendingUp, DollarSign, Mail,
    PlusCircle, Calendar, Settings, Users, X, Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function LMSFinancialsPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDailyRevenueModal, setShowDailyRevenueModal] = useState(false);
    const [showExpenseConfigModal, setShowExpenseConfigModal] = useState(false);
    const [showMentorPaymentModal, setShowMentorPaymentModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [mentorPayments, setMentorPayments] = useState<any[]>([]);

    // Daily Revenue Form
    const [revenueForm, setRevenueForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        enrollments: '',
        notes: ''
    });

    // Expense Config Form
    const [expenseForm, setExpenseForm] = useState({
        minExpense: '30000',
        expensePercentage: '30'
    });

    useEffect(() => {
        fetchFinancials();
        fetchMentorPayments();
    }, []);

    const fetchFinancials = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/lms/financials');
            if (res.ok) {
                const apiData = await res.json();
                setData(apiData);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load financials');
        } finally {
            setLoading(false);
        }
    };

    const fetchMentorPayments = async () => {
        try {
            const res = await fetch('/api/lms/mentor-payments?status=PENDING');
            if (res.ok) {
                const payments = await res.json();
                setMentorPayments(payments);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddDailyRevenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        try {
            const res = await fetch('/api/lms/daily-revenue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...revenueForm,
                    type: selectedProduct.type.toUpperCase(),
                    referenceId: selectedProduct.id
                })
            });

            if (res.ok) {
                toast.success('Daily revenue added successfully');
                setShowDailyRevenueModal(false);
                setRevenueForm({ date: new Date().toISOString().split('T')[0], amount: '', enrollments: '', notes: '' });
                fetchFinancials();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to add revenue');
            }
        } catch (error) {
            toast.error('Failed to add revenue');
        }
    };

    const handleUpdateExpenseConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        try {
            const res = await fetch('/api/lms/expense-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedProduct.type.toUpperCase(),
                    referenceId: selectedProduct.id,
                    minExpense: parseFloat(expenseForm.minExpense),
                    expensePercentage: parseFloat(expenseForm.expensePercentage) / 100
                })
            });

            if (res.ok) {
                toast.success('Expense configuration updated');
                setShowExpenseConfigModal(false);
                fetchFinancials();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to update config');
            }
        } catch (error) {
            toast.error('Failed to update config');
        }
    };

    const handleMarkPaymentPaid = async (paymentId: string) => {
        try {
            const res = await fetch('/api/lms/mentor-payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: paymentId, status: 'PAID' })
            });

            if (res.ok) {
                toast.success('Payment marked as paid');
                fetchMentorPayments();
            } else {
                toast.error('Failed to update payment');
            }
        } catch (error) {
            toast.error('Failed to update payment');
        }
    };

    const totalRevenue = data.reduce((acc, item) => acc + item.totalRevenue, 0);
    const totalFinalRevenue = data.reduce((acc, item) => acc + item.finalRevenue, 0);
    const totalExpenses = data.reduce((acc, item) => acc + item.platformExpense + item.emailCharge + item.mentorCut, 0);
    const pendingPayments = mentorPayments.reduce((acc, p) => acc + p.amount, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">LMS Financial Dashboard</h1>
                        <p className="text-secondary-500">Revenue, expenses, and mentor payments with daily tracking</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchFinancials} className="btn btn-secondary flex gap-2">
                            <RefreshCw size={18} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-dashboard p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Gross Revenue</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{totalRevenue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="card-dashboard p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl text-green-600">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Net Earnings</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{totalFinalRevenue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="card-dashboard p-6 bg-gradient-to-br from-red-50 to-orange-50 border-l-4 border-red-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-xl text-red-600">
                                <TrendingUp size={24} className="rotate-180" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Total Expenses</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{totalExpenses.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="card-dashboard p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-l-4 border-amber-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Pending Payments</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{pendingPayments.toLocaleString()}
                                </h3>
                                <p className="text-xs text-secondary-400">{mentorPayments.length} payments</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="card-dashboard overflow-hidden">
                    <div className="p-4 bg-secondary-50 border-b border-secondary-200">
                        <h2 className="text-lg font-black text-secondary-900">Products Financial Overview</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-black text-secondary-500 uppercase tracking-widest">
                                    <th className="p-4">Product Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Mentor</th>
                                    <th className="p-4 text-right">Revenue</th>
                                    <th className="p-4 text-right">Emails</th>
                                    <th className="p-4 text-right">Expenses</th>
                                    <th className="p-4 text-right">Net</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center">Loading data...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-secondary-500">No data found</td></tr>
                                ) : (
                                    data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-secondary-50/50 transition-colors">
                                            <td className="p-4 font-bold text-secondary-900">{item.productName}</td>
                                            <td className="p-4">
                                                <span className={`badge ${item.type === 'Course' ? 'bg-blue-50 text-blue-600' :
                                                        item.type === 'Workshop' ? 'bg-purple-50 text-purple-600' :
                                                            'bg-orange-50 text-orange-600'
                                                    } text-xs uppercase px-3 py-1 rounded-full font-bold`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <div className="font-semibold text-secondary-900">{item.mentorName}</div>
                                                    <div className="text-xs text-secondary-400">{item.mentorEmail}</div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-secondary-700 font-bold">₹{item.totalRevenue.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono text-secondary-700">{item.totalSentMail.toLocaleString()}</td>
                                            <td className="p-4 text-right">
                                                <div className="text-xs space-y-1">
                                                    <div className="text-danger-600 font-mono">-₹{item.platformExpense.toLocaleString()}</div>
                                                    <div className="text-secondary-400 text-[10px]">
                                                        Min: ₹{item.minExpense?.toLocaleString() || '30K'} | {item.expensePercentage || 30}%
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-success-600">₹{item.finalRevenue.toLocaleString()}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedProduct(item);
                                                            setShowDailyRevenueModal(true);
                                                        }}
                                                        className="btn btn-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border-none"
                                                        title="Add Daily Revenue"
                                                    >
                                                        <PlusCircle size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedProduct(item);
                                                            setExpenseForm({
                                                                minExpense: item.minExpense?.toString() || '30000',
                                                                expensePercentage: item.expensePercentage?.toString() || '30'
                                                            });
                                                            setShowExpenseConfigModal(true);
                                                        }}
                                                        className="btn btn-sm bg-amber-50 text-amber-600 hover:bg-amber-100 border-none"
                                                        title="Configure Expenses"
                                                    >
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending Mentor Payments */}
                {mentorPayments.length > 0 && (
                    <div className="card-dashboard overflow-hidden">
                        <div className="p-4 bg-amber-50 border-b border-amber-200">
                            <h2 className="text-lg font-black text-amber-900 flex items-center gap-2">
                                <Users size={20} />
                                Pending Mentor Payments
                            </h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {mentorPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                                    <div className="flex-1">
                                        <div className="font-bold text-secondary-900">{payment.mentor.name}</div>
                                        <div className="text-sm text-secondary-500">
                                            {payment.type} • Period: {payment.period}
                                        </div>
                                    </div>
                                    <div className="text-right mr-4">
                                        <div className="font-mono font-bold text-lg text-secondary-900">₹{payment.amount.toLocaleString()}</div>
                                        <div className="text-xs text-secondary-400">{new Date(payment.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <button
                                        onClick={() => handleMarkPaymentPaid(payment.id)}
                                        className="btn btn-sm bg-success-600 text-white hover:bg-success-700 border-none flex items-center gap-2"
                                    >
                                        <Check size={14} /> Mark Paid
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Revenue Modal */}
            {showDailyRevenueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-blue-50">
                            <h3 className="text-xl font-black text-blue-900">Add Daily Revenue</h3>
                            <button onClick={() => setShowDailyRevenueModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddDailyRevenue} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Product</label>
                                <input
                                    type="text"
                                    value={selectedProduct?.productName || ''}
                                    disabled
                                    className="input-field bg-secondary-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Date *</label>
                                <input
                                    type="date"
                                    value={revenueForm.date}
                                    onChange={(e) => setRevenueForm({ ...revenueForm, date: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Amount (₹) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={revenueForm.amount}
                                    onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                                    className="input-field"
                                    placeholder="10000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Enrollments</label>
                                <input
                                    type="number"
                                    value={revenueForm.enrollments}
                                    onChange={(e) => setRevenueForm({ ...revenueForm, enrollments: e.target.value })}
                                    className="input-field"
                                    placeholder="5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Notes</label>
                                <textarea
                                    value={revenueForm.notes}
                                    onChange={(e) => setRevenueForm({ ...revenueForm, notes: e.target.value })}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Optional notes..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowDailyRevenueModal(false)} className="btn btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    Add Revenue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Expense Config Modal */}
            {showExpenseConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-amber-50">
                            <h3 className="text-xl font-black text-amber-900">Configure Expenses</h3>
                            <button onClick={() => setShowExpenseConfigModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateExpenseConfig} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Product</label>
                                <input
                                    type="text"
                                    value={selectedProduct?.productName || ''}
                                    disabled
                                    className="input-field bg-secondary-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Minimum Expense (₹) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={expenseForm.minExpense}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, minExpense: e.target.value })}
                                    className="input-field"
                                    required
                                />
                                <p className="text-xs text-secondary-500 mt-1">Default: ₹30,000</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-secondary-700 mb-2">Expense Percentage (%) *</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={expenseForm.expensePercentage}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, expensePercentage: e.target.value })}
                                    className="input-field"
                                    required
                                />
                                <p className="text-xs text-secondary-500 mt-1">Default: 30%</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl">
                                <p className="text-sm text-blue-900 font-semibold">
                                    Platform expense will be: <span className="font-black">Max(Min Expense, Revenue × Percentage)</span>
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowExpenseConfigModal(false)} className="btn btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    Update Config
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
