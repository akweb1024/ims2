'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function GeneralLedgerPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [ledger, setLedger] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/finance/accounts')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) setAccounts(data);
                else setAccounts([]);
            })
            .catch(err => {
                console.error(err);
                setAccounts([]);
            });
    }, []);

    const fetchLedger = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ accountId: selectedAccount });
            if (dateRange.start) params.append('startDate', dateRange.start);
            if (dateRange.end) params.append('endDate', dateRange.end);

            const res = await fetch(`/api/finance/ledger?${params}`);
            if (res.ok) setLedger(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedAccount, dateRange]);

    useEffect(() => {
        if (selectedAccount) {
            fetchLedger();
        } else {
            setLedger([]);
        }
    }, [fetchLedger, selectedAccount]);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">General Ledger</h1>
                    <p className="text-gray-500">View detailed transactions and running balances for any account.</p>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Account</label>
                        <select
                            className="w-full mt-1 p-2 border rounded-lg"
                            value={selectedAccount}
                            onChange={e => setSelectedAccount(e.target.value)}
                        >
                            <option value="">Select Account</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Start Date</label>
                        <input type="date" className="w-full mt-1 p-2 border rounded-lg" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase">End Date</label>
                        <input type="date" className="w-full mt-1 p-2 border rounded-lg" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                    </div>
                </div>

                {/* Ledger Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Ref #</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledger.map((line) => (
                                <tr key={line.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-600">
                                        {new Date(line.journalEntry.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-mono text-primary-600">
                                        {line.journalEntry.entryNumber}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        {line.description || line.journalEntry.description}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-right text-gray-600">
                                        {line.debit > 0 ? `₹${line.debit.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-right text-gray-600">
                                        {line.credit > 0 ? `₹${line.credit.toLocaleString()}` : '-'}
                                    </td>
                                </tr>
                            ))}
                            {ledger.length === 0 && !loading && (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Select an account to view transactions.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
