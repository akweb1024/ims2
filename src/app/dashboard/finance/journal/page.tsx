'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import FinanceClientLayout from '../FinanceClientLayout';
import { TableSkeleton } from '@/components/ui/skeletons';

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

    if (loading) {
        return (
            <FinanceClientLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="h-10 w-48 bg-secondary-100 animate-pulse rounded-lg"></div>
                        <div className="h-10 w-32 bg-secondary-100 animate-pulse rounded-lg"></div>
                    </div>
                    <TableSkeleton />
                </div>
            </FinanceClientLayout>
        );
    }

    return (
        <FinanceClientLayout>
            <div className="space-y-6 page-animate">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Journal Entries</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">View and manage manual journal entries.</p>
                    </div>
                    <Link href="/dashboard/finance/journal/new" className="w-full sm:w-auto text-center px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95">
                        + New Entry
                    </Link>
                </div>

                <div className="glass-card-premium rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800 text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 sm:px-6 py-4">Date</th>
                                    <th className="px-4 sm:px-6 py-4">Entry #</th>
                                    <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Description</th>
                                    <th className="px-4 sm:px-6 py-4 text-right">Debit</th>
                                    <th className="px-4 sm:px-6 py-4 text-right">Credit</th>
                                    <th className="px-4 sm:px-6 py-4 hidden lg:table-cell">Status</th>
                                </tr>
                            </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((entry) => {
                                const totalDebit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.debit), 0);
                                const totalCredit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.credit), 0);

                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(entry.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm font-black text-primary-600">{entry.entryNumber}</td>
                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 dark:text-gray-200 hidden sm:table-cell max-w-[200px] truncate">{entry.description}</td>
                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right font-black text-gray-900 dark:text-gray-100 italic">₹{totalDebit.toLocaleString()}</td>
                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-right font-black text-gray-900 dark:text-gray-100 italic">₹{totalCredit.toLocaleString()}</td>
                                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                                            <span className="px-2 py-1 text-[10px] font-black uppercase bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30 rounded-full">
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
        </div>
        </FinanceClientLayout>
    );
}
