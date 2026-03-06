'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    CRMPageShell,
    CRMStatCard,
    CRMBadge,
    CRMTable,
    CRMRowAction,
    CRMModal,
} from '@/components/crm/CRMPageShell';
import { 
    Ticket, Plus, Edit, Trash2, Power, PowerOff, 
    CheckCircle2, AlertCircle, Clock, BarChart3,
    Tag, IndianRupee, Percent, Layers, Globe,
    ChevronRight, Target, Activity, Calendar
} from 'lucide-react';

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
            <CRMPageShell
                title="Promotion Management"
                subtitle="Configure and track high-impact discount vectors and promotional matrices."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Discount Coupons' }]}
                icon={<Ticket className="w-5 h-5" />}
                actions={
                    canManage && (
                        <button 
                            onClick={openCreate} 
                            className="btn btn-primary py-2 px-5 text-xs font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-primary-200 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            Establish Coupon
                        </button>
                    )
                }
            >
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-2">
                    <CRMStatCard
                        label="Active Matrix"
                        value={coupons.filter(c => c.isActive && !isExpired(c) && !isLimitReached(c)).length}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        accent="bg-success-900 shadow-success-100"
                        trend={{ value: 'operational', label: 'status', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Retention Spend"
                        value={coupons.reduce((s, c) => s + (c.discountType === 'FIXED' ? c.discountValue * c.usedCount : 0), 0)}
                        icon={<IndianRupee className="w-5 h-5" />}
                        accent="bg-primary-900 shadow-primary-100"
                        isCurrency
                        trend={{ value: 'estimated', label: 'impact', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Usage Velocity"
                        value={coupons.reduce((s, c) => s + c.usedCount, 0)}
                        icon={<Activity className="w-5 h-5" />}
                        accent="bg-indigo-900 shadow-indigo-100"
                        trend={{ value: '+12%', label: 'vs last mo', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Dormant Units"
                        value={coupons.filter(c => !c.isActive || isExpired(c) || isLimitReached(c)).length}
                        icon={<AlertCircle className="w-5 h-5" />}
                        accent="bg-secondary-800 shadow-secondary-100"
                        trend={{ value: 'security', label: 'monitored', isPositive: false }}
                    />
                </div>

                {/* Filter Sub-Matrix */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 bg-secondary-900/5 p-1.5 rounded-2xl border border-secondary-200/40 backdrop-blur-sm">
                        {(['all', 'active', 'inactive'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterStatus(f)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    filterStatus === f 
                                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-200' 
                                    : 'text-secondary-500 hover:text-secondary-900 hover:bg-white'
                                }`}
                            >
                                {f === 'all' ? 'Universal' : f === 'active' ? 'Active' : 'Dormant'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inventory Matrix */}
                <div className="crm-card overflow-hidden">
                    <CRMTable>
                        <thead>
                            <tr className="bg-secondary-50/50">
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Unit Profile</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5 text-center">Benefit Matrix</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Usage Intensity</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Lifecycle sync</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Operational Scope</th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5">Status</th>
                                <th className="text-right text-[10px] font-black uppercase tracking-widest text-secondary-500 py-5 px-6">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-24">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 animate-pulse">Syncing promotion matrix...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-24">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                             <Ticket size={48} className="text-secondary-300 mb-4" />
                                             <p className="text-[10px] font-black uppercase tracking-widest text-secondary-500 italic">No available promotion parameters match</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(coupon => {
                                    const expired = isExpired(coupon);
                                    const limitReached = isLimitReached(coupon);
                                    const status = !coupon.isActive ? 'inactive' : expired ? 'expired' : limitReached ? 'exhausted' : 'active';
                                    
                                    return (
                                        <tr key={coupon.id} className="group hover:bg-secondary-50/30 transition-all border-l-4 border-transparent hover:border-primary-500">
                                            <td className="py-6">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 mb-1">
                                                         <Tag size={12} className="text-primary-500 opacity-60" />
                                                         <span className="font-black text-secondary-900 font-mono tracking-widest text-sm uppercase">{coupon.code}</span>
                                                    </div>
                                                    {coupon.description ? (
                                                        <span className="text-[9px] text-secondary-400 font-bold uppercase tracking-wider line-clamp-1 max-w-[180px]">{coupon.description}</span>
                                                    ) : (
                                                         <span className="text-[9px] text-secondary-300 font-bold uppercase tracking-wider italic">No description provided</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-primary-100/50">
                                                        {coupon.discountType === 'PERCENTAGE' ? <Percent size={12} /> : <IndianRupee size={12} />}
                                                        {coupon.discountValue}
                                                    </div>
                                                    {(coupon.minOrderValue ?? 0) > 0 && (
                                                        <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest mt-1.5 opacity-60">Min Order ₹{coupon.minOrderValue}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between items-center w-28 text-[9px] font-black uppercase tracking-widest">
                                                        <span className="text-secondary-800">{coupon.usedCount} used</span>
                                                        <span className="text-secondary-300">/ {coupon.usageLimit ?? '∞'}</span>
                                                    </div>
                                                    <div className="h-1 bg-secondary-100 rounded-full w-28 overflow-hidden shadow-inner uppercase tracking-widest">
                                                        {(coupon.usageLimit || 0) > 0 ? (
                                                            <div
                                                                className={`h-full transition-all duration-700 ${status === 'exhausted' ? 'bg-danger-500' : 'bg-primary-500 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]'}`}
                                                                style={{ width: `${Math.min(100, (coupon.usedCount / coupon.usageLimit!) * 100)}%` }}
                                                            />
                                                        ) : (
                                                            <div className="h-full bg-indigo-400 opacity-20 animate-pulse w-full" />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-secondary-500">
                                                        <div className="w-1 h-1 rounded-full bg-success-500" />
                                                        {new Date(coupon.validFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    {coupon.validUntil ? (
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-bold ${expired ? 'text-danger-600' : 'text-secondary-400'}`}>
                                                            <div className={`w-1 h-1 rounded-full ${expired ? 'bg-danger-500' : 'bg-secondary-300'}`} />
                                                            {new Date(coupon.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-secondary-300 uppercase tracking-[0.2em] pl-2.5">Indefinite</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-6">
                                                {coupon.brand ? (
                                                     <div className="flex items-center gap-2">
                                                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 select-none">
                                                               {coupon.brand.name.charAt(0)}
                                                          </div>
                                                          <div className="flex flex-col">
                                                               <span className="text-[10px] font-black text-secondary-800 uppercase tracking-tight">{coupon.brand.name}</span>
                                                               <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest">Brand Exclusive</span>
                                                          </div>
                                                     </div>
                                                ) : (
                                                     <div className="flex items-center gap-2 opacity-60">
                                                          <div className="w-8 h-8 rounded-xl bg-secondary-100 text-secondary-500 flex items-center justify-center border border-secondary-200">
                                                               <Globe size={12} />
                                                          </div>
                                                          <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Global Matrix</span>
                                                     </div>
                                                )}
                                            </td>
                                            <td className="py-6">
                                                <CRMBadge 
                                                    variant={status === 'active' ? 'success' : status === 'inactive' ? 'secondary' : status === 'expired' ? 'warning' : 'danger'}
                                                    dot
                                                >
                                                    {status.replace('-', ' ')}
                                                </CRMBadge>
                                            </td>
                                            <td className="py-6 px-6 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canManage && (
                                                        <>
                                                            <CRMRowAction onClick={() => openEdit(coupon)} title="Reconfigure Parameters">
                                                                <Edit size={16} />
                                                            </CRMRowAction>
                                                            <CRMRowAction 
                                                                onClick={() => toggleActive(coupon)} 
                                                                variant={coupon.isActive ? 'warning' : 'success'}
                                                                title={coupon.isActive ? 'Suspend Deployment' : 'Activate Deployment'}
                                                            >
                                                                {coupon.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                                                            </CRMRowAction>
                                                            <CRMRowAction onClick={() => handleDelete(coupon)} variant="danger" title="Purge Record">
                                                                <Trash2 size={16} />
                                                            </CRMRowAction>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </CRMTable>
                </div>
            </CRMPageShell>

            {/* Config Matrix Modal */}
            <CRMModal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editingCoupon ? 'Adjust Promotion Matrix' : 'Initialize New Campaign Unit'}
                subtitle={editingCoupon ? `Refining ${editingCoupon.code} logic parameters` : 'Establish a new promotional vector within the system architecture'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Identifier Protocol</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-300 group-focus-within:text-primary-500 transition-colors">
                                     <Tag size={18} />
                                </div>
                                <input 
                                    className="input pl-12 uppercase font-mono tracking-widest font-black text-sm p-3.5 bg-secondary-50 hover:bg-white focus:bg-white" 
                                    value={form.code} 
                                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} 
                                    placeholder="e.g. ALPHA2026" 
                                    required 
                                    maxLength={30} 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Evaluation Mode</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     <Layers size={18} />
                                </div>
                                <select 
                                    className="input pl-12 font-bold text-xs p-3.5 bg-secondary-50 hover:bg-white focus:bg-white cursor-pointer" 
                                    value={form.discountType} 
                                    onChange={e => setForm({ ...form, discountType: e.target.value as any })}
                                    title="Evaluation Mode"
                                >
                                    <option value="PERCENTAGE">Evaluation: Percentage (%)</option>
                                    <option value="FIXED">Evaluation: Fixed Fiat (₹)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Scalar Magnitude</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     {form.discountType === 'PERCENTAGE' ? <Percent size={18} /> : <IndianRupee size={18} />}
                                </div>
                                <input 
                                    className="input pl-12 font-black text-sm p-3.5 bg-secondary-50 hover:bg-white focus:bg-white" 
                                    type="number" min="0.01" max={form.discountType === 'PERCENTAGE' ? 100 : undefined} step="0.01"
                                    value={form.discountValue} 
                                    onChange={e => setForm({ ...form, discountValue: e.target.value })} 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Threshold Matrix (₹)</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     <Activity size={18} />
                                </div>
                                <input 
                                    className="input pl-12 font-black text-sm p-3.5 bg-secondary-50 hover:bg-white focus:bg-white" 
                                    type="number" min="0" step="1"
                                    value={form.minOrderValue} 
                                    onChange={e => setForm({ ...form, minOrderValue: e.target.value })} 
                                    placeholder="0 = Universal Threshold" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Business Logic (Description)</label>
                        <textarea 
                            className="input min-h-[100px] p-4 font-medium text-xs leading-relaxed bg-secondary-50 hover:bg-white focus:bg-white resize-none" 
                            value={form.description} 
                            onChange={e => setForm({ ...form, description: e.target.value })} 
                            placeholder="Detail the operational context and business logic for this deployment unit..." 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Initiation Phase</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     <Calendar size={18} />
                                </div>
                                <input className="input pl-12 font-bold text-xs p-3.5 bg-secondary-50 hover:bg-white focus:bg-white" type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Expiry Horizon</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                     <Clock size={18} />
                                </div>
                                <input className="input pl-12 font-bold text-xs p-3.5 bg-secondary-50 hover:bg-white focus:bg-white" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} min={form.validFrom} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] px-1">Operational Boundary (Brand Scope)</label>
                        <div className="relative group">
                             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                  <Globe size={18} />
                             </div>
                             <select 
                                className="input pl-12 font-bold text-xs p-3.5 bg-secondary-50 hover:bg-white focus:bg-white cursor-pointer" 
                                value={form.brandId} 
                                onChange={e => setForm({ ...form, brandId: e.target.value })}
                                title="Brand Scope"
                             >
                                <option value="">Global Deployment (Internal Network)</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>)}
                             </select>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-secondary-100/50">
                        <button 
                            type="button" 
                            onClick={() => setShowModal(false)} 
                            className="flex-1 px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 border border-secondary-200 transition-all font-mono"
                        >
                            Abandon
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="flex-1 bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
                        >
                            {saving ? 'Synchronizing...' : (
                                <>Confirm Matrix <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </form>
            </CRMModal>
        </DashboardLayout>
    );
}
