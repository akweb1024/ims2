'use client';

import { useState, useEffect } from 'react';
import { Gift, Award, Settings, Plus, Check } from 'lucide-react';

interface IncentiveSchema {
    id: string;
    name: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    isActive: boolean;
}

interface BonusSchema {
    id: string;
    name: string;
    description?: string;
    amount: number;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONE_TIME';
}

export default function RewardManager() {
    const [incentiveSchemas, setIncentiveSchemas] = useState<IncentiveSchema[]>([]);
    const [bonusSchemas, setBonusSchemas] = useState<BonusSchema[]>([]);
    const [loading, setLoading] = useState(true);
    const [showIncentiveModal, setShowIncentiveModal] = useState(false);
    const [showBonusModal, setShowBonusModal] = useState(false);

    const [incentiveForm, setIncentiveForm] = useState({
        name: '', description: '', type: 'PERCENTAGE' as IncentiveSchema['type'], value: 0, criteria: ''
    });
    const [bonusForm, setBonusForm] = useState({
        name: '', description: '', amount: 0, frequency: 'YEARLY' as BonusSchema['frequency']
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [iRes, bRes] = await Promise.all([
                fetch('/api/hr/rewards/incentive-schemas'),
                fetch('/api/hr/rewards/bonus-schemas')
            ]);
            if (iRes.ok) setIncentiveSchemas(await iRes.json());
            if (bRes.ok) setBonusSchemas(await bRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleIncentiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/hr/rewards/incentive-schemas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(incentiveForm)
            });
            if (res.ok) {
                setShowIncentiveModal(false);
                fetchData();
            }
        } catch (err) { console.error(err); }
    };

    const handleBonusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/hr/rewards/bonus-schemas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bonusForm)
            });
            if (res.ok) {
                setShowBonusModal(false);
                fetchData();
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-12">
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-secondary-900 border-l-4 border-primary-500 pl-4">Incentive Schemas</h2>
                        <p className="text-secondary-500 italic pl-4">Dynamic reward systems based on performance metrics.</p>
                    </div>
                    <button onClick={() => setShowIncentiveModal(true)} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Add Schema
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {incentiveSchemas.map(schema => (
                        <div key={schema.id} className="card-premium relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <Award className="text-primary-100 group-hover:text-primary-200 transition-colors" size={64} />
                            </div>
                            <h3 className="font-bold text-lg text-secondary-900 mb-2">{schema.name}</h3>
                            <p className="text-xs text-secondary-500 mb-6">{schema.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                                <div className="bg-primary-50 px-3 py-1 rounded-full">
                                    <span className="text-primary-700 font-black text-sm">
                                        {schema.type === 'PERCENTAGE' ? `${schema.value}%` : `₹${schema.value}`}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-black uppercase ${schema.isActive ? 'text-emerald-500' : 'text-secondary-400'}`}>
                                    {schema.isActive ? 'Active' : 'Disabled'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-secondary-900 border-l-4 border-amber-500 pl-4">Bonus Structures</h2>
                        <p className="text-secondary-500 italic pl-4">Fixed reward cycles for loyalty and milestones.</p>
                    </div>
                    <button onClick={() => setShowBonusModal(true)} className="btn btn-warning flex items-center gap-2">
                        <Plus size={18} /> Add Bonus
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {bonusSchemas.map(schema => (
                        <div key={schema.id} className="card-premium border-b-4 border-amber-200">
                            <h3 className="font-bold text-lg text-secondary-900 mb-1">{schema.name}</h3>
                            <p className="text-[10px] font-black text-amber-600 uppercase mb-4 tracking-tighter">{schema.frequency} DISBURSEMENT</p>
                            <p className="text-xs text-secondary-500 mb-6">{schema.description}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-black text-secondary-900">₹{schema.amount.toLocaleString()}</span>
                                <Gift className="text-amber-400" size={24} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            {showIncentiveModal && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-primary-900 p-6 text-white">
                            <h3 className="text-xl font-black">Configure Incentive</h3>
                        </div>
                        <form onSubmit={handleIncentiveSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Schema Name</label>
                                <input className="input" required value={incentiveForm.name} onChange={e => setIncentiveForm({ ...incentiveForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Reward Type</label>
                                    <select className="input" value={incentiveForm.type} onChange={e => setIncentiveForm({ ...incentiveForm, type: e.target.value as any })}>
                                        <option value="PERCENTAGE">Percentage</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Value</label>
                                    <input type="number" className="input" required value={incentiveForm.value} onChange={e => setIncentiveForm({ ...incentiveForm, value: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input" rows={3} value={incentiveForm.description} onChange={e => setIncentiveForm({ ...incentiveForm, description: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowIncentiveModal(false)} className="flex-1 btn border">Cancel</button>
                                <button type="submit" className="flex-1 btn btn-primary">Save Schema</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBonusModal && (
                <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-amber-600 p-6 text-white">
                            <h3 className="text-xl font-black">Configure Bonus</h3>
                        </div>
                        <form onSubmit={handleBonusSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Bonus Name</label>
                                <input className="input" required value={bonusForm.name} onChange={e => setBonusForm({ ...bonusForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Amount (₹)</label>
                                    <input type="number" className="input" required value={bonusForm.amount} onChange={e => setBonusForm({ ...bonusForm, amount: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="label">Frequency</label>
                                    <select className="input" value={bonusForm.frequency} onChange={e => setBonusForm({ ...bonusForm, frequency: e.target.value as any })}>
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="QUARTERLY">Quarterly</option>
                                        <option value="YEARLY">Yearly</option>
                                        <option value="ONE_TIME">One Time</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input" rows={3} value={bonusForm.description} onChange={e => setBonusForm({ ...bonusForm, description: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowBonusModal(false)} className="flex-1 btn border">Cancel</button>
                                <button type="submit" className="flex-1 btn btn-warning">Save Bonus</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
