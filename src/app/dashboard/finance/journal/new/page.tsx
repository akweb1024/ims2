'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';

export default function NewJournalEntryPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [reference, setReference] = useState('');
    const [lines, setLines] = useState([
        { accountId: '', description: '', debit: '', credit: '' },
        { accountId: '', description: '', debit: '', credit: '' } // Start with 2 lines
    ]);

    useEffect(() => {
        fetch('/api/finance/accounts')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setAccounts(data);
                } else {
                    console.error('Expected array, got:', data);
                    setAccounts([]);
                }
            })
            .catch(err => {
                console.error(err);
                setAccounts([]);
            });
    }, []);

    const addLine = () => {
        setLines([...lines, { accountId: '', description: '', debit: '', credit: '' }]);
    };

    const removeLine = (index: number) => {
        if (lines.length > 2) {
            setLines(lines.filter((_, i) => i !== index));
        }
    };

    const updateLine = (index: number, field: string, value: string) => {
        const newLines: any = [...lines];
        newLines[index][field] = value;
        // Auto-clear opposite field if one is set (standard behavior, though user might want both? usually not in same line)
        if (field === 'debit' && value) newLines[index].credit = '';
        if (field === 'credit' && value) newLines[index].debit = '';
        setLines(newLines);
    };

    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            alert('Entry must be balanced!');
            return;
        }

        try {
            const res = await fetch('/api/finance/journal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    description,
                    reference,
                    lines: lines.map(l => ({
                        accountId: l.accountId,
                        description: l.description || description, // Fallback to main desc if empty
                        debit: parseFloat(l.debit) || 0,
                        credit: parseFloat(l.credit) || 0
                    })).filter(l => l.debit > 0 || l.credit > 0)
                })
            });

            if (res.ok) {
                router.push('/dashboard/finance/journal');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create entry');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">New Journal Entry</h1>
                    <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">Cancel</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Date</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700">Reference #</label>
                            <input value={reference} onChange={e => setReference(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" placeholder="Optional" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-gray-700">Description</label>
                            <input required value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 border rounded-lg" placeholder="e.g. Monthly Rent Payment" />
                        </div>
                    </div>

                    {/* Lines */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            <div className="flex-[3]">Account</div>
                            <div className="flex-[3] ml-4">Description (Optional)</div>
                            <div className="flex-1 ml-4 text-right">Debit</div>
                            <div className="flex-1 ml-4 text-right">Credit</div>
                            <div className="w-8 ml-4"></div>
                        </div>

                        <div className="space-y-2">
                            {lines.map((line, index) => (
                                <div key={index} className="flex items-start">
                                    <div className="flex-[3]">
                                        <select
                                            required
                                            value={line.accountId}
                                            onChange={e => updateLine(index, 'accountId', e.target.value)}
                                            className="w-full p-2 border rounded-lg bg-gray-50 focus:bg-white transition-colors"
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.code} - {acc.name} ({acc.type})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-[3] ml-4">
                                        <input
                                            value={line.description}
                                            onChange={e => updateLine(index, 'description', e.target.value)}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="Line description"
                                        />
                                    </div>
                                    <div className="flex-1 ml-4">
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={line.debit}
                                            onChange={e => updateLine(index, 'debit', e.target.value)}
                                            className="w-full p-2 border rounded-lg text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex-1 ml-4">
                                        <input
                                            type="number" step="0.01" min="0"
                                            value={line.credit}
                                            onChange={e => updateLine(index, 'credit', e.target.value)}
                                            className="w-full p-2 border rounded-lg text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="w-8 ml-4 flex items-center justify-center pt-2">
                                        <button type="button" onClick={() => removeLine(index)} className="text-gray-400 hover:text-red-500">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="button" onClick={addLine} className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700">+ Add Line</button>
                    </div>

                    {/* Footer Totals */}
                    <div className={`bg-white p-6 rounded-xl border shadow-sm flex justify-between items-center ${isBalanced ? 'border-primary-100 bg-primary-50' : 'border-red-100 bg-red-50'}`}>
                        <div className="text-sm text-gray-500">
                            <p>Total Debit: <span className="font-bold text-gray-900">₹{totalDebit.toFixed(2)}</span></p>
                            <p>Total Credit: <span className="font-bold text-gray-900">₹{totalCredit.toFixed(2)}</span></p>
                        </div>
                        <div className="flex items-center gap-4">
                            {!isBalanced && (
                                <div className="text-red-600 text-sm font-bold animate-pulse">
                                    Difference: ₹{Math.abs(totalDebit - totalCredit).toFixed(2)}
                                </div>
                            )}
                            <button
                                disabled={!isBalanced}
                                type="submit"
                                className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                            >
                                Post Entry
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
