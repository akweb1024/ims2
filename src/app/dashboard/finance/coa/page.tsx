'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { AccountType } from '@prisma/client';

export default function ChartOfAccountsPage() {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'ASSET',
        description: '',
        parentAccountId: ''
    });

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            // We will create this API route next
            const res = await fetch('/api/finance/accounts');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setAccounts(data);
                else setAccounts([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/finance/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({ code: '', name: '', type: 'ASSET', description: '', parentAccountId: '' });
                fetchAccounts();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const groupByType = (type: string) => accounts.filter(a => a.type === type);

    if (loading) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
                        <p className="text-gray-500">Manage your financial accounts and hierarchy.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        + New Account
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => (
                        <div key={type} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold text-gray-700">
                                {type}
                            </div>
                            <table className="w-full text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-2 font-medium">Code</th>
                                        <th className="px-6 py-2 font-medium">Name</th>
                                        <th className="px-6 py-2 font-medium">Parent</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {groupByType(type).map((acc) => (
                                        <tr key={acc.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-mono text-sm text-gray-600">{acc.code}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">{acc.name}</td>
                                            <td className="px-6 py-3 text-sm text-gray-500">{acc.parentAccount?.name || '-'}</td>
                                        </tr>
                                    ))}
                                    {groupByType(type).length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-400 text-sm italic">No accounts found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>

                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6">
                            <h3 className="text-lg font-bold mb-4">Create Account</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Code</label>
                                    <input
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. 1001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. Cash in Hand"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Parent Account (Optional)</label>
                                    <select
                                        value={formData.parentAccountId}
                                        onChange={e => setFormData({ ...formData, parentAccountId: e.target.value })}
                                        className="w-full mt-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        <option value="">None</option>
                                        {accounts.filter(a => a.type === formData.type).map(a => (
                                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                    <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
