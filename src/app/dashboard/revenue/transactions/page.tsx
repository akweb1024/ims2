'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    DollarSign, Plus, Filter, Search, CheckCircle2, XCircle,
    Clock, AlertTriangle, FileText, Download, Building2,
    CreditCard, Wallet, Banknote, ShieldCheck, ChevronRight,
    User, Mail, Phone, Calendar, Info, Check, Trash2, Smartphone, X, CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PAYMENT_METHODS = [
    { value: 'RAZORPAY', label: 'Razorpay', icon: CreditCard, color: 'blue' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (IMPS/NEFT)', icon: Building2, color: 'indigo' },
    { value: 'UPI', label: 'UPI / PhonePe / GPay', icon: Smartphone, color: 'purple' },
    { value: 'CASH', label: 'Cash Payment', icon: Banknote, color: 'green' },
    { value: 'CHEQUE', label: 'Cheque Payment', icon: FileText, color: 'orange' },
    { value: 'DD', label: 'Demand Draft (DD)', icon: FileText, color: 'yellow' },
    { value: 'OTHER', label: 'Other Method', icon: Wallet, color: 'gray' }
];

export default function RevenueTransactionsPage() {
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterMethod, setFilterMethod] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        referenceNumber: '',
        bankName: '',
        description: '',
        proofDocument: '',
        claimedByEmployeeId: '',
    });

    const [employees, setEmployees] = useState<any[]>([]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = `/api/revenue/transactions`;
            const params = new URLSearchParams();
            if (filterStatus !== 'ALL') params.append('status', filterStatus);
            if (filterMethod !== 'ALL') params.append('method', filterMethod);

            const res = await fetch(`${url}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Fetch transactions error:', error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterMethod]);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (error) {
            console.error('Fetch employees error:', error);
        }
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
        fetchTransactions();
        fetchEmployees();
    }, [fetchTransactions]);

    const handleCreateTransaction = async (e: any) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/transactions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Revenue transaction recorded successfully');
                setShowModal(false);
                fetchTransactions();
                setFormData({
                    amount: '',
                    paymentMethod: 'BANK_TRANSFER',
                    paymentDate: new Date().toISOString().split('T')[0],
                    customerName: '',
                    customerEmail: '',
                    customerPhone: '',
                    referenceNumber: '',
                    bankName: '',
                    description: '',
                    proofDocument: '',
                    claimedByEmployeeId: '',
                });
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to record transaction');
            }
        } catch (error) {
            console.error('Create transaction error:', error);
            toast.error('Failed to create transaction');
        }
    };

    const handleVerifyTransaction = async (id: string, vStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/revenue/transactions', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id,
                    verificationStatus: vStatus,
                    status: vStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING'
                })
            });

            if (res.ok) {
                toast.success(`Transaction ${vStatus.toLowerCase()}`);
                fetchTransactions();
            }
        } catch (error) {
            toast.error('Verification failed');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const filteredTransactions = transactions.filter((t: any) =>
        t.transactionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg">
                                <DollarSign className="w-8 h-8 text-white" />
                            </div>
                            Revenue Verification System
                        </h1>
                        <p className="text-secondary-500 mt-2">Manage and verify company income to prevent duplicate claims</p>
                    </div>
                    {(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(user?.role)) && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary flex items-center gap-2 px-6 shadow-indigo-200 shadow-xl"
                        >
                            <Plus size={20} />
                            Record New Income
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="card-premium p-4 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search RT#, Customer, Reference..."
                                className="input pl-10 w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="input w-40"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="VERIFIED">Verified</option>
                            <option value="DISPUTED">Disputed</option>
                        </select>
                        <select
                            className="input w-48"
                            value={filterMethod}
                            onChange={(e) => setFilterMethod(e.target.value)}
                        >
                            <option value="ALL">All Methods</option>
                            {PAYMENT_METHODS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={fetchTransactions} className="btn btn-secondary flex items-center gap-2">
                        <Filter size={16} />
                        Refresh
                    </button>
                </div>

                {/* Transactions Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Transaction Info</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Customer & Method</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">Attribution</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-secondary-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                        </td>
                                    </tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-secondary-500">No revenue transactions found</td>
                                    </tr>
                                ) : filteredTransactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-indigo-600">{t.transactionNumber}</span>
                                                <span className="text-xs text-secondary-500 flex items-center gap-1">
                                                    <Calendar size={12} /> {new Date(t.paymentDate).toLocaleDateString()}
                                                </span>
                                                {t.referenceNumber && (
                                                    <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded mt-1 font-mono">
                                                        Ref: {t.referenceNumber}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-secondary-900">{t.customerName || 'N/A'}</span>
                                                <div className="flex items-center gap-1 text-xs text-secondary-500">
                                                    {(() => {
                                                        const m = PAYMENT_METHODS.find(pm => pm.value === t.paymentMethod);
                                                        const Icon = m?.icon || Wallet;
                                                        return (
                                                            <>
                                                                <Icon size={12} className={`text-${m?.color}-500`} />
                                                                <span>{m?.label}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-secondary-900 flex items-center gap-1">
                                                    <User size={14} className="text-secondary-400" />
                                                    {t.claimedBy?.user.name || 'Unclaimed'}
                                                </span>
                                                <span className="text-xs text-secondary-500">{t.department?.name || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-lg font-black text-secondary-900">{formatCurrency(t.amount)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'VERIFIED' ? 'bg-success-100 text-success-700' :
                                                        t.status === 'DISPUTED' ? 'bg-danger-100 text-danger-700' :
                                                            'bg-warning-100 text-warning-700'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                                <span className="text-[10px] text-secondary-400 uppercase font-bold tracking-tighter">
                                                    {t.verificationStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                {t.verificationStatus !== 'VERIFIED' && (['ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(user?.role)) && (
                                                    <button
                                                        onClick={() => handleVerifyTransaction(t.id, 'VERIFIED')}
                                                        className="p-2 bg-success-50 text-success-600 rounded-lg hover:bg-success-100"
                                                        title="Verify Transaction"
                                                    >
                                                        <CheckCheck size={16} />
                                                    </button>
                                                )}
                                                <button className="p-2 bg-secondary-50 text-secondary-600 rounded-lg hover:bg-secondary-100">
                                                    <Info size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Transaction Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <form onSubmit={handleCreateTransaction}>
                                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-indigo-50">
                                    <h3 className="text-xl font-black text-indigo-900">Record New Revenue</h3>
                                    <button type="button" onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                                    {/* Amount & Method */}
                                    <div className="col-span-1">
                                        <label className="label">Amount (₹)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                required
                                                className="input font-black text-lg"
                                                placeholder="50000"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            />
                                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-300" size={20} />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className="label">Payment Method</label>
                                        <select
                                            className="input"
                                            value={formData.paymentMethod}
                                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            {PAYMENT_METHODS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date & Ref */}
                                    <div className="col-span-1">
                                        <label className="label">Payment Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="input"
                                            value={formData.paymentDate}
                                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="label">Reference # (Cheque/UTR/DD)</label>
                                        <input
                                            type="text"
                                            className="input font-mono"
                                            placeholder="UTR123456789"
                                            value={formData.referenceNumber}
                                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                        />
                                    </div>

                                    {/* Customer Info */}
                                    <div className="col-span-2 grid grid-cols-3 gap-3 p-4 bg-secondary-50 rounded-2xl border border-secondary-200">
                                        <div className="col-span-3 pb-2 border-b border-secondary-200">
                                            <span className="text-xs font-black text-secondary-500 uppercase">Customer Information</span>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label text-xs">Customer Name</label>
                                            <input
                                                type="text"
                                                className="input h-10"
                                                value={formData.customerName}
                                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1 text-center flex flex-col justify-center">
                                            <span className="text-[10px] text-secondary-400">Search customer profiles?</span>
                                            <button type="button" className="text-indigo-600 font-bold text-xs hover:underline">Click Here</button>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label text-xs">Email</label>
                                            <input
                                                type="email"
                                                className="input h-10"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label text-xs">Phone</label>
                                            <input
                                                type="text"
                                                className="input h-10"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label text-xs">Bank Name (if Cheque/DD)</label>
                                            <input
                                                type="text"
                                                className="input h-10"
                                                value={formData.bankName}
                                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="label">Claimed By Employee</label>
                                        <select
                                            className="input"
                                            value={formData.claimedByEmployeeId}
                                            onChange={(e) => setFormData({ ...formData, claimedByEmployeeId: e.target.value })}
                                        >
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.user.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="label">Notes / Description</label>
                                        <textarea
                                            className="input"
                                            rows={2}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-6">Cancel</button>
                                    <button type="submit" className="btn btn-primary px-8 shadow-indigo-200 shadow-lg">Save Transaction</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
