'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowRightLeft, CheckCircle2, XCircle, AlertCircle,
    RefreshCw, Wand2, Upload, FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
    id: string; // Temporary ID for CSV line
    date: string;
    description: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    status: 'MATCHED' | 'UNMATCHED' | 'PENDING';
    matchConfidence?: number;
    suggestedMatch?: {
        id: string; // Journal Entry ID
        source: string;
        reference: string;
        date: string;
    };
}

export default function ReconciliationPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ unmatched: 0, pending: 0, matched: 0 });
    const [file, setFile] = useState<File | null>(null);

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        const parsed: Transaction[] = [];
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Assume format: DATE, DESCRIPTION, AMOUNT
            // e.g. 2025-05-10,AWS Services,-1250.00
            const parts = line.split(',');
            if (parts.length < 3) continue;

            const date = parts[0].trim();
            const description = parts[1].trim();
            const amount = parseFloat(parts[2].trim());

            if (isNaN(amount)) continue;

            parsed.push({
                id: `csv-${i}`,
                date,
                description,
                amount: Math.abs(amount),
                type: amount >= 0 ? 'CREDIT' : 'DEBIT', // Inflow (Credit) / Outflow (Debit) convention for Bank Statement? 
                // Wait, Bank Statement:
                // Credit = Money In. Debit = Money Out.
                // My API expects Signed Amount? 
                // "isDebit = txnAmount > 0" in API means Inflow... wait.
                // In API I wrote: "txnAmount > 0 (Inflow) -> Find DEBIT". 
                // So if CSV has positive amount for inflow, I send positive.
                // If CSV has negative amount for outflow, I send negative.
                // Here I am parsing.
                // Let's assume user provides signed amount.
                status: 'PENDING',
                matchConfidence: 0
            });
        }
        return parsed;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSync = async () => {
        if (!file) {
            toast.error('Please upload a CSV file first');
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            const parsed = parseCSV(text);

            // Prepare for API
            // Map back to signed amount for API
            const apiPayload = parsed.map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                amount: t.type === 'CREDIT' ? t.amount : -t.amount
            }));

            try {
                const res = await fetch('/api/finance/reconciliation/match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactions: apiPayload })
                });

                if (res.ok) {
                    const matches = await res.json();
                    // Merge matches back
                    // API returns list with status/suggestion
                    // We map by ID or index, assuming order preserved or ID passed back.
                    // API implementation passed back "...txn" so ID is there.
                    setTransactions(matches);

                    // Update stats
                    const p = matches.filter((t: any) => t.status === 'MATCHED').length; // Actually API returns MATCHED if found candidate, but we show as PENDING review?
                    // My API returns MATCHED. But UI mocks showed "PENDING" with suggestion.
                    // Let's treat API MATCHED as "PENDING REVIEW" in UI.

                    const uiData = matches.map((m: any) => ({
                        ...m,
                        status: m.status === 'MATCHED' ? 'PENDING' : 'UNMATCHED',
                        amount: Math.abs(parseFloat(m.amount)) // Ensure positive for display
                    }));

                    setTransactions(uiData);

                    setStats({
                        matched: 0,
                        pending: uiData.filter((t: any) => t.status === 'PENDING').length,
                        unmatched: uiData.filter((t: any) => t.status === 'UNMATCHED').length
                    });

                    toast.success('Analysis Complete');
                } else {
                    toast.error('Failed to match transactions');
                }
            } catch (err) {
                console.error(err);
                toast.error('Error syncing feed');
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleAcceptMatch = async (txnId: string) => {
        const txn = transactions.find(t => t.id === txnId);
        if (!txn || !txn.suggestedMatch) return;

        // Call API
        try {
            const res = await fetch('/api/finance/reconciliation/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journalEntryId: txn.suggestedMatch.id })
            });

            if (res.ok) {
                setTransactions(prev => prev.map(t =>
                    t.id === txnId ? { ...t, status: 'MATCHED' } : t
                ));
                setStats(prev => ({ ...prev, pending: prev.pending - 1, matched: prev.matched + 1 }));
                toast.success('Reconciled!');
            } else {
                toast.error('Failed to confirm');
            }
        } catch (e) {
            toast.error('Error confirming match');
        }
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
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <ArrowRightLeft size={28} />
                            </span>
                            Reconciliation
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium">Upload Bank Statement (CSV) to match against Ledger.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <button className="flex items-center gap-2 bg-white text-gray-700 border px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-gray-50">
                                <Upload size={16} /> {file ? file.name : 'Select CSV'}
                            </button>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={!file || loading}
                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black shadow-lg transition-transform hover:-translate-y-1 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                            Process
                        </button>
                    </div>
                </div>

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

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            <div className="h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                            Feed Transactions
                        </h3>
                        <div className="text-xs text-gray-400">
                            Expected CSV Format: Date (YYYY-MM-DD), Description, Amount (Signed)
                        </div>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {transactions.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                {loading ? 'Analyzing...' : 'Upload a CSV to begin reconciliation'}
                            </div>
                        ) : (
                            transactions.map((txn) => (
                                <div key={txn.id} className="p-6 hover:bg-gray-50/50 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                                    <div className="lg:col-span-4 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{txn.date}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${txn.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {txn.type}
                                            </span>
                                        </div>
                                        <div className="font-bold text-gray-900 text-lg truncate">{txn.description}</div>
                                        <div className={`text-xl font-mono font-black ${txn.type === 'DEBIT' ? 'text-gray-900' : 'text-green-600'}`}>
                                            {txn.type === 'DEBIT' ? '-' : '+'}${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="lg:col-span-5 border-l-2 border-r-2 border-dashed border-gray-100 px-6 py-2 min-h-[5rem] flex items-center">
                                        {txn.status === 'MATCHED' ? (
                                            <div className="flex items-center gap-3 text-green-600 bg-green-50 px-4 py-2 rounded-xl w-full">
                                                <CheckCircle2 size={20} />
                                                <span className="font-bold text-sm">Reconciled</span>
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
                                                        <Wand2 size={12} /> Match Found ({txn.matchConfidence}%)
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 uppercase font-black">{txn.suggestedMatch.source}</span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                                    <div className="font-bold text-gray-900 text-sm">{txn.suggestedMatch.reference || 'No Ref'}</div>
                                                    <div className="text-xs text-gray-500 flex justify-between mt-1">
                                                        <span>{new Date(txn.suggestedMatch.date).toLocaleDateString()}</span>
                                                        <span className="font-mono text-[10px]">{txn.suggestedMatch.id.split('-')[0]}...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-400 text-sm italic">Analysis pending...</div>
                                        )}
                                    </div>

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
