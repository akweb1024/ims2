'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CRMPageShell, CRMModal } from '@/components/crm/CRMPageShell';
import { Layers, Plus, Trash2 } from 'lucide-react';

export default function GlobalAttributesPage() {
    const [attributes, setAttributes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [terms, setTerms] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState('EXECUTIVE');

    const fetchAttributes = useCallback(async () => {
        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch('/api/invoice-products/attributes', { headers: authH });
            if (res.ok) setAttributes(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const r = localStorage.getItem('userRole');
        if (r) setUserRole(r);
        fetchAttributes();
    }, [fetchAttributes]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                terms: terms.split(',').filter(t => t.trim()).map(t => ({ value: t.trim() }))
            };
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch('/api/invoice-products/attributes', {
                method: 'POST', headers: authH, body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowModal(false);
                setName('');
                setTerms('');
                fetchAttributes();
            } else {
                const err = await res.json();
                alert(err.details || err.error || 'Failed to save');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Global Product Attributes"
                subtitle="Manage shared attributes like Size, Color, or Material applicable to variants."
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Products', href: '/dashboard/crm/invoice-products' },
                    { label: 'Global Attributes' }
                ]}
                icon={<Layers className="w-5 h-5" />}
                actions={
                    <button onClick={() => setShowModal(true)} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-primary-700 flex items-center gap-2">
                        <Plus size={18} /> New Global Attribute
                    </button>
                }
            >
                <div className="bg-white rounded-[2rem] border border-secondary-100 shadow p-8">
                    {loading ? (
                        <div className="py-20 text-center text-secondary-400">Loading attributes...</div>
                    ) : attributes.length === 0 ? (
                        <div className="py-20 text-center text-secondary-400">No global attributes defined.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {attributes.map(attr => (
                                <div key={attr.id} className="p-6 bg-secondary-50 border border-secondary-100 rounded-2xl">
                                    <h3 className="font-black text-lg text-secondary-900 mb-2">{attr.name}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {attr.terms.map((t: any) => (
                                            <span key={t.id} className="px-3 py-1 bg-white border border-secondary-200 text-xs font-bold text-secondary-600 rounded-lg">
                                                {t.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <CRMModal open={showModal} onClose={() => setShowModal(false)} title="Create Global Attribute" subtitle="Define standard terms.">
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase">Attribute Name</label>
                            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Size, Color, Print Material" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-secondary-600 uppercase">Values (Comma Separated)</label>
                            <input className="input" value={terms} onChange={e => setTerms(e.target.value)} placeholder="e.g. Small, Medium, Large" required />
                        </div>
                        <button type="submit" disabled={saving} className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold hover:bg-primary-700">
                            {saving ? 'Saving...' : 'Create Attribute'}
                        </button>
                    </form>
                </CRMModal>
            </CRMPageShell>
        </DashboardLayout>
    );
}
