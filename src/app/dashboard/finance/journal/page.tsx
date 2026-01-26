'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function JournalEntriesPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const res = await fetch('/api/finance/journal');
            if (res.ok) {
                setEntries(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
                        <p className="text-gray-500">View and manage manual journal entries.</p>
                    </div>
                    <Link href="/dashboard/finance/journal/new" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                        + New Journal Entry
                    </Link>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Entry #</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((entry) => {
                                const totalDebit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0);
                                const totalCredit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.credit), 0);

                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-sm font-mono text-primary-600">{entry.entryNumber}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{entry.description}</td>
                                        <td className="px-6 py-4 text-sm text-right font-medium">₹{totalDebit.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-right font-medium">₹{totalCredit.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">No journal entries found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
