
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormattedDate from '@/components/common/FormattedDate';
import CRMClientLayout from '../CRMClientLayout';

// Simple Kanban Board Implementation
export default function DealsPage() {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Stages definition
    const STAGES = [
        { id: 'DISCOVERY', label: 'Discovery', color: 'bg-blue-50 border-blue-200' },
        { id: 'PROPOSAL', label: 'Proposal', color: 'bg-indigo-50 border-indigo-200' },
        { id: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-50 border-purple-200' },
        { id: 'CLOSED_WON', label: 'Won', color: 'bg-green-50 border-green-200' },
        { id: 'CLOSED_LOST', label: 'Lost', color: 'bg-red-50 border-red-200' }
    ];

    const [newDeal, setNewDeal] = useState({
        title: '',
        value: 0,
        customerId: '',
        stage: 'DISCOVERY',
        notes: '',
        expectedCloseDate: ''
    });

    // For Customer select in modal
    const [leads, setLeads] = useState<any[]>([]);

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/deals');
            if (res.ok) {
                const data = await res.json();
                setDeals(data);
            }
        } catch (error) {
            console.error('Failed to fetch deals', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLeadsForSelect = async () => {
        try {
            const res = await fetch('/api/crm/leads?limit=100');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.data);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchDeals();
        fetchLeadsForSelect();
    }, [fetchDeals]);

    const handleCreateDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/crm/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDeal)
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewDeal({ title: '', value: 0, customerId: '', stage: 'DISCOVERY', notes: '', expectedCloseDate: '' });
                fetchDeals();
            } else {
                alert('Failed to create deal');
            }
        } catch (error) {
            console.error('Error creating deal', error);
        }
    };

    // Calculate totals per stage
    const getStageTotal = (stageId: string) => {
        return deals
            .filter(d => d.stage === stageId)
            .reduce((sum, d) => sum + (d.value || 0), 0);
    };

    return (
        <CRMClientLayout>
            <div className="h-[calc(100vh-140px)] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Deals Pipeline</h1>
                        <p className="text-secondary-500">Track your opportunities</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        + New Deal
                    </button>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex gap-4 h-full min-w-[1200px] pb-4">
                        {STAGES.map(stage => (
                            <div key={stage.id} className={`flex-1 rounded-xl border flex flex-col ${stage.color}`}>
                                <div className="p-3 border-b border-black/5 flex justify-between items-center bg-white/50 rounded-t-xl">
                                    <h3 className="font-bold text-secondary-800 text-sm">{stage.label}</h3>
                                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded text-secondary-600">
                                        {deals.filter(d => d.stage === stage.id).length}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-white/30 text-right text-xs font-bold text-secondary-600 border-b border-black/5">
                                    Total: ₹{getStageTotal(stage.id).toLocaleString()}
                                </div>

                                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                    {deals.filter(d => d.stage === stage.id).map(deal => (
                                        <Link
                                            key={deal.id}
                                            href={`/dashboard/crm/deals/${deal.id}`}
                                            className="block bg-white p-3 rounded-lg shadow-sm border border-secondary-100 hover:shadow-md transition-shadow cursor-pointer group"
                                        >
                                            <div className="font-semibold text-secondary-900 group-hover:text-primary-600 mb-1 leading-tight">{deal.title}</div>
                                            <div className="text-xs text-secondary-500 mb-2 truncate">
                                                {deal.customer?.organizationName || deal.customer?.name}
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-xs text-secondary-400">
                                                    <FormattedDate date={deal.expectedCloseDate} />
                                                </div>
                                                <div className="font-bold text-primary-600">
                                                    ₹{deal.value?.toLocaleString()}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    {deals.filter(d => d.stage === stage.id).length === 0 && (
                                        <div className="text-center py-8 text-secondary-400 text-sm italic">
                                            No deals
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Create Deal Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Deal</h2>
                            <form onSubmit={handleCreateDeal} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Deal Title *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={newDeal.title}
                                        onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                                        placeholder="e.g. Annual Software License"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Customer *</label>
                                        <select
                                            required
                                            className="input w-full"
                                            value={newDeal.customerId}
                                            onChange={(e) => setNewDeal({ ...newDeal, customerId: e.target.value })}
                                        >
                                            <option value="">Select Customer/Lead</option>
                                            {leads.map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {l.name} {l.organizationName ? `(${l.organizationName})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Value (₹) *</label>
                                        <input
                                            type="number"
                                            required
                                            className="input w-full"
                                            value={newDeal.value}
                                            onChange={(e) => setNewDeal({ ...newDeal, value: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Stage</label>
                                        <select
                                            className="input w-full"
                                            value={newDeal.stage}
                                            onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                                        >
                                            {STAGES.map(s => (
                                                <option key={s.id} value={s.id}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Expected Close</label>
                                        <input
                                            type="date"
                                            className="input w-full"
                                            value={newDeal.expectedCloseDate}
                                            onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                    >
                                        Create Deal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </CRMClientLayout>
    );
}
