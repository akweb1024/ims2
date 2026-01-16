'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowRightLeft, CheckCircle2, XCircle, AlertCircle,
    FileText, RefreshCw, Wand2, DollarSign
} from 'lucide-react';

interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    status: 'MATCHED' | 'UNMATCHED' | 'PENDING';
    matchConfidence?: number;
    suggestedMatch?: {
        id: string;
        source: string; // 'INVOICE' | 'EXPENSE'
        reference: string;
        date: string;
    };
}

export default function ReconciliationPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ unmatched: 0, pending: 0, matched: 0 });

    useEffect(() => {
        // Mock Data simulation
        setTimeout(() => {
            const mockData: Transaction[] = [
                {
                    id: 'TXN-001',
                    date: '2025-05-10',
                    description: 'AWS SERVICES',
                    amount: 1250.00,
                    type: 'DEBIT',
                    status: 'PENDING',
                    matchConfidence: 98,
                    suggestedMatch: { id: 'EXP-992', source: 'EXPENSE', reference: 'Cloud Hosting - May', date: '2025-05-09' }
                },
                {
                    id: 'TXN-002',
                    date: '2025-05-12',
                    description: 'PAYMENT RECEIVED - CLIENT X',
                    amount: 45000.00,
                    type: 'CREDIT',
                    status: 'PENDING',
                    matchConfidence: 95,
                    suggestedMatch: { id: 'INV-2024-005', source: 'INVOICE', reference: 'Consulting Services', date: '2025-05-01' }
                },
                {
                    id: 'TXN-003',
                    date: '2025-05-14',
                    description: 'UBER TRIP',
                    amount: 45.50,
                    type: 'DEBIT',
                    status: 'UNMATCHED',
                    matchConfidence: 20
                },
                {
                    id: 'TXN-004',
                    date: '2025-05-15',
                    description: 'GIGGLE WORK',
                    amount: 12000.00,
                    type: 'CREDIT',
                    status: 'MATCHED'
                }
            ];
            setTransactions(mockData);
            setStats({
                unmatched: 1,
                pending: 2,
                matched: 1
            });
            setLoading(false);
        }, 1200);
    }, []);

    const handleAcceptMatch = (id: string) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, status: 'MATCHED' } : t
        ));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, matched: prev.matched + 1 }));
    };

    const handleIgnore = (id: string) => {
        setTransactions(prev => prev.map(t =>
            t.id === id ? { ...t, status: 'UNMATCHED', matchConfidence: 0, suggestedMatch: undefined } : t
        ));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, unmatched: prev.unmatched + 1 }));
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <ArrowRightLeft size={28} />
                            </span>
                            Smart Reconciliation
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">AI-powered bank feed matching and categorization.</p>
                    </div>
                    <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black shadow-lg transition-transform hover:-translate-y-1">
                        <RefreshCw size={16} /> Sync Bank Feed
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-6">
                    <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Wand2 size={64} className="text-orange-600" />
                        </div>
                        <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-2">Pending AI Matches</p>
                        <p className="text-4xl font-black text-gray-900">{stats.pending}</p>
                        <p className="text-sm text-gray-500 mt-2">Requires your review</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
                        <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Unmatched</p>
                        <p className="text-4xl font-black text-gray-900">{stats.unmatched}</p>
                        <p className="text-sm text-gray-500 mt-2">No system record found</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                        <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">Reconciled</p>
                        <p className="text-4xl font-black text-gray-900">{stats.matched}</p>
                        <p className="text-sm text-gray-500 mt-2">Successfully processed</p>
                    </div>
                </div>

                {/* Main Transaction List */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center gap-2">
                        <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                        <h3 className="font-bold text-gray-900 text-lg">Bank Statement Feed</h3>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Analysis in progress...</div>
                        ) : (
                            transactions.map((txn) => (
                                <div key={txn.id} className="p-6 hover:bg-gray-50/50 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                    {/* Left: Transaction Details */}
                                    <div className="lg:col-span-4 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{txn.date}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${txn.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {txn.type}
                                            </span>
                                        </div>
                                        <div className="font-bold text-gray-900 text-lg truncate">{txn.description}</div>
                                        <div className={`text-xl font-mono font-black ${txn.type === 'DEBIT' ? 'text-gray-900' : 'text-green-600'}`}>
                                            {txn.type === 'DEBIT' ? '-' : '+'}${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    {/* Middle: AI Match Logic */}
                                    <div className="lg:col-span-5 border-l-2 border-r-2 border-dashed border-gray-100 px-6 py-2 min-h-[5rem] flex items-center">
                                        {txn.status === 'MATCHED' ? (
                                            <div className="flex items-center gap-3 text-green-600 bg-green-50 px-4 py-2 rounded-xl w-full">
                                                <CheckCircle2 size={20} />
                                                <span className="font-bold text-sm">Matched with System Record</span>
                                            </div>
                                        ) : txn.status === 'UNMATCHED' ? (
                                            <div className="flex items-center gap-3 text-red-500 bg-red-50 px-4 py-2 rounded-xl w-full">
                                                <AlertCircle size={20} />
                                                <span className="font-bold text-sm">No matching record found</span>
                                            </div>
                                        ) : txn.suggestedMatch ? (
                                            <div className="w-full space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-purple-600">
                                                        <Wand2 size={12} /> AI Suggestion ({txn.matchConfidence}%)
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-black">{txn.suggestedMatch.source}</span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <div className="font-bold text-gray-900 text-sm">{txn.suggestedMatch.reference}</div>
                                                    <div className="text-xs text-gray-500 flex justify-between mt-1">
                                                        <span>{txn.suggestedMatch.date}</span>
                                                        <span>ID: {txn.suggestedMatch.id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 text-sm italic">Analysis pending...</div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="lg:col-span-3 flex justify-end gap-2">
                                        {txn.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleAcceptMatch(txn.id)}
                                                    className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-600 transition-colors shadow-lg active:scale-95"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleIgnore(txn.id)}
                                                    className="p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Ignore"
                                                >
                                                    <XCircle size={20} />
                                                </button>
                                            </>
                                        )}
                                        {txn.status === 'UNMATCHED' && (
                                            <button className="w-full border-2 border-gray-900 text-gray-900 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-colors">
                                                + Create Record
                                            </button>
                                        )}
                                        {txn.status === 'MATCHED' && (
                                            <button className="w-full text-green-600 py-2 rounded-xl font-bold text-xs uppercase tracking-widest cursor-default">
                                                Reconciled
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
