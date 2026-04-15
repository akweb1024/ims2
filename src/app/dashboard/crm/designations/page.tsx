'use client';

import { useState, useEffect, useCallback } from 'react';
import CRMClientLayout from '../CRMClientLayout';
import { CRMPageShell, CRMSearchInput, CRMModal } from '@/components/crm/CRMPageShell';
import { Tags, Plus, Pencil, Trash2, AlertTriangle, Check, X, Loader2 } from 'lucide-react';

interface Designation {
    id: string;
    name: string;
    level: number;
    isActive?: boolean;
}

export default function ManageDesignationsPage() {
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userRole, setUserRole] = useState('EXECUTIVE');

    // Add new
    const [addName, setAddName] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');

    // Edit
    const [editTarget, setEditTarget] = useState<Designation | null>(null);
    const [editName, setEditName] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role);
    }, []);

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

    const fetchDesignations = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all (including inactive for management view)
            const res = await fetch(`/api/crm/designations?search=${encodeURIComponent(search)}&includeInactive=true`);
            if (res.ok) {
                const data = await res.json();
                setDesignations(data.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchDesignations, 300);
        return () => clearTimeout(t);
    }, [fetchDesignations]);

    const handleAdd = async () => {
        const name = addName.trim();
        if (!name) { setAddError('Name is required'); return; }
        setAddLoading(true);
        setAddError('');
        try {
            const res = await fetch('/api/crm/designations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                setAddName('');
                fetchDesignations();
            } else {
                const d = await res.json();
                setAddError(d.error || 'Failed to add');
            }
        } finally {
            setAddLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editTarget) return;
        const name = editName.trim();
        if (!name) return;
        setEditLoading(true);
        try {
            const res = await fetch(`/api/crm/designations/${editTarget.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                setEditTarget(null);
                fetchDesignations();
            }
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/crm/designations/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteTarget(null);
                fetchDesignations();
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const filtered = designations.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="Manage Designations"
                subtitle="Maintain job titles and designations used across customer profiles."
                icon={<Tags className="w-5 h-5" />}
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Manage Designations' },
                ]}
            >
                <div className="max-w-3xl mx-auto space-y-8">

                    {/* ── Add New ─────────────────────────────────────── */}
                    <div className="bg-white rounded-3xl border border-secondary-100 shadow-xl p-8">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 mb-5">Add New Designation</h3>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={addName}
                                    onChange={e => { setAddName(e.target.value); setAddError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                    placeholder="e.g. Senior Librarian, Research Director..."
                                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-semibold outline-none transition-all
                                        ${addError ? 'border-red-400 bg-red-50' : 'border-secondary-200 focus:border-primary-500 hover:border-secondary-300'}
                                    `}
                                />
                                {addError && <p className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-wider">{addError}</p>}
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={addLoading || !addName.trim()}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {addLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Add
                            </button>
                        </div>
                    </div>

                    {/* ── List ────────────────────────────────────────── */}
                    <div className="bg-white rounded-3xl border border-secondary-100 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-secondary-50 flex items-center justify-between gap-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400">
                                All Designations
                                <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary-100 text-secondary-600 text-[9px]">
                                    {filtered.length}
                                </span>
                            </h3>
                            <CRMSearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="Filter designations..."
                                className="!w-64"
                            />
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-20 text-secondary-400">
                                <Loader2 size={20} className="animate-spin" />
                                <span className="text-sm font-semibold">Loading...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-20 text-center text-secondary-400">
                                <Tags size={36} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-semibold">No designations found</p>
                                {search && <p className="text-xs mt-1">Try a different search term or add it above.</p>}
                            </div>
                        ) : (
                            <ul className="divide-y divide-secondary-50">
                                {filtered.map((d, i) => (
                                    <li key={d.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-secondary-50/40 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-secondary-100 text-secondary-500 text-[10px] font-black flex items-center justify-center">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm font-bold text-secondary-900">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditTarget(d); setEditName(d.name); }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-secondary-200 text-secondary-400 hover:bg-secondary-50 hover:text-secondary-700 transition-all"
                                                title="Rename"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => setDeleteTarget(d)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-all"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ── Edit Modal ──────────────────────────────────────── */}
                <CRMModal
                    open={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    title="Rename Designation"
                    subtitle={`Currently: ${editTarget?.name}`}
                >
                    <div className="space-y-5">
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleEdit(); }}
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl border-2 border-secondary-200 focus:border-primary-500 text-sm font-semibold outline-none transition-all"
                        />
                        <div className="flex gap-3 border-t border-secondary-100 pt-4">
                            <button onClick={() => setEditTarget(null)} className="flex-1 px-4 py-3 rounded-xl border border-secondary-200 text-[10px] font-black uppercase tracking-wider text-secondary-500 hover:bg-secondary-50 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={editLoading || !editName.trim()}
                                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-primary-700 disabled:opacity-50 transition-all"
                            >
                                {editLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                Save
                            </button>
                        </div>
                    </div>
                </CRMModal>

                {/* ── Delete Modal ─────────────────────────────────────── */}
                <CRMModal
                    open={!!deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    title="Remove Designation"
                    subtitle="This will hide the designation from future selections."
                >
                    <div className="space-y-5">
                        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-800">Remove &quot;{deleteTarget?.name}&quot;?</p>
                                <p className="text-xs text-red-600 mt-1">Existing customer profiles using this designation will be unaffected.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-3 rounded-xl border border-secondary-200 text-[10px] font-black uppercase tracking-wider text-secondary-500 hover:bg-secondary-50 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all"
                            >
                                {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                Remove
                            </button>
                        </div>
                    </div>
                </CRMModal>
            </CRMPageShell>
        </CRMClientLayout>
    );
}
