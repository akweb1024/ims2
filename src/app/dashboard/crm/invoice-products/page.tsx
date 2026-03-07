'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
    CRMPageShell, 
    CRMStatCard, 
    CRMModal, 
    CRMBadge 
} from '@/components/crm/CRMPageShell';
import { 
    Search, Filter, Plus, ChevronRight, Zap, Target,
    Layers, Layout, ShieldCheck, CreditCard, Globe,
    ArrowRight, Star, Trash2, Edit3, MoreHorizontal,
    BarChart3, Settings2, Sparkles, Box, Info,
    CheckCircle2, DollarSign, Calculator, Activity
} from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import VariantAdminPanel from '@/components/dashboard/crm/VariantAdminPanel';

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
    type: string;
    basePrice: number | null;
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
    productAttributes?: any[];
    variants?: any[];
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
    name: '', type: 'SIMPLE', basePrice: 0, category: 'MISC', pricingModel: 'FIXED', description: '', shortDesc: '',
    priceINR: 0, priceUSD: 0, taxRate: 18, taxIncluded: false,
    hsnCode: '', sacCode: '', billingCycle: 'ONE_TIME', unit: 'unit',
    minQuantity: 1, maxQuantity: '', sku: '', isActive: true, isFeatured: false,
    tags: '', notes: '', priceTiers: [{ minQty: 1, maxQty: '', priceINR: 0, priceUSD: 0, label: '' }],
    productAttributes: [], variants: [],
};

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

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<InvoiceProduct | null>(null);
    const [form, setForm] = useState<any>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [globalAttributes, setGlobalAttributes] = useState<any[]>([]);

    // FX converter
    const [fxRate, setFxRate] = useState(83.5);
    const [fxInput, setFxInput] = useState('');
    const [fxCurrency, setFxCurrency] = useState<'INR' | 'USD'>('INR');

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    // Memoize authH so its reference is stable between renders —
    // without this, authH causes fetchProducts/fetchAttributes to re-create
    // on EVERY render, spawning an infinite useEffect loop.
    const authH = useMemo(
        () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [token]
    );

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
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, q, categoryFilter, pricingFilter, activeFilter, featuredOnly, sortBy, sortDir, authH]);

    const fetchAttributes = useCallback(async () => {
        try {
            const res = await fetch('/api/invoice-products/attributes', { headers: authH });
            if (res.ok) setGlobalAttributes(await res.json());
        } catch (e) {
            console.error('Failed to fetch attributes', e);
        }
    }, [authH]);

    useEffect(() => { fetchProducts(); fetchAttributes(); }, [fetchProducts, fetchAttributes]);

    const openCreate = () => {
        setEditingProduct(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (p: InvoiceProduct) => {
        setEditingProduct(p);
        setForm({
            name: p.name, type: p.type || 'SIMPLE', basePrice: p.basePrice || 0, category: p.category, pricingModel: p.pricingModel,
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
            productAttributes: p.productAttributes || [],
            variants: p.variants || [],
        });
        setShowModal(true);
    };

    const buildPayload = () => ({
        name: form.name.trim(),
        type: form.type,
        basePrice: form.type === 'VARIABLE' ? Number(form.priceINR) || 0 : null,
        category: form.category,
        pricingModel: form.pricingModel,
        description: form.description || null,
        shortDesc: form.shortDesc || null,
        priceINR: form.type === 'VARIABLE' ? null : (Number(form.priceINR) || 0),
        priceUSD: form.type === 'VARIABLE' ? null : (Number(form.priceUSD) || 0),
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
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = buildPayload();
            const url = editingProduct ? `/api/invoice-products/${editingProduct.id}` : '/api/invoice-products';
            const method = editingProduct ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: authH, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Save failed');
            setShowModal(false);
            fetchProducts();
        } catch (e: any) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/invoice-products/${id}`, { method: 'DELETE', headers: authH });
            if (!res.ok) throw new Error('Delete failed');
            fetchProducts();
        } catch (e: any) {
            console.error(e);
        } finally {
            setDeleting(null);
        }
    };

    const handleBulk = async (action: string) => {
        if (selected.size === 0) return;
        try {
            await fetch('/api/invoice-products/bulk', {
                method: 'POST', headers: authH,
                body: JSON.stringify({ action, ids: Array.from(selected) }),
            });
            setSelected(new Set());
            fetchProducts();
        } catch (e: any) {
            console.error(e);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id);
            else s.add(id);
            return s;
        });
    };
    const selectAll = () => {
        if (selected.size === products.length) { setSelected(new Set()); return; }
        setSelected(new Set(products.map(p => p.id)));
    };

    const totalPages = Math.ceil(total / pageSize);

    const fxConverted = fxInput
        ? fxCurrency === 'INR'
            ? Number(fxInput) / fxRate
            : Number(fxInput) * fxRate
        : null;

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Invoice Product Catalogue"
                subtitle="Manage billable products, courses, and tactical services across dual-currency domains."
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Product Registry' }
                ]}
                icon={<Box className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-3">
                         <div className="hidden lg:flex items-center gap-3 bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-secondary-200">
                             <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400">USD Protocol</span>
                             <div className="flex items-center gap-1.5 font-black text-xs text-primary-600">
                                 <span>1 USD = ₹</span>
                                 <input
                                     type="number" step="0.01"
                                     className="w-16 bg-transparent outline-none focus:ring-0"
                                     value={fxRate}
                                     onChange={e => setFxRate(parseFloat(e.target.value) || 83.5)}
                                 />
                             </div>
                         </div>
                         <button 
                            onClick={openCreate} 
                            className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            Initialize Product
                        </button>
                    </div>
                }
            >
                {/* Global Statistics Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CRMStatCard
                        label="Total Assets"
                        value={total}
                        icon={<Layers size={22} />}
                        accent="bg-primary-950 text-white shadow-primary-100"
                        trend={{ value: 'Real-time', label: 'sync active', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Active Status"
                        value={products.filter(p => p.isActive).length}
                        icon={<ShieldCheck size={22} />}
                        accent="bg-emerald-900 text-white shadow-emerald-100"
                        trend={{ value: 'Identity', label: 'verified', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Featured Nodes"
                        value={products.filter(p => p.isFeatured).length}
                        icon={<Sparkles size={22} />}
                        accent="bg-amber-900 text-white shadow-amber-100"
                        trend={{ value: 'Promotion', label: 'ready', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Asset Valuation"
                        value="Dual-FX"
                        icon={<DollarSign size={22} />}
                        accent="bg-indigo-900 text-white shadow-indigo-100"
                        trend={{ value: 'Multi-domain', label: 'parity', isPositive: true }}
                    />
                </div>

                {/* Tactical FX Engine */}
                <div className="mt-8 bg-secondary-950 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />
                     <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                          <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                                    <Calculator size={32} />
                               </div>
                               <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic leading-none">Valuation Parity Engine</h3>
                                    <p className="text-[9px] font-black text-primary-400 uppercase tracking-[0.4em] mt-2">Real-time Cross-Domain Currency Translation</p>
                               </div>
                          </div>

                          <div className="flex items-center gap-4 flex-1 max-w-2xl w-full">
                               <div className="relative flex-1 group/input">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-black text-lg group-focus-within/input:text-white transition-colors">
                                        {fxCurrency === 'INR' ? '₹' : '$'}
                                    </span>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 h-16 rounded-[1.2rem] pl-10 pr-6 text-white font-black text-lg focus:outline-none focus:bg-white/10 focus:ring-primary-500/20 transition-all placeholder-white/20"
                                        placeholder="Input amount..."
                                        value={fxInput}
                                        onChange={e => setFxInput(e.target.value)}
                                    />
                               </div>
                               <select
                                    className="h-16 px-6 bg-white/5 border border-white/10 rounded-[1.2rem] text-white font-black text-xs uppercase tracking-widest focus:outline-none cursor-pointer"
                                    value={fxCurrency}
                                    onChange={e => setFxCurrency(e.target.value as 'INR' | 'USD')}
                                >
                                    <option value="INR">INR Hub</option>
                                    <option value="USD">USD Hub</option>
                                </select>
                                <div className="hidden sm:flex items-center justify-center w-12 text-primary-400">
                                     <ArrowRight size={24} className="animate-pulse" />
                                </div>
                                <div className="bg-primary-600 px-8 h-16 rounded-[1.2rem] flex flex-col justify-center min-w-[180px] shadow-2xl shadow-primary-900/50">
                                     {fxConverted !== null ? (
                                         <>
                                             <p className="text-white font-black text-xl italic tracking-tight">
                                                 {fxCurrency === 'INR' ? `$${fxConverted.toFixed(2)}` : `₹${fxConverted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                                             </p>
                                             <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-0.5">{fxCurrency === 'INR' ? 'USD PROJECTION' : 'INR PROJECTION'}</p>
                                         </>
                                     ) : (
                                         <p className="text-white/20 font-black text-lg tracking-widest uppercase">Parity Null</p>
                                     )}
                                </div>
                          </div>
                     </div>
                </div>

                {/* Operations bar */}
                <div className="mt-12 space-y-8">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-secondary-100 pb-8">
                        <div className="flex flex-wrap gap-2">
                             <button
                                onClick={() => { setCategoryFilter(''); setPage(1); }}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${categoryFilter === '' ? 'bg-secondary-950 text-white border-secondary-950 shadow-xl' : 'bg-white text-secondary-500 border-secondary-200 hover:border-primary-300'}`}
                            >
                                Universal Matrix <span className="ml-2 opacity-40">[{total}]</span>
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${categoryFilter === cat.value ? 'bg-primary-600 text-white border-primary-600 shadow-xl' : 'bg-white text-secondary-500 border-secondary-200 hover:shadow-lg'}`}
                                >
                                    {cat.icon} {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                             <div className="relative group">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors" size={18} />
                                  <input
                                      className="h-12 w-full sm:w-[320px] bg-secondary-50 border-secondary-100 rounded-2xl pl-12 pr-6 text-sm font-bold text-secondary-950 placeholder-secondary-300 focus:bg-white focus:ring-primary-500/20 transition-all border focus:border-primary-100"
                                      placeholder="Search identity node..."
                                      value={q}
                                      onChange={e => { setQ(e.target.value); setPage(1); }}
                                  />
                             </div>
                             <div className="flex items-center gap-2 p-1 bg-secondary-100 rounded-xl">
                                  <button onClick={() => setSortBy('name')} className={`p-2 rounded-lg transition-all ${sortBy === 'name' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>
                                       <BarChart3 size={18} />
                                  </button>
                                  <button onClick={() => setSortBy('createdAt')} className={`p-2 rounded-lg transition-all ${sortBy === 'createdAt' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>
                                       <Activity size={18} />
                                  </button>
                             </div>
                        </div>
                    </div>

                    {/* Bulk Matrix Actions */}
                    {selected.size > 0 && (
                        <div className="bg-primary-50 p-4 px-6 rounded-3xl border border-primary-100 flex items-center justify-between animate-in slide-in-from-top-4">
                            <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                      {selected.size}
                                 </div>
                                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-900 italic">Nodes selected for bulk propagation</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleBulk('ACTIVATE')} className="px-5 py-2 rounded-xl bg-white text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm">Protocol: Activate</button>
                                <button onClick={() => handleBulk('FEATURE')} className="px-5 py-2 rounded-xl bg-white text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all shadow-sm">Flag: Featured</button>
                                <button onClick={() => handleBulk('DELETE')} className="px-5 py-2 rounded-xl bg-white text-danger-600 border border-danger-100 text-[9px] font-black uppercase tracking-widest hover:bg-danger-50 transition-all shadow-sm">Operation: Purge</button>
                            </div>
                        </div>
                    )}

                    {/* Registry Flux */}
                    <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 overflow-hidden relative">
                         {loading ? (
                             <div className="py-40 flex flex-col items-center justify-center">
                                  <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary-300 mt-6">Decrypting registry...</span>
                             </div>
                         ) : products.length === 0 ? (
                             <div className="py-40 text-center group">
                                  <div className="w-24 h-24 bg-secondary-50 text-secondary-200 border border-secondary-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 group-hover:rotate-12 transition-transform duration-1000">
                                       <Box size={48} strokeWidth={1} />
                                  </div>
                                  <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">Registry Node Empty</h3>
                                  <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.3em] mt-3">No asset parameters found in the current sector mapping.</p>
                             </div>
                         ) : (
                             <div className="overflow-x-auto overflow-y-hidden">
                                 <table className="w-full text-left">
                                     <thead>
                                         <tr className="bg-secondary-50/50 border-b border-secondary-100">
                                             <th className="p-8 py-5 w-16">
                                                 <input 
                                                     type="checkbox" 
                                                     checked={selected.size === products.length && products.length > 0}
                                                     onChange={selectAll} 
                                                     className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                                                 />
                                             </th>
                                             <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Identity Node</th>
                                             <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic">Sub-Sector</th>
                                             <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-right">INR Valuation</th>
                                             <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-right">USD Valuation</th>
                                             <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-center">Protocol Status</th>
                                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-secondary-400 italic text-right">Operations</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-secondary-50">
                                         {products.map(p => {
                                             const catCfg = getCatConfig(p.category);
                                             return (
                                                 <tr key={p.id} className={`group hover:bg-secondary-50/50 transition-all duration-500 ${selected.has(p.id) ? 'bg-primary-50/30' : ''}`}>
                                                     <td className="p-8 py-6">
                                                         <input 
                                                             type="checkbox" 
                                                             checked={selected.has(p.id)}
                                                             onChange={() => toggleSelect(p.id)} 
                                                             className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer" 
                                                         />
                                                     </td>
                                                     <td className="px-6 py-6">
                                                          <div className="flex flex-col min-w-[200px]">
                                                               <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-black text-secondary-950 uppercase tracking-tight italic group-hover:text-primary-600 transition-colors">{p.name}</span>
                                                                    {p.isFeatured && <Star size={12} className="text-amber-500 fill-amber-500 animate-pulse" />}
                                                               </div>
                                                               <div className="flex items-center gap-3">
                                                                    <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest">SKU: {p.sku || 'NULL_NODE'}</span>
                                                                    <span className="h-1 w-1 bg-secondary-200 rounded-full" />
                                                                    <span className="text-[9px] font-black text-secondary-300 uppercase tracking-widest">{p.unit} unit</span>
                                                               </div>
                                                          </div>
                                                     </td>
                                                     <td className="px-6 py-6 font-black uppercase">
                                                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest border ${catCfg.color.replace('opacity-10', 'border-opacity-30')}`}>
                                                               {catCfg.label}
                                                          </span>
                                                     </td>
                                                     <td className="px-6 py-6 text-right">
                                                          <span className="font-black text-secondary-950 text-base italic">{FMT_INR(p.priceINR)}</span>
                                                          <p className="text-[8px] font-black text-secondary-400 uppercase tracking-widest mt-1">DOMESTIC COORDINATES</p>
                                                     </td>
                                                     <td className="px-6 py-6 text-right">
                                                          <span className="font-black text-indigo-700 text-base italic">{FMT_USD(p.priceUSD)}</span>
                                                          <p className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mt-1">GLOBAL PARITY</p>
                                                     </td>
                                                     <td className="px-6 py-6 text-center">
                                                          <CRMBadge 
                                                               variant={p.isActive ? 'success' : 'secondary'} 
                                                               className="text-[9px] font-black border-none uppercase tracking-[0.2em] italic"
                                                               dot
                                                          >
                                                               {p.isActive ? 'ACTIVE_PROT' : 'STANDBY'}
                                                          </CRMBadge>
                                                     </td>
                                                     <td className="px-8 py-6 text-right">
                                                          <div className="flex items-center justify-end gap-2">
                                                               <button 
                                                                    onClick={() => openEdit(p)}
                                                                    className="p-3 bg-white border border-secondary-100 rounded-xl text-secondary-400 hover:text-primary-600 hover:border-primary-100 hover:shadow-lg transition-all"
                                                               >
                                                                    <Edit3 size={16} />
                                                               </button>
                                                               <button 
                                                                    onClick={() => handleDelete(p.id, p.name)}
                                                                    className="p-3 bg-white border border-secondary-100 rounded-xl text-secondary-400 hover:text-danger-600 hover:border-danger-100 hover:shadow-lg transition-all"
                                                               >
                                                                    <Trash2 size={16} />
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

                         {/* Registry Pagination */}
                         {totalPages > 1 && (
                             <div className="p-8 border-t border-secondary-100 flex items-center justify-between bg-secondary-50/30">
                                 <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em]">
                                     Mapping {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} <span className="mx-1 text-secondary-200">/</span> Total Registry Nodes: {total}
                                 </p>
                                 <div className="flex items-center gap-4">
                                     <button 
                                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                                        disabled={page === 1}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-secondary-200 text-secondary-400 hover:text-primary-600 disabled:opacity-20 transition-all font-black"
                                    >
                                         <ChevronRight size={18} className="rotate-180" />
                                    </button>
                                     <span className="text-xs font-black text-secondary-900 uppercase tracking-widest italic">Sector {page} <span className="mx-2 text-secondary-200">OF</span> {totalPages}</span>
                                     <button 
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                        disabled={page === totalPages}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-secondary-200 text-secondary-400 hover:text-primary-600 disabled:opacity-20 transition-all font-black"
                                    >
                                         <ChevronRight size={18} />
                                    </button>
                                 </div>
                             </div>
                         )}
                    </div>
                </div>

                {/* Registry Architect Modal */}
                <CRMModal
                    open={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingProduct ? "Modify Registry Node" : "Initialize Asset Node"}
                    subtitle="Define identity, valuation parity, and operational parameters for the product registry."
                >
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-8 py-2">
                        {/* Primary Intel */}
                        <div className="bg-secondary-950 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                             <div className="absolute -right-4 -bottom-4 opacity-5 blur-sm rotate-12">
                                  <Box size={140} className="text-white" />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                  <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 pl-1">Product Designation</label>
                                       <input 
                                           className="input h-14 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-tight focus:bg-white/10 focus:ring-primary-500/20" 
                                           placeholder="NODE IDENTITY NAME..." 
                                           value={form.name} 
                                           onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                                           required 
                                       />
                                  </div>
                                  <div className="space-y-2">
                                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 pl-1">Unique SKU Protocol</label>
                                       <input 
                                           className="input h-14 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-widest font-mono focus:bg-white/10 focus:ring-primary-500/20" 
                                           placeholder="SKU-XXXX-XXXX" 
                                           value={form.sku} 
                                           onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))}
                                       />
                                  </div>
                             </div>
                        </div>

                        {/* Valuation Matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100/50 space-y-6">
                                  <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                                       <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                                            <CreditCard size={18} />
                                       </div>
                                       <div>
                                            <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest italic">INR Fiscal Node</h4>
                                       </div>
                                  </div>
                                  <div className="space-y-4">
                                       <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-emerald-700 opacity-60">Base Valuation (₹)</label>
                                            <input 
                                                type="number" 
                                                className="input h-12 bg-white border-emerald-100 font-black text-emerald-950 focus:ring-emerald-500/20" 
                                                value={form.priceINR}
                                                onChange={e => {
                                                    const inr = parseFloat(e.target.value) || 0;
                                                    setForm((f: any) => ({ ...f, priceINR: inr }));
                                                }}
                                            />
                                       </div>
                                       <button 
                                            type="button"
                                            onClick={() => setForm((f: any) => ({ ...f, priceINR: parseFloat((form.priceUSD * fxRate).toFixed(2)) }))}
                                            className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
                                       >
                                            <Calculator size={14} /> Pull from USD [$→₹]
                                       </button>
                                  </div>
                             </div>

                             <div className="bg-blue-50/30 p-8 rounded-[2.5rem] border border-blue-100/50 space-y-6">
                                  <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                                       <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                                            <Globe size={18} />
                                       </div>
                                       <div>
                                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest italic">USD Fiscal Node</h4>
                                       </div>
                                  </div>
                                  <div className="space-y-4">
                                       <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-blue-700 opacity-60">Market Valuation ($)</label>
                                            <input 
                                                type="number" 
                                                className="input h-12 bg-white border-blue-100 font-black text-blue-950 focus:ring-blue-500/20" 
                                                value={form.priceUSD}
                                                onChange={e => {
                                                    const usd = parseFloat(e.target.value) || 0;
                                                    setForm((f: any) => ({ ...f, priceUSD: usd }));
                                                }}
                                            />
                                       </div>
                                       <button 
                                            type="button"
                                            onClick={() => setForm((f: any) => ({ ...f, priceUSD: parseFloat((form.priceINR / fxRate).toFixed(2)) }))}
                                            className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all flex items-center justify-center gap-2"
                                       >
                                            <Calculator size={14} /> Pull from INR [₹→$]
                                       </button>
                                  </div>
                             </div>
                        </div>

                        {/* Operational Parameters */}
                        <div className="bg-secondary-50 p-8 rounded-[2.5rem] border border-secondary-200/50 grid grid-cols-1 md:grid-cols-4 gap-8">
                             <div className="space-y-2 text-primary-600">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Node Type</label>
                                  <select 
                                       className="input h-12 bg-white border-secondary-200 font-black text-[10px] uppercase tracking-tighter"
                                       value={form.type}
                                       onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}
                                  >
                                       <option value="SIMPLE">SIMPLE</option>
                                       <option value="VARIABLE">VARIABLE</option>
                                  </select>
                             </div>
                             <div className="space-y-2 text-primary-600">
                                  <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Classification Sector</label>
                                  <select 
                                       className="input h-12 bg-white border-secondary-200 font-black text-[10px] uppercase tracking-tighter"
                                       value={form.category}
                                       onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
                                  >
                                       {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label.toUpperCase()}</option>)}
                                  </select>
                             </div>
                             <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-secondary-500 opacity-60">Fiscal Cycle</label>
                                  <select 
                                       className="input h-12 bg-white border-secondary-200 font-black text-[10px] uppercase tracking-tighter"
                                       value={form.billingCycle}
                                       onChange={e => setForm((f: any) => ({ ...f, billingCycle: e.target.value }))}
                                  >
                                       {BILLING_CYCLES.map(b => <option key={b.value} value={b.value}>{b.label.toUpperCase()}</option>)}
                                  </select>
                             </div>
                             <div className="space-y-2">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-secondary-500 opacity-60">Pricing Topology</label>
                                  <select 
                                       className="input h-12 bg-white border-secondary-200 font-black text-[10px] uppercase tracking-tighter"
                                       value={form.pricingModel}
                                       onChange={e => setForm((f: any) => ({ ...f, pricingModel: e.target.value }))}
                                  >
                                       {PRICING_MODELS.map(p => <option key={p.value} value={p.value}>{p.label.toUpperCase()}</option>)}
                                  </select>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
                             <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Compliance Tax Rate (%)</label>
                                  <input 
                                      type="number" 
                                      className="input h-14 bg-secondary-50 border-secondary-100 font-black text-sm" 
                                      value={form.taxRate} 
                                      onChange={e => setForm((f: any) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} 
                                  />
                             </div>
                             <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">HSN Compliance Code</label>
                                  <input 
                                      className="input h-14 bg-secondary-50 border-secondary-100 font-black text-sm font-mono uppercase tracking-widest" 
                                      value={form.hsnCode} 
                                      onChange={e => setForm((f: any) => ({ ...f, hsnCode: e.target.value }))} 
                                      placeholder="EX: 4902"
                                  />
                             </div>
                             <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Operational unit</label>
                                  <input 
                                      className="input h-14 bg-secondary-50 border-secondary-100 font-black text-sm uppercase italic" 
                                      value={form.unit} 
                                      onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} 
                                      placeholder="EX: YEAR / ARTICLE"
                                  />
                             </div>
                        </div>

                        {editingProduct && editingProduct.type === 'VARIABLE' ? (
                            <VariantAdminPanel 
                                product={editingProduct} 
                                authH={authH}
                                onRefresh={async () => {
                                    const res = await fetch(`/api/invoice-products/${editingProduct.id}`, { headers: authH });
                                    if (res.ok) setEditingProduct(await res.json());
                                    fetchProducts();
                                }} 
                            />
                        ) : form.type === 'VARIABLE' ? (
                            <div className="bg-secondary-950 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden text-center justify-center flex flex-col items-center mt-8">
                                <h3 className="text-white font-black text-lg uppercase tracking-widest mb-4">Attribute Engine (Variants)</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400">Save the product first to define variables and variants.</p>
                            </div>
                        ) : null}

                        <div className="flex bg-secondary-50 p-6 rounded-[2rem] border border-secondary-100 gap-8">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-10 h-6 rounded-full p-1 transition-all ${form.isActive ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : 'bg-secondary-300'}`}
                                       onClick={() => setForm((f: any) => ({ ...f, isActive: !f.isActive }))}>
                                       <div className={`w-4 h-4 bg-white rounded-full transition-all ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-950 italic group-hover:text-primary-600">Active Node Status</span>
                             </label>
                             <label className="flex items-center gap-3 cursor-pointer group border-l border-secondary-200 pl-8">
                                  <div className={`w-10 h-6 rounded-full p-1 transition-all ${form.isFeatured ? 'bg-amber-500 shadow-lg shadow-amber-100' : 'bg-secondary-300'}`}
                                       onClick={() => setForm((f: any) => ({ ...f, isFeatured: !f.isFeatured }))}>
                                       <div className={`w-4 h-4 bg-white rounded-full transition-all ${form.isFeatured ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-950 italic group-hover:text-primary-600">Identity Promotion</span>
                             </label>
                        </div>

                        <div className="flex gap-4 pt-10 border-t border-secondary-100/50">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)} 
                                className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
                            >
                                Abandon
                            </button>
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="flex-1 bg-primary-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                                {saving ? 'Propagating...' : (
                                    <>
                                        Propagate Registry Node <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </CRMModal>
            </CRMPageShell>
        </DashboardLayout>
    );
}
