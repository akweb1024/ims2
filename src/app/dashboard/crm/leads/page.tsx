
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FormattedDate from '@/components/common/FormattedDate';
import { TableSkeleton } from '@/components/ui/skeletons';

export default function LeadsPage() {
    const router = useRouter();
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newLead, setNewLead] = useState({
        name: '',
        primaryEmail: '',
        organizationName: '',
        primaryPhone: '',
        status: 'NEW',
        source: 'DIRECT',
        notes: ''
    });
    const [createLoading, setCreateLoading] = useState(false);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                search,
                ...(statusFilter && { status: statusFilter })
            });

            const res = await fetch(`/api/crm/leads?${params}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch leads', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeads();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchLeads]);

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const res = await fetch('/api/crm/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLead)
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewLead({
                    name: '',
                    primaryEmail: '',
                    organizationName: '',
                    primaryPhone: '',
                    status: 'NEW',
                    source: 'DIRECT',
                    notes: ''
                });
                fetchLeads();
            } else {
                alert('Failed to create lead');
            }
        } catch (error) {
            console.error('Error creating lead', error);
        } finally {
            setCreateLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            'NEW': 'bg-blue-100 text-blue-800',
            'CONTACTED': 'bg-yellow-100 text-yellow-800',
            'QUALIFIED': 'bg-purple-100 text-purple-800',
            'PROPOSAL_SENT': 'bg-indigo-100 text-indigo-800',
            'NEGOTIATION': 'bg-orange-100 text-orange-800',
            'CONVERTED': 'bg-green-100 text-green-800',
            'LOST': 'bg-red-100 text-red-800'
        };
        return styles[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Leads</h1>
                    <p className="text-secondary-500">Manage your potential customers</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary"
                >
                    + Add New Lead
                </button>
            </div>

            <div className="card-premium p-4 flex gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search leads..."
                        className="input pl-10 w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input w-48"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL_SENT">Proposal Sent</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="CONVERTED">Converted</option>
                    <option value="LOST">Lost</option>
                </select>
            </div>

            <div className="card-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Organization</th>
                                <th>Status</th>
                                <th>Score</th>
                                <th>Source</th>
                                <th>Owner</th>
                                <th>Created</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8}>
                                        <TableSkeleton rows={5} columns={8} />
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-secondary-500">
                                        No leads found.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-secondary-50">
                                        <td>
                                            <div className="font-medium text-secondary-900">{lead.name}</div>
                                            <div className="text-xs text-secondary-500">{lead.primaryEmail}</div>
                                        </td>
                                        <td>{lead.organizationName || '-'}</td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(lead.leadStatus)}`}>
                                                {lead.leadStatus?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-mono text-xs bg-secondary-100 px-2 py-1 rounded">
                                                {lead.leadScore}
                                            </span>
                                        </td>
                                        <td className="text-xs text-secondary-600 uppercase">{lead.source}</td>
                                        <td>
                                            {lead.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                                        {lead.assignedTo.name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="text-sm">{lead.assignedTo.name}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="text-secondary-500 text-sm">
                                            <FormattedDate date={lead.createdAt} />
                                        </td>
                                        <td className="text-right">
                                            <button className="text-secondary-400 hover:text-primary-600">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Lead Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create New Lead</h2>
                        <form onSubmit={handleCreateLead} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="input w-full"
                                        value={newLead.name}
                                        onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        className="input w-full"
                                        value={newLead.primaryEmail}
                                        onChange={(e) => setNewLead({ ...newLead, primaryEmail: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Organization</label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    value={newLead.organizationName}
                                    onChange={(e) => setNewLead({ ...newLead, organizationName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        className="input w-full"
                                        value={newLead.status}
                                        onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                                    >
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="QUALIFIED">Qualified</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Source</label>
                                    <select
                                        className="input w-full"
                                        value={newLead.source}
                                        onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                                    >
                                        <option value="DIRECT">Direct</option>
                                        <option value="REFERRAL">Referral</option>
                                        <option value="WEBSITE">Website</option>
                                        <option value="LINKEDIN">LinkedIn</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Notes</label>
                                <textarea
                                    className="input w-full min-h-[80px]"
                                    value={newLead.notes}
                                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                                />
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
                                    disabled={createLoading}
                                    className="btn btn-primary"
                                >
                                    {createLoading ? 'Creating...' : 'Create Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
