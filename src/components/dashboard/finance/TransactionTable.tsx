'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import VerificationBadge from './VerificationBadge';

interface TransactionTableProps {
    transactions: any[];
    onEdit: (transaction: any) => void;
    onDelete: (id: string) => void;
    onSearch: (query: string) => void;
    onFilter: (field: string, value: string) => void;
    filters: {
        type: string;
        category: string;
        date: string;
    };
    loading: boolean;
}

export default function TransactionTable({
    transactions,
    onEdit,
    onDelete,
    onSearch,
    onFilter,
    filters,
    loading
}: TransactionTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, onSearch]);

    // Sorting Logic locally (API returns date desc by default)
    const sortedTransactions = [...transactions].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        } else if (sortField === 'amount') {
            valA = Number(valA);
            valB = Number(valB);
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-4 border-b border-secondary-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-secondary-50/50">
                <div className="relative w-full md:w-96">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by customer, description, reference..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <select
                        className="px-3 py-2 rounded-xl border border-secondary-200 bg-white text-sm outline-none cursor-pointer hover:border-primary-400 transition-all font-medium text-secondary-600"
                        value={filters.type}
                        onChange={(e) => onFilter('type', e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="REVENUE">Revenue</option>
                        <option value="EXPENSE">Expense</option>
                    </select>

                    <select
                        className="px-3 py-2 rounded-xl border border-secondary-200 bg-white text-sm outline-none cursor-pointer hover:border-primary-400 transition-all font-medium text-secondary-600 max-w-[150px]"
                        value={filters.category}
                        onChange={(e) => onFilter('category', e.target.value)}
                    >
                        <option value="">All Categories</option>
                        <option value="SALE">Product Sale</option>
                        <option value="SUBSCRIPTION">Subscription</option>
                        <option value="SERVICE">Service</option>
                        <option value="RENT">Rent</option>
                        <option value="SALARIES">Salaries</option>
                        <option value="SOFTWARE">Software</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="TRAVEL">Travel</option>
                        <option value="UTILITIES">Utilities</option>
                        <option value="OFFICE_SUPPLIES">Verify Supplies</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-secondary-400">
                        <span className="text-4xl mb-2">📭</span>
                        <p className="text-sm font-medium">No transactions found</p>
                        <p className="text-xs">Try adjusting your filters or search</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">


                        <thead className="bg-secondary-50 text-secondary-500 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th onClick={() => handleSort('date')} className="px-6 py-4 cursor-pointer hover:bg-secondary-100 transition-colors group select-none">
                                    Date <span className="text-gray-400 ml-1">{sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Description / Reference</th>
                                <th className="px-6 py-4">Party</th>
                                <th onClick={() => handleSort('amount')} className="px-6 py-4 text-right cursor-pointer hover:bg-secondary-100 transition-colors group select-none">
                                    Amount <span className="text-gray-400 ml-1">{sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                                </th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {sortedTransactions.map((rec) => (
                                <tr key={rec.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-semibold text-secondary-700 whitespace-nowrap">
                                        {format(new Date(rec.date), 'dd MMM yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rec.type === 'REVENUE'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                            {rec.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <VerificationBadge status={rec.verificationStatus || rec.status || 'COMPLETED'} />
                                    </td>
                                    <td className="px-6 py-4 text-xs text-secondary-600 uppercase font-bold tracking-tight">
                                        {rec.category}
                                    </td>
                                    <td className="px-6 py-4 max-w-[200px]">
                                        <p className="text-xs font-medium text-secondary-900 truncate" title={rec.description}>{rec.description || '-'}</p>
                                        <p className="text-[10px] text-secondary-400 font-mono mt-0.5 truncate" title={rec.referenceId || rec.referenceNumber}>
                                            Ref: {rec.referenceId || rec.referenceNumber || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 max-w-[150px]">
                                        <p className="text-xs font-bold text-secondary-700 truncate" title={rec.customerName}>
                                            {rec.customerName || '-'}
                                        </p>
                                        <p className="text-[10px] text-secondary-400 truncate" title={rec.customerEmail}>
                                            {rec.bankName ? `via ${rec.bankName}` : rec.customerEmail}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className={`text-sm font-black ${rec.type === 'REVENUE' ? 'text-emerald-600' : 'text-secondary-900'}`}>
                                            {rec.currency !== 'INR' && <span className="text-[10px] text-gray-400 mr-1">{rec.currency}</span>}
                                            ₹{rec.amount.toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => onEdit(rec)}
                                                className="p-2 hover:bg-white rounded-lg text-secondary-400 hover:text-primary-600 hover:shadow-sm border border-transparent hover:border-secondary-100 transition-all tooltip"
                                                title="Edit Transaction"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => onDelete(rec.id)}
                                                className="p-2 hover:bg-white rounded-lg text-secondary-400 hover:text-danger-600 hover:shadow-sm border border-transparent hover:border-rose-100 transition-all tooltip"
                                                title="Delete Transaction"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Simple Pagination Footer (Placeholder for now since API sends all) */}
            <div className="px-6 py-3 border-t border-secondary-100 bg-secondary-50 text-xs text-secondary-500 flex justify-between items-center">
                <span>Showing <strong>{sortedTransactions.length}</strong> transactions</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-secondary-400">Real-time Data</span>
            </div>
        </div>
    );
}
