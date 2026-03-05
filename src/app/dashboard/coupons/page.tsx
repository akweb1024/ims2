'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Coupon = {
    id: string;
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderValue?: number;
    maxDiscountCap?: number;
    usageLimit?: number;
    usedCount: number;
    validFrom: string;
    validUntil?: string;
    isActive: boolean;
    brandId?: string;
    brand?: { id: string; name: string };
    _count?: { invoices: number };
};

const initialForm = {
    code: '', description: '', discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '', minOrderValue: '', maxDiscountCap: '',
    usageLimit: '', validFrom: '', validUntil: '', brandId: '', isActive: true,
};

export default function CouponsPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [form, setForm] = useState({ ...initialForm });
    const [saving, setSaving] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    const fetchCoupons = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/coupons', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setCoupons(await res.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    const fetchBrands = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/brands', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setBrands(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || 'CUSTOMER');
        fetchCoupons();
        fetchBrands();
    }, [fetchCoupons, fetchBrands]);

    const openCreate = () => {
        setEditingCoupon(null);
        setForm({ ...initialForm, validFrom: new Date().toISOString().split('T')[0] });
        setShowModal(true);
    };

    const openEdit = (c: Coupon) => {
        setEditingCoupon(c);
        setForm({
            code: c.code,
            description: c.description || '',
            discountType: c.discountType,
            discountValue: String(c.discountValue),
            minOrderValue: String(c.minOrderValue || ''),
            maxDiscountCap: String(c.maxDiscountCap || ''),
            usageLimit: String(c.usageLimit || ''),
            validFrom: c.validFrom?.split('T')[0] || '',
            validUntil: c.validUntil?.split('T')[0] || '',
            brandId: c.brandId || '',
            isActive: c.isActive,
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                code: form.code.toUpperCase().trim(),
                description: form.description,
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
                maxDiscountCap: form.maxDiscountCap ? Number(form.maxDiscountCap) : null,
                usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                validFrom: form.validFrom || null,
                validUntil: form.validUntil || null,
                brandId: form.brandId || null,
                isActive: form.isActive,
            };

            const url = editingCoupon ? `/api/coupons/${editingCoupon.id}` : '/api/coupons';
            const method = editingCoupon ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowModal(false);
                fetchCoupons();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save coupon');
            }
        } catch (err) { alert('An error occurred'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (coupon: Coupon) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/coupons/${coupon.id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !coupon.isActive }),
        });
        fetchCoupons();
    };

    const handleDelete = async (coupon: Coupon) => {
        if (!confirm(`Delete coupon "${coupon.code}"?`)) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/coupons/${coupon.id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) fetchCoupons();
        else alert('Failed to delete coupon');
    };

    const canManage = ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(userRole);
    const filtered = coupons.filter(c =>
        filterStatus === 'all' ? true : filterStatus === 'active' ? c.isActive : !c.isActive
    );

    const isExpired = (c: Coupon) => !!(c.validUntil && new Date(c.validUntil) < new Date());
    const isLimitReached = (c: Coupon) => !!(c.usageLimit && c.usedCount >= c.usageLimit);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold font-primary">Discount Coupons</h1>
                        <p className="text-secondary-600 mt-1">Create and manage promo coupons for invoices</p>
                    </div>
                    {canManage && (
                        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
                            🎟️ Create Coupon
                        </button>
                    )}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Coupons', value: coupons.length, icon: '🎟️', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { label: 'Active', value: coupons.filter(c => c.isActive && !isExpired(c) && !isLimitReached(c)).length, icon: '✅', color: 'bg-green-50 text-green-700 border-green-100' },
                        { label: 'Expired / Limit Reached', value: coupons.filter(c => isExpired(c) || isLimitReached(c)).length, icon: '⏱️', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                        { label: 'Total Uses', value: coupons.reduce((s, c) => s + c.usedCount, 0), icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                    ].map(stat => (
                        <div key={stat.label} className={`card-premium p-5 border ${stat.color} flex items-center gap-4`}>
                            <span className="text-2xl">{stat.icon}</span>
                            <div>
                                <p className="text-2xl font-black">{stat.value}</p>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter */}
                <div className="flex gap-2">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all border ${filterStatus === f ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-200' : 'bg-white text-secondary-500 border-secondary-100 hover:bg-secondary-50'}`}
                        >
                            {f === 'all' ? 'All' : f === 'active' ? '✅ Active' : '🔴 Inactive'}
                        </button>
                    ))}
                </div>

                {/* Coupons Table */}
                <div className="card-premium overflow-hidden">
                    {loading ? (
                        <div className="py-16 text-center text-secondary-400 animate-pulse">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-5xl mb-4">🎟️</p>
                            <p className="font-bold text-secondary-600">No coupons found</p>
                            {canManage && <button onClick={openCreate} className="btn btn-primary mt-4">Create your first coupon</button>}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary-50 border-b border-secondary-100">
                                    <tr>
                                        {['Code', 'Discount', 'Usage', 'Validity', 'Brand', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="text-left px-5 py-4 text-xs font-black text-secondary-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-50">
                                    {filtered.map(coupon => {
                                        const expired = isExpired(coupon);
                                        const limitReached = isLimitReached(coupon);
                                        const status = !coupon.isActive ? 'inactive' : expired ? 'expired' : limitReached ? 'used-up' : 'active';
                                        return (
                                            <tr key={coupon.id} className="hover:bg-secondary-50/50 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <p className="font-black text-base font-mono tracking-widest text-secondary-900">{coupon.code}</p>
                                                    {coupon.description && <p className="text-xs text-secondary-500 mt-0.5">{coupon.description}</p>}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1 font-black text-primary-700 text-base">
                                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                                                        <span className="text-[10px] font-normal text-secondary-400 uppercase">{coupon.discountType === 'PERCENTAGE' ? 'off' : 'flat'}</span>
                                                    </span>
                                                    {(coupon.minOrderValue ?? 0) > 0 && (
                                                        <p className="text-xs text-secondary-400 mt-0.5">Min order: ₹{coupon.minOrderValue!.toLocaleString()}</p>
                                                    )}
                                                    {coupon.maxDiscountCap && (
                                                        <p className="text-xs text-secondary-400">Max cap: ₹{coupon.maxDiscountCap.toLocaleString()}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-bold">{coupon.usedCount}<span className="text-secondary-400 font-normal">/{coupon.usageLimit ?? '∞'}</span></p>
                                                    <div className="mt-1 h-1.5 bg-secondary-100 rounded-full w-20">
                                                        {coupon.usageLimit && (
                                                            <div
                                                                className="h-full rounded-full bg-primary-500 transition-all"
                                                                style={{ width: `${Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    <p className="text-secondary-500">From: <span className="font-bold text-secondary-700">{new Date(coupon.validFrom).toLocaleDateString('en-IN')}</span></p>
                                                    {coupon.validUntil ? (
                                                        <p className={`${expired ? 'text-red-600' : 'text-secondary-500'}`}>
                                                            Until: <span className="font-bold">{new Date(coupon.validUntil).toLocaleDateString('en-IN')}</span>
                                                        </p>
                                                    ) : <p className="text-secondary-400 italic">No expiry</p>}
                                                </td>
                                                <td className="px-5 py-4 text-xs">
                                                    {coupon.brand ? (
                                                        <span className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
                                                            {coupon.brand.name}
                                                        </span>
                                                    ) : <span className="text-secondary-400 italic">All brands</span>}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                                                        ${status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                          status === 'expired' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                          status === 'used-up' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                          'bg-secondary-100 text-secondary-500 border border-secondary-200'}`}>
                                                        {status === 'active' ? '● Active' : status === 'expired' ? '⏱ Expired' : status === 'used-up' ? '✓ Used Up' : '○ Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {canManage && (
                                                            <>
                                                                <button onClick={() => openEdit(coupon)} className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-primary-100 transition-all">
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleActive(coupon)}
                                                                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border border-transparent transition-all
                                                                        ${coupon.isActive ? 'text-amber-600 hover:bg-amber-50 hover:border-amber-100' : 'text-green-600 hover:bg-green-50 hover:border-green-100'}`}
                                                                >
                                                                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                                                                </button>
                                                                {['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(userRole) && (
                                                                    <button onClick={() => handleDelete(coupon)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-all">
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
                                <p className="text-sm text-secondary-500 mt-0.5">{editingCoupon ? `Editing: ${editingCoupon.code}` : 'New discount coupon for invoices'}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-secondary-400 hover:text-secondary-700 transition-colors text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            {/* Code + Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Coupon Code <span className="text-red-500">*</span></label>
                                    <input className="input uppercase font-mono tracking-widest" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" required maxLength={30} />
                                </div>
                                <div>
                                    <label className="label">Discount Type <span className="text-red-500">*</span></label>
                                    <select className="input" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}>
                                        <option value="PERCENTAGE">Percentage (%) off</option>
                                        <option value="FIXED">Fixed (₹) amount off</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        {form.discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount (₹)'} <span className="text-red-500">*</span>
                                    </label>
                                    <input className="input" type="number" min="0.01" max={form.discountType === 'PERCENTAGE' ? 100 : undefined} step="0.01"
                                        value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} required placeholder={form.discountType === 'PERCENTAGE' ? '10' : '500'} />
                                </div>
                                {form.discountType === 'PERCENTAGE' && (
                                    <div>
                                        <label className="label">Max Discount Cap (₹) <span className="text-secondary-400 text-xs font-normal">optional</span></label>
                                        <input className="input" type="number" min="0" step="1"
                                            value={form.maxDiscountCap} onChange={e => setForm({ ...form, maxDiscountCap: e.target.value })} placeholder="e.g. 2000 (max ₹2000 even at 50%)" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="label">Description <span className="text-secondary-400 text-xs font-normal">optional</span></label>
                                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Welcome discount for new customers" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Min Order Value (₹) <span className="text-secondary-400 text-xs font-normal">optional</span></label>
                                    <input className="input" type="number" min="0" step="1"
                                        value={form.minOrderValue} onChange={e => setForm({ ...form, minOrderValue: e.target.value })} placeholder="0 = no minimum" />
                                </div>
                                <div>
                                    <label className="label">Usage Limit <span className="text-secondary-400 text-xs font-normal">optional — blank = unlimited</span></label>
                                    <input className="input" type="number" min="1" step="1"
                                        value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} placeholder="e.g. 100" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Valid From</label>
                                    <input className="input" type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Valid Until <span className="text-secondary-400 text-xs font-normal">optional — blank = never expires</span></label>
                                    <input className="input" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} min={form.validFrom} />
                                </div>
                            </div>

                            <div>
                                <label className="label">Restrict to Brand <span className="text-secondary-400 text-xs font-normal">optional — blank = valid for all brands</span></label>
                                <select className="input" value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })}>
                                    <option value="">All Brands</option>
                                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-secondary-50 rounded-xl">
                                <label className="label mb-0 flex-1">Active (appears in invoice creation)</label>
                                <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${form.isActive ? 'bg-green-500' : 'bg-secondary-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isActive ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary px-8">Cancel</button>
                                <button type="submit" disabled={saving} className="btn btn-primary px-8">
                                    {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
