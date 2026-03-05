'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

// ─── Constants ─────────────────────────────────────────────────────────────
const CATEGORIES = [
    { value: 'JOURNAL_SUBSCRIPTION', label: 'Journal Subscription', icon: '📰', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'COURSE', label: 'Course', icon: '🎓', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'WORKSHOP', label: 'Workshop', icon: '🛠️', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { value: 'DOI_SERVICE', label: 'DOI Service', icon: '🔗', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { value: 'APC', label: 'APC', icon: '📝', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'CERTIFICATE', label: 'Certificate', icon: '🏅', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'DIGITAL_SERVICE', label: 'Digital Service', icon: '💻', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    { value: 'MISC', label: 'Miscellaneous', icon: '📦', color: 'bg-gray-50 text-gray-700 border-gray-200' },
] as const;

const PRICING_MODELS = [
    { value: 'FIXED', label: 'Fixed Price', icon: '💰', desc: 'Single fixed price per unit' },
    { value: 'TIERED', label: 'Tiered', icon: '📊', desc: 'Different price per quantity tier' },
    { value: 'VOLUME', label: 'Volume Discount', icon: '📉', desc: 'Price drops with higher volume' },
    { value: 'CUSTOM', label: 'Negotiated', icon: '🤝', desc: 'Price negotiated per deal' },
] as const;

const BILLING_CYCLES = [
    { value: 'ONE_TIME', label: 'One-Time' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'ANNUAL', label: 'Annual' },
];

interface PriceTier { minQty: number; maxQty?: number | null; priceINR: number; priceUSD: number; label?: string; }

interface InvoiceProduct {
    id: string;
    sku?: string;
    name: string;
    category: string;
    pricingModel: string;
    description?: string;
    shortDesc?: string;
    priceINR: number;
    priceUSD: number;
    priceTiers?: PriceTier[];
    taxRate: number;
    taxIncluded: boolean;
    hsnCode?: string;
    sacCode?: string;
    billingCycle?: string;
    unit: string;
    minQuantity: number;
    maxQuantity?: number;
    isActive: boolean;
    isFeatured: boolean;
    tags: string[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const FMT_INR = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);
const FMT_USD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const getCatConfig = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1];
const getPricingConfig = (val: string) => PRICING_MODELS.find(p => p.value === val) || PRICING_MODELS[0];

// ─── Empty form state ──────────────────────────────────────────────────────
const EMPTY_FORM = {
    name: '', category: 'MISC', pricingModel: 'FIXED', description: '', shortDesc: '',
    priceINR: 0, priceUSD: 0, taxRate: 18, taxIncluded: false,
    hsnCode: '', sacCode: '', billingCycle: 'ONE_TIME', unit: 'unit',
    minQuantity: 1, maxQuantity: '', sku: '', isActive: true, isFeatured: false,
    tags: '', notes: '', priceTiers: [{ minQty: 1, maxQty: '', priceINR: 0, priceUSD: 0, label: '' }],
};

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function InvoiceProductsPage() {
    const [products, setProducts] = useState<InvoiceProduct[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
    const [userRole, setUserRole] = useState('EXECUTIVE');

    // Filters
    const [q, setQ] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [pricingFilter, setPricingFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [featuredOnly, setFeaturedOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    // Selection (bulk ops)
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<InvoiceProduct | null>(null);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // FX converter
    const [fxRate, setFxRate] = useState(83.5); // INR per USD
    const [fxInput, setFxInput] = useState('');
    const [fxCurrency, setFxCurrency] = useState<'INR' | 'USD'>('INR');

    // Notifications
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    }, []);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        const r = localStorage.getItem('userRole');
        if (r) setUserRole(r);
    }, []);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page), pageSize: String(pageSize),
                sortBy, sortDir,
                ...(q && { q }),
                ...(categoryFilter && { category: categoryFilter }),
                ...(pricingFilter && { pricingModel: pricingFilter }),
                ...(activeFilter !== '' && { isActive: activeFilter }),
                ...(featuredOnly && { isFeatured: 'true' }),
            });
            const res = await fetch(`/api/invoice-products?${params}`, { headers: authH });
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(data.data || []);
            setTotal(data.pagination?.total || 0);
            setCategoryCounts(data.categoryCounts || {});
        } catch (e: any) {
            notify(e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, q, categoryFilter, pricingFilter, activeFilter, featuredOnly, sortBy, sortDir]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    // ── Form helpers ──────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (p: InvoiceProduct) => {
        setEditingProduct(p);
        setForm({
            name: p.name, category: p.category, pricingModel: p.pricingModel,
            description: p.description || '', shortDesc: p.shortDesc || '',
            priceINR: p.priceINR, priceUSD: p.priceUSD,
            taxRate: p.taxRate, taxIncluded: p.taxIncluded,
            hsnCode: p.hsnCode || '', sacCode: p.sacCode || '',
            billingCycle: p.billingCycle || 'ONE_TIME',
            unit: p.unit, minQuantity: p.minQuantity,
            maxQuantity: p.maxQuantity || '',
            sku: p.sku || '', isActive: p.isActive, isFeatured: p.isFeatured,
            tags: p.tags.join(', '), notes: p.notes || '',
            priceTiers: (p.priceTiers && p.priceTiers.length > 0)
                ? p.priceTiers.map(t => ({ ...t, maxQty: t.maxQty || '' }))
                : [{ minQty: 1, maxQty: '', priceINR: 0, priceUSD: 0, label: '' }],
        });
        setShowModal(true);
    };

    const buildPayload = () => ({
        name: form.name.trim(),
        category: form.category,
        pricingModel: form.pricingModel,
        description: form.description || null,
        shortDesc: form.shortDesc || null,
        priceINR: Number(form.priceINR) || 0,
        priceUSD: Number(form.priceUSD) || 0,
        taxRate: Number(form.taxRate) || 18,
        taxIncluded: form.taxIncluded,
        hsnCode: form.hsnCode || null,
        sacCode: form.sacCode || null,
        billingCycle: form.billingCycle || null,
        unit: form.unit || 'unit',
        minQuantity: Number(form.minQuantity) || 1,
        maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : null,
        sku: form.sku || null,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        notes: form.notes || null,
        priceTiers: form.pricingModel !== 'FIXED' && form.pricingModel !== 'CUSTOM'
            ? form.priceTiers.filter((t: any) => t.minQty > 0).map((t: any) => ({
                minQty: Number(t.minQty),
                maxQty: t.maxQty ? Number(t.maxQty) : null,
                priceINR: Number(t.priceINR) || 0,
                priceUSD: Number(t.priceUSD) || 0,
                label: t.label || null,
            }))
            : null,
    });

    const handleSave = async () => {
        if (!form.name.trim()) { notify('Product name is required', 'error'); return; }
        setSaving(true);
        try {
            const payload = buildPayload();
            const url = editingProduct ? `/api/invoice-products/${editingProduct.id}` : '/api/invoice-products';
            const method = editingProduct ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: authH, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Save failed');
            notify(editingProduct ? 'Product updated ✓' : 'Product created ✓');
            setShowModal(false);
            fetchProducts();
        } catch (e: any) {
            notify(e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/invoice-products/${id}`, { method: 'DELETE', headers: authH });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');
            notify('Product deleted');
            fetchProducts();
        } catch (e: any) {
            notify(e.message, 'error');
        } finally {
            setDeleting(null);
        }
    };

    const handleBulk = async (action: string) => {
        if (selected.size === 0) return;
        if (action === 'DELETE' && !confirm(`Delete ${selected.size} product(s)?`)) return;
        try {
            const res = await fetch('/api/invoice-products/bulk', {
                method: 'POST', headers: authH,
                body: JSON.stringify({ action, ids: Array.from(selected) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Bulk operation failed');
            notify(`${action}: ${data.affected} product(s) updated`);
            setSelected(new Set());
            fetchProducts();
        } catch (e: any) {
            notify(e.message, 'error');
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };
    const selectAll = () => {
        if (selected.size === products.length) { setSelected(new Set()); return; }
        setSelected(new Set(products.map(p => p.id)));
    };

    const totalPages = Math.ceil(total / pageSize);

    // FX conversion
    const fxConverted = fxInput
        ? fxCurrency === 'INR'
            ? Number(fxInput) / fxRate
            : Number(fxInput) * fxRate
        : null;

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <DashboardLayout userRole={userRole}>
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

                {/* Toast */}
                {toast && (
                    <div className={`fixed top-20 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 transition-all animate-in slide-in-from-right-4 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                        {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
                    </div>
                )}

                {/* ── Page header ────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            🗂️ Invoice Product Catalogue
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage billable products across all categories · Dual-currency INR & USD pricing
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* FX Rate adjuster */}
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            <span className="text-xs font-black text-amber-700 uppercase">USD→INR</span>
                            <input
                                type="number" step="0.01" min="1"
                                className="w-20 text-xs font-bold text-amber-900 bg-transparent border-none outline-none text-right"
                                value={fxRate}
                                onChange={e => setFxRate(parseFloat(e.target.value) || 83.5)}
                            />
                            <span className="text-xs text-amber-600">₹</span>
                        </div>
                        <button onClick={openCreate} className="btn btn-primary flex items-center gap-2">
                            <span>+</span> Add Product
                        </button>
                    </div>
                </div>

                {/* ── Category pills ──────────────────────────────────────── */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setCategoryFilter(''); setPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${categoryFilter === '' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}
                    >
                        All <span className="opacity-70">({total})</span>
                    </button>
                    {CATEGORIES.map(cat => {
                        const count = categoryCounts[cat.value] || 0;
                        return (
                            <button
                                key={cat.value}
                                onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${categoryFilter === cat.value ? 'ring-2 ring-offset-1 ring-primary-400 ' + cat.color.replace('bg-', 'bg-') : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                            >
                                {cat.icon} {cat.label} <span className="opacity-60">({count})</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Filters bar ─────────────────────────────────────────── */}
                <div className="card-premium">
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[220px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                            <input
                                className="input pl-9 text-sm w-full"
                                placeholder="Search by name, SKU, HSN/SAC code..."
                                value={q}
                                onChange={e => { setQ(e.target.value); setPage(1); }}
                            />
                        </div>

                        <select className="input text-sm w-40" value={pricingFilter} onChange={e => { setPricingFilter(e.target.value); setPage(1); }}>
                            <option value="">All Pricing</option>
                            {PRICING_MODELS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                        </select>

                        <select className="input text-sm w-36" value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}>
                            <option value="">All Status</option>
                            <option value="true">✅ Active</option>
                            <option value="false">⛔ Inactive</option>
                        </select>

                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:border-primary-300 transition-colors">
                            <input type="checkbox" checked={featuredOnly} onChange={e => { setFeaturedOnly(e.target.checked); setPage(1); }} className="accent-primary-600" />
                            ⭐ Featured only
                        </label>

                        <select className="input text-sm w-44" value={`${sortBy}:${sortDir}`} onChange={e => {
                            const [field, dir] = e.target.value.split(':');
                            setSortBy(field); setSortDir(dir); setPage(1);
                        }}>
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="name:asc">Name A→Z</option>
                            <option value="name:desc">Name Z→A</option>
                            <option value="priceINR:asc">Price ↑ (INR)</option>
                            <option value="priceINR:desc">Price ↓ (INR)</option>
                        </select>

                        {(q || categoryFilter || pricingFilter || activeFilter || featuredOnly) && (
                            <button onClick={() => { setQ(''); setCategoryFilter(''); setPricingFilter(''); setActiveFilter(''); setFeaturedOnly(false); setPage(1); }}
                                className="text-xs text-red-500 hover:text-red-700 font-bold">
                                ✕ Clear filters
                            </button>
                        )}
                    </div>

                    {/* Bulk actions */}
                    {selected.size > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
                                {selected.size} selected
                            </span>
                            <button onClick={() => handleBulk('ACTIVATE')} className="text-xs px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-bold">✅ Activate</button>
                            <button onClick={() => handleBulk('DEACTIVATE')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold">⛔ Deactivate</button>
                            <button onClick={() => handleBulk('FEATURE')} className="text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold">⭐ Feature</button>
                            <button onClick={() => handleBulk('UNFEATURE')} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold">☆ Unfeature</button>
                            <button onClick={() => handleBulk('DELETE')} className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold ml-auto">🗑️ Delete</button>
                            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-600">✕ Deselect all</button>
                        </div>
                    )}
                </div>

                {/* ── FX Converter widget ───────────────────────────────── */}
                <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-900 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                    <div>
                        <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">Real-time FX Converter</p>
                        <p className="text-xs text-indigo-400 mt-0.5">1 USD = {fxRate.toFixed(2)} INR (editable above)</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 text-sm font-bold">
                                {fxCurrency === 'INR' ? '₹' : '$'}
                            </span>
                            <input
                                type="number" min="0" step="0.01"
                                className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/30"
                                placeholder="Enter amount..."
                                value={fxInput}
                                onChange={e => setFxInput(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold focus:outline-none"
                            value={fxCurrency}
                            onChange={e => setFxCurrency(e.target.value as 'INR' | 'USD')}
                        >
                            <option value="INR">INR ₹</option>
                            <option value="USD">USD $</option>
                        </select>
                        <span className="text-white/40 text-lg">→</span>
                        <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 min-w-[140px]">
                            {fxConverted !== null ? (
                                <div>
                                    <p className="text-white font-black text-base">
                                        {fxCurrency === 'INR' ? `$${fxConverted.toFixed(2)}` : `₹${fxConverted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                                    </p>
                                    <p className="text-indigo-300 text-[10px]">{fxCurrency === 'INR' ? 'USD' : 'INR'}</p>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm">—</p>
                            )}
                        </div>
                    </div>
                    <div className="ml-auto flex gap-4 text-right">
                        <div>
                            <p className="text-[10px] text-indigo-400 uppercase font-black">Active Products</p>
                            <p className="text-xl font-black text-white">{products.filter(p => p.isActive).length}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-indigo-400 uppercase font-black">Total Catalogue</p>
                            <p className="text-xl font-black text-white">{total}</p>
                        </div>
                    </div>
                </div>

                {/* ── Product Table ──────────────────────────────────────── */}
                <div className="card-premium overflow-hidden !p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-4">🗂️</div>
                            <p className="text-gray-500 font-medium">No products found</p>
                            <p className="text-sm text-gray-400 mt-1 mb-5">Try adjusting your filters or add a new product</p>
                            <button onClick={openCreate} className="btn btn-primary">Add First Product</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="p-3 w-10">
                                            <input type="checkbox" checked={selected.size === products.length && products.length > 0}
                                                onChange={selectAll} className="accent-primary-600 w-4 h-4" />
                                        </th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Product</th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Category</th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Pricing</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Price INR</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Price USD</th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Billing</th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Tax</th>
                                        <th className="text-left p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Status</th>
                                        <th className="text-right p-3 text-xs font-black uppercase text-gray-400 tracking-tight">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => {
                                        const catCfg = getCatConfig(p.category);
                                        const priceCfg = getPricingConfig(p.pricingModel);
                                        const usdInINR = p.priceUSD * fxRate;

                                        return (
                                            <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selected.has(p.id) ? 'bg-primary-50/30' : ''}`}>
                                                <td className="p-3">
                                                    <input type="checkbox" checked={selected.has(p.id)}
                                                        onChange={() => toggleSelect(p.id)} className="accent-primary-600 w-4 h-4" />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {p.isFeatured && <span className="text-amber-400 text-xs">⭐</span>}
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-gray-900 truncate max-w-[240px]">{p.name}</p>
                                                            {p.sku && <p className="text-[10px] text-gray-400 font-mono">{p.sku}</p>}
                                                            {p.shortDesc && <p className="text-xs text-gray-500 truncate max-w-[240px]">{p.shortDesc}</p>}
                                                            {p.tags.length > 0 && (
                                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                                    {p.tags.slice(0, 3).map(t => (
                                                                        <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                                                                            {t}
                                                                        </span>
                                                                    ))}
                                                                    {p.tags.length > 3 && <span className="text-[9px] text-gray-400">+{p.tags.length - 3}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${catCfg.color}`}>
                                                        {catCfg.icon} {catCfg.label}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                                        {priceCfg.icon} {priceCfg.label}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <p className="font-black text-gray-900">{FMT_INR(p.priceINR)}</p>
                                                    {p.priceUSD > 0 && (
                                                        <p className="text-[10px] text-gray-400">
                                                            ≈ {FMT_INR(usdInINR)} <span className="text-gray-300">(from $)</span>
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <p className="font-black text-gray-900">{FMT_USD(p.priceUSD)}</p>
                                                    {p.priceINR > 0 && (
                                                        <p className="text-[10px] text-gray-400">
                                                            ≈ {FMT_USD(p.priceINR / fxRate)} <span className="text-gray-300">(from ₹)</span>
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        {p.billingCycle ? BILLING_CYCLES.find(b => b.value === p.billingCycle)?.label : '—'}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 capitalize">per {p.unit}</p>
                                                </td>
                                                <td className="p-3">
                                                    <p className="text-xs font-bold text-gray-700">{p.taxRate}%</p>
                                                    {p.taxIncluded && <p className="text-[10px] text-gray-400">incl.</p>}
                                                    {p.hsnCode && <p className="text-[10px] text-gray-400 font-mono">HSN {p.hsnCode}</p>}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${p.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                        {p.isActive ? '● Active' : '○ Inactive'}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openEdit(p)}
                                                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                                                            ✏️
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id, p.name)}
                                                            disabled={deleting === p.id}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                            {deleting === p.id ? '⏳' : '🗑️'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="btn btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-40">← Prev</button>
                                <span className="px-3 py-1.5 text-xs font-bold text-gray-700">
                                    {page} / {totalPages}
                                </span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="btn btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-40">Next →</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Create / Edit Modal ──────────────────────────────── */}
                {showModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-8">

                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">
                                        {editingProduct ? `✏️ Edit: ${editingProduct.name}` : '➕ New Invoice Product'}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {editingProduct ? 'Update product details and pricing' : 'Add a billable product to the catalogue'}
                                    </p>
                                </div>
                                <button onClick={() => setShowModal(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">✕</button>
                            </div>

                            <div className="p-6 space-y-6">

                                {/* Name + SKU */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Product Name <span className="text-red-500">*</span></label>
                                        <input className="input" placeholder="e.g. Physics Journal — Annual Subscription"
                                            value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label">SKU / Code</label>
                                        <input className="input font-mono text-sm" placeholder="e.g. JNL-PHY-ANN"
                                            value={form.sku} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} />
                                    </div>
                                </div>

                                {/* Category + Pricing Model + Billing */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="label">Category</label>
                                        <select className="input" value={form.category}
                                            onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Pricing Model</label>
                                        <select className="input" value={form.pricingModel}
                                            onChange={e => setForm((f: any) => ({ ...f, pricingModel: e.target.value }))}>
                                            {PRICING_MODELS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">{getPricingConfig(form.pricingModel).desc}</p>
                                    </div>
                                    <div>
                                        <label className="label">Billing Cycle</label>
                                        <select className="input" value={form.billingCycle}
                                            onChange={e => setForm((f: any) => ({ ...f, billingCycle: e.target.value }))}>
                                            {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Dual-currency pricing */}
                                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-xl p-4">
                                    <h3 className="text-xs font-black uppercase text-gray-600 mb-3 tracking-widest">💱 Dual-Currency Pricing</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Base Price (INR ₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                                <input type="number" min="0" step="0.01" className="input pl-7"
                                                    value={form.priceINR}
                                                    onChange={e => {
                                                        const inr = parseFloat(e.target.value) || 0;
                                                        setForm((f: any) => ({
                                                            ...f, priceINR: inr,
                                                            priceUSD: f.priceUSD === 0 ? parseFloat((inr / fxRate).toFixed(2)) : f.priceUSD
                                                        }));
                                                    }} />
                                            </div>
                                            {form.priceINR > 0 && (
                                                <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                                                    ≈ {FMT_USD(form.priceINR / fxRate)} USD
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">Base Price (USD $)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                <input type="number" min="0" step="0.01" className="input pl-7"
                                                    value={form.priceUSD}
                                                    onChange={e => {
                                                        const usd = parseFloat(e.target.value) || 0;
                                                        setForm((f: any) => ({
                                                            ...f, priceUSD: usd,
                                                            priceINR: f.priceINR === 0 ? parseFloat((usd * fxRate).toFixed(2)) : f.priceINR
                                                        }));
                                                    }} />
                                            </div>
                                            {form.priceUSD > 0 && (
                                                <p className="text-[10px] text-blue-600 mt-1 font-bold">
                                                    ≈ {FMT_INR(form.priceUSD * fxRate)} INR
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-3">
                                        <button type="button"
                                            onClick={() => setForm((f: any) => ({ ...f, priceUSD: parseFloat((f.priceINR / fxRate).toFixed(2)) }))}
                                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg transition-colors">
                                            ₹→$ Auto-fill USD
                                        </button>
                                        <button type="button"
                                            onClick={() => setForm((f: any) => ({ ...f, priceINR: parseFloat((f.priceUSD * fxRate).toFixed(2)) }))}
                                            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors">
                                            $→₹ Auto-fill INR
                                        </button>
                                        <span className="text-[10px] text-gray-400 ml-1">at ₹{fxRate}/USD</span>
                                    </div>
                                </div>

                                {/* Tiered pricing */}
                                {(form.pricingModel === 'TIERED' || form.pricingModel === 'VOLUME') && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="label mb-0">📊 Price Tiers</label>
                                            <button type="button"
                                                onClick={() => setForm((f: any) => ({ ...f, priceTiers: [...f.priceTiers, { minQty: 1, maxQty: '', priceINR: 0, priceUSD: 0, label: '' }] }))}
                                                className="text-xs text-primary-600 font-bold hover:text-primary-800">
                                                + Add Tier
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-gray-400 px-1">
                                                <div className="col-span-2">Min Qty</div>
                                                <div className="col-span-2">Max Qty</div>
                                                <div className="col-span-3">Price INR ₹</div>
                                                <div className="col-span-3">Price USD $</div>
                                                <div className="col-span-1">Label</div>
                                                <div className="col-span-1" />
                                            </div>
                                            {form.priceTiers.map((tier: any, i: number) => (
                                                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl">
                                                    <div className="col-span-2">
                                                        <input type="number" min="1" className="input !py-1.5 text-sm text-center"
                                                            value={tier.minQty}
                                                            onChange={e => {
                                                                const t = [...form.priceTiers];
                                                                t[i] = { ...t[i], minQty: parseInt(e.target.value) || 1 };
                                                                setForm((f: any) => ({ ...f, priceTiers: t }));
                                                            }} />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input type="number" min="1" className="input !py-1.5 text-sm text-center"
                                                            placeholder="∞"
                                                            value={tier.maxQty}
                                                            onChange={e => {
                                                                const t = [...form.priceTiers];
                                                                t[i] = { ...t[i], maxQty: e.target.value };
                                                                setForm((f: any) => ({ ...f, priceTiers: t }));
                                                            }} />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input type="number" min="0" className="input !py-1.5 text-sm text-right"
                                                            value={tier.priceINR}
                                                            onChange={e => {
                                                                const t = [...form.priceTiers];
                                                                t[i] = { ...t[i], priceINR: parseFloat(e.target.value) || 0 };
                                                                setForm((f: any) => ({ ...f, priceTiers: t }));
                                                            }} />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input type="number" min="0" className="input !py-1.5 text-sm text-right"
                                                            value={tier.priceUSD}
                                                            onChange={e => {
                                                                const t = [...form.priceTiers];
                                                                t[i] = { ...t[i], priceUSD: parseFloat(e.target.value) || 0 };
                                                                setForm((f: any) => ({ ...f, priceTiers: t }));
                                                            }} />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <input className="input !py-1.5 text-xs" placeholder="label"
                                                            value={tier.label}
                                                            onChange={e => {
                                                                const t = [...form.priceTiers];
                                                                t[i] = { ...t[i], label: e.target.value };
                                                                setForm((f: any) => ({ ...f, priceTiers: t }));
                                                            }} />
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        {form.priceTiers.length > 1 && (
                                                            <button type="button"
                                                                onClick={() => setForm((f: any) => ({ ...f, priceTiers: f.priceTiers.filter((_: any, idx: number) => idx !== i) }))}
                                                                className="text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tax config */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="label">Tax Rate (%)</label>
                                        <input type="number" min="0" max="100" step="0.5" className="input"
                                            value={form.taxRate}
                                            onChange={e => setForm((f: any) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="accent-primary-600 w-4 h-4"
                                                checked={form.taxIncluded}
                                                onChange={e => setForm((f: any) => ({ ...f, taxIncluded: e.target.checked }))} />
                                            <span className="text-sm font-medium text-gray-700">Tax Included</span>
                                        </label>
                                    </div>
                                    <div>
                                        <label className="label">HSN Code</label>
                                        <input className="input font-mono text-sm" placeholder="e.g. 4902"
                                            value={form.hsnCode}
                                            onChange={e => setForm((f: any) => ({ ...f, hsnCode: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label">SAC Code</label>
                                        <input className="input font-mono text-sm" placeholder="e.g. 998596"
                                            value={form.sacCode}
                                            onChange={e => setForm((f: any) => ({ ...f, sacCode: e.target.value }))} />
                                    </div>
                                </div>

                                {/* Unit + Qty */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="label">Unit</label>
                                        <input className="input" placeholder="e.g. year, article, user"
                                            value={form.unit}
                                            onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label">Min Quantity</label>
                                        <input type="number" min="1" className="input"
                                            value={form.minQuantity}
                                            onChange={e => setForm((f: any) => ({ ...f, minQuantity: parseInt(e.target.value) || 1 }))} />
                                    </div>
                                    <div>
                                        <label className="label">Max Quantity <span className="text-gray-400 text-xs">(optional)</span></label>
                                        <input type="number" min="1" className="input" placeholder="unlimited"
                                            value={form.maxQuantity}
                                            onChange={e => setForm((f: any) => ({ ...f, maxQuantity: e.target.value }))} />
                                    </div>
                                </div>

                                {/* Descriptions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Short Description</label>
                                        <input className="input" placeholder="Brief one-liner (shown in lists)"
                                            value={form.shortDesc}
                                            onChange={e => setForm((f: any) => ({ ...f, shortDesc: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="label">Tags <span className="text-gray-400 text-xs">(comma-separated)</span></label>
                                        <input className="input" placeholder="e.g. physics, open-access, 2025"
                                            value={form.tags}
                                            onChange={e => setForm((f: any) => ({ ...f, tags: e.target.value }))} />
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Full Description</label>
                                    <textarea className="input h-20" placeholder="Detailed product description..."
                                        value={form.description}
                                        onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
                                </div>

                                {/* Status toggles */}
                                <div className="flex items-center gap-6 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                            onClick={() => setForm((f: any) => ({ ...f, isActive: !f.isActive }))}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </div>
                                        <span className={`text-sm font-bold ${form.isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                                            {form.isActive ? '✅ Active' : '⛔ Inactive'}
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`relative w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-amber-500' : 'bg-gray-300'}`}
                                            onClick={() => setForm((f: any) => ({ ...f, isFeatured: !f.isFeatured }))}>
                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </div>
                                        <span className={`text-sm font-bold ${form.isFeatured ? 'text-amber-700' : 'text-gray-500'}`}>
                                            {form.isFeatured ? '⭐ Featured' : '☆ Not Featured'}
                                        </span>
                                    </label>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="label">Internal Notes</label>
                                    <textarea className="input h-16" placeholder="Internal notes (not shown to customers)..."
                                        value={form.notes}
                                        onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn btn-primary px-10">
                                    {saving ? '⏳ Saving...' : editingProduct ? '💾 Save Changes' : '✅ Create Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
