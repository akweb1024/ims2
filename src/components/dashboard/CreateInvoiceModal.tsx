'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
    X, Search, User, Plus, Trash2, Calendar, FileText, 
    ChevronRight, CheckCircle2, AlertCircle, Info, Landmark, MapPin, Phone,
    Package, Globe, Tag, Building2, CreditCard, ClipboardList, ShieldCheck, Zap
} from 'lucide-react';

const getCurrencySymbol = (curr: string) => {
    switch ((curr || 'INR').toUpperCase()) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return curr + ' ';
    }
}
import { CustomerType } from '@/types';
import GuidelineHelp from './GuidelineHelp';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editId?: string;
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, editId }: CreateInvoiceModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Customer Selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const [brands, setBrands] = useState<any[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');

    // Step 2: Invoice Details
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([{ id: 1, description: '', hsnCode: '', quantity: 1, price: 0 }]);
    const [description, setDescription] = useState('');
    const [journalResults, setJournalResults] = useState<{ [key: number]: any[] }>({});
    const [taxType, setTaxType] = useState<'DOMESTIC' | 'INTERNATIONAL'>('DOMESTIC');
    const [currency, setCurrency] = useState('INR');
    const [taxRate, setTaxRate] = useState(18); // Default GST 18%
    const searchTimeout = useRef<any>(null);

    // Coupon / Discount
    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState<any>(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({
        name: '',
        primaryEmail: '',
        primaryPhone: '',
        secondaryPhone: '',
        customerType: 'INDIVIDUAL' as CustomerType,
        organizationName: '',
        designation: '',
        institutionId: '',
        gstVatTaxId: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingPincode: '',
        billingCountry: 'India',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingPincode: '',
        shippingCountry: 'India',
        notes: '',
    });
    const [isShippingSame, setIsShippingSame] = useState(true);
    const [creatingCustomerLoading, setCreatingCustomerLoading] = useState(false);
    const [institutions, setInstitutions] = useState<any[]>([]);

    const handleTaxTypeChange = (type: 'DOMESTIC' | 'INTERNATIONAL') => {
        setTaxType(type);
        if (type === 'INTERNATIONAL') {
            setCurrency('USD');
            setTaxRate(0);
        } else {
            setCurrency('INR');
            setTaxRate(18);
        }
    };

    const [showProductModal, setShowProductModal] = useState(false);
    const [productResults, setProductResults] = useState<{ [key: number]: any[] }>({});
    const [catSearch, setCatSearch] = useState('');
    const [catProducts, setCatProducts] = useState<any[]>([]);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
    const [pendingDropdownTarget, setPendingDropdownTarget] = useState<number | null>(null);
    const [catLoading, setCatLoading] = useState(false);

    const searchCatalogue = async (itemId: number, query: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/invoice-products?q=${encodeURIComponent(query)}&isActive=true&pageSize=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProductResults(prev => ({ ...prev, [itemId]: data.data || [] }));
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);
    };

    const fetchCatalogue = useCallback(async (query = '') => {
        setCatLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/invoice-products?q=${encodeURIComponent(query)}&isActive=true&pageSize=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setCatProducts(data.data || []);
        } catch (e) {
            console.error('Failed to fetch catalogue', e);
        } finally {
            setCatLoading(false);
        }
    }, []);

    useEffect(() => {
        if (showProductModal) fetchCatalogue(catSearch);
    }, [showProductModal, catSearch, fetchCatalogue]);

    // Unified product selection handler
    const finalizeProductSelection = (p: any, v?: any, targetItemId?: number) => {
        const pSku = v?.sku || p.sku;
        const pName = v ? `${p.name} (${Object.values(v.attributes).join(', ')})` : p.name;
        const finalDesc = pSku ? `${pName} (${pSku})` : pName;
        const price = currency === 'USD' ? (v?.priceUSD ?? p.priceUSD ?? 0) : (v?.priceINR ?? p.priceINR ?? 0);

        if (targetItemId) {
            updateItem(targetItemId, 'description', finalDesc);
            updateItem(targetItemId, 'price', price);
            updateItem(targetItemId, 'productId', p.id);
            updateItem(targetItemId, 'variantId', v?.id);
            updateItem(targetItemId, 'hsnCode', p.hsnCode || p.sacCode || '');
            setProductResults(prev => ({ ...prev, [targetItemId]: [] }));
        } else {
            const newItem = {
                id: Date.now(),
                description: finalDesc,
                hsnCode: p.hsnCode || p.sacCode || '',
                quantity: p.minQuantity || 1,
                price: price,
                productId: p.id,
                variantId: v?.id
            };
            setItems(prev => {
                if (prev.length === 1 && !prev[0].description && prev[0].price === 0) return [newItem];
                return [...prev, newItem];
            });
            setShowProductModal(false);
            setCatSearch('');
        }

        if (p.taxRate && p.taxRate !== taxRate) {
            if (confirm(`Product "${p.name}" has standard tax of ${p.taxRate}%. Update invoice tax rate?`)) {
                setTaxRate(p.taxRate);
            }
        }
        
        setSelectedProductForVariant(null);
        setPendingDropdownTarget(null);
    };

    const handleSelectProductClick = (p: any, targetItemId?: number) => {
        if (p.variants && p.variants.length > 0) {
            setSelectedProductForVariant(p);
            setPendingDropdownTarget(targetItemId || null);
            if (!showProductModal) setShowProductModal(true); // Ensure overlay is there for variants
        } else {
            finalizeProductSelection(p, undefined, targetItemId);
        }
    };

    useEffect(() => {
        const searchCustomers = async () => {
            if (customerSearch.length < 2) {
                setCustomers([]);
                return;
            }
            setSearching(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/customers?search=${customerSearch}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCustomers(data.data || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        };

        const timer = setTimeout(searchCustomers, 500);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/brands', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setBrands(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch brands', err);
            }
        };
        const fetchInstitutions = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/institutions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInstitutions(Array.isArray(data) ? data : (data.data || []));
                }
            } catch (err) {
                console.error('Failed to fetch institutions', err);
            }
        };

        if (isOpen) {
            fetchBrands();
            fetchInstitutions();
        }
    }, [isOpen]);

    // Populate data for editing
    useEffect(() => {
        const fetchInvoiceForEdit = async () => {
            if (!editId || !isOpen) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/invoices/${editId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setDueDate(data.dueDate?.split('T')[0] || '');
                    setDescription(data.description || '');
                    setItems(Array.isArray(data.lineItems) ? data.lineItems : []);
                    setTaxRate(data.taxRate || 18);
                    setCurrency(data.currency || 'INR');
                    setSelectedBrandId(data.brandId || '');
                    setSelectedCustomer(data.customerProfile || data.subscription?.customerProfile);
                    // If editing, skip customer selection step
                    setStep(2);

                    if (data.couponCode) {
                        setCouponCode(data.couponCode);
                        setCouponResult({
                            valid: true,
                            coupon: {
                                id: data.couponId,
                                code: data.couponCode,
                                discountType: data.discountType,
                                discountValue: data.discountValue
                            },
                            discountAmount: data.discountAmount
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch invoice for editing', err);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && editId) {
            fetchInvoiceForEdit();
        } else if (isOpen && !editId) {
            // Reset for new invoice
            setStep(1);
            setSelectedCustomer(null);
            setDueDate('');
            setItems([{ id: 1, description: '', hsnCode: '', quantity: 1, price: 0 }]);
            setDescription('');
            setCouponResult(null);
            setCouponCode('');
        }
    }, [isOpen, editId]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', hsnCode: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(i => i.id !== id));
        }
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
    };

    const calculateDiscount = () => couponResult?.discountAmount || 0;

    const calculateTaxableAmount = () => Math.max(0, calculateTotal() - calculateDiscount());

    const applyScoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');
        setCouponResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCode,
                    subtotal: calculateTotal(),
                    brandId: selectedBrandId || null
                })
            });
            const data = await res.json();
            if (data.valid) {
                setCouponResult(data);
            } else {
                setCouponError(data.error || 'Invalid coupon');
            }
        } catch (err) {
            setCouponError('Failed to validate coupon');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingCustomerLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newCustomerForm)
            });

            if (res.ok) {
                const customer = await res.json();
                setSelectedCustomer(customer);
                setStep(2);
                setIsCreatingCustomer(false);
                setNewCustomerForm({
                    name: '',
                    primaryEmail: '',
                    primaryPhone: '',
                    secondaryPhone: '',
                    customerType: 'INDIVIDUAL',
                    organizationName: '',
                    designation: '',
                    institutionId: '',
                    gstVatTaxId: '',
                    billingAddress: '',
                    billingCity: '',
                    billingState: '',
                    billingPincode: '',
                    billingCountry: 'India',
                    shippingAddress: '',
                    shippingCity: '',
                    shippingState: '',
                    shippingPincode: '',
                    shippingCountry: 'India',
                    notes: '',
                });
                setIsShippingSame(true);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create customer');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while creating customer');
        } finally {
            setCreatingCustomerLoading(false);
        }
    };

    const removeCoupon = () => {
        setCouponResult(null);
        setCouponCode('');
        setCouponError('');
    };

    const handleSubmit = async () => {
        if (!selectedCustomer || !dueDate || items.some(i => !i.description || i.price <= 0)) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(editId ? `/api/invoices/${editId}` : '/api/invoices', {
                method: editId ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerProfileId: selectedCustomer.id,
                    dueDate,
                    description,
                    lineItems: items.map(({ id, description, hsnCode, quantity, price, productId, variantId }: any) => ({ 
                        id, 
                        description, 
                        hsnCode: hsnCode || null,
                        quantity, 
                        price, 
                        productId: productId || null,
                        variantId: variantId || null
                    })),
                    taxRate,
                    amount: calculateTotal(),
                    tax: (calculateTaxableAmount() * (taxRate / 100)),
                    total: calculateTaxableAmount() * (1 + (taxRate / 100)),
                    currency,
                    brandId: selectedBrandId || null,
                    // Coupon
                    couponId: couponResult?.coupon?.id || null,
                    couponCode: couponResult?.coupon?.code || null,
                    discountType: couponResult?.coupon?.discountType || null,
                    discountValue: couponResult?.coupon?.discountValue || 0,
                    discountAmount: couponResult?.discountAmount || 0,
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create invoice');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Product Catalogue & Variants Overlay */}
                {showProductModal && (
                    <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-slideIn">
                        {selectedProductForVariant ? (
                            <div className="flex-1 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🔗 Select Variant</h3>
                                        <p className="text-xs text-secondary-500 uppercase font-bold tracking-widest">{selectedProductForVariant.name}</p>
                                    </div>
                                    <button onClick={() => { setSelectedProductForVariant(null); setPendingDropdownTarget(null); if (pendingDropdownTarget) setShowProductModal(false); }} className="p-2 hover:bg-gray-200 rounded-full">
                                        <X size={20} className="text-gray-500" />
                                    </button>
                                </div>
                                <div className="p-6 overflow-y-auto flex-1 bg-white">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedProductForVariant.variants.map((v: any, i: number) => (
                                            <button key={i} onClick={() => finalizeProductSelection(selectedProductForVariant, v, pendingDropdownTarget || undefined)} className="text-left p-4 rounded-xl border border-secondary-200 hover:border-primary-500 hover:bg-primary-50 transition-all">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-sm text-secondary-900">{Object.values(v.attributes).join(' · ')}</span>
                                                    <span className="text-xs font-black text-primary-600 bg-primary-100 px-2 rounded-full">{getCurrencySymbol(currency)}{(currency === 'USD' ? v.priceUSD : v.priceINR)?.toLocaleString()}</span>
                                                </div>
                                                <p className="text-[10px] text-secondary-400 font-mono tracking-widest uppercase">SKU: {v.sku || selectedProductForVariant.sku}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    🗂️ Browse Product Catalogue
                                </h3>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Select a pre-configured product</p>
                            </div>
                            <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input 
                                    className="input-premium pl-12 w-full"
                                    placeholder="Search products by name, SKU or HSN..."
                                    autoFocus
                                    value={catSearch}
                                    onChange={e => setCatSearch(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {catLoading ? (
                                    <div className="flex flex-col items-center py-12">
                                        <div className="animate-spin h-8 w-8 border-b-2 border-primary-600 rounded-full mb-4" />
                                        <p className="text-xs text-gray-500 font-black uppercase">Fetching Catalogue...</p>
                                    </div>
                                ) : catProducts.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <p className="italic text-sm">No products found matching &ldquo;{catSearch}&rdquo;</p>
                                    </div>
                                ) : (
                                    catProducts.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleSelectProductClick(p)}
                                            className="w-full text-left p-4 rounded-2xl border border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all flex items-center justify-between group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{p.name}</span>
                                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-black">{p.category.replace('_', ' ')}</span>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{p.sku || 'No SKU'} · {p.hsnCode || 'No HSN'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-gray-900">
                                                    {getCurrencySymbol(currency)}
                                                    {(currency === 'USD' ? p.priceUSD : p.priceINR)?.toLocaleString()}
                                                </p>
                                                <p className="text-[9px] text-primary-600 font-bold uppercase">{p.variants && p.variants.length > 0 ? 'Select Variant →' : 'Add to Invoice →'}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50">
                            <span>Showing {catProducts.length} Results</span>
                            <Link href="/dashboard/crm/invoice-products" className="text-primary-600 hover:underline">Manage Catalogue ↗</Link>
                        </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{editId ? 'Edit Invoice' : 'Create New Invoice'}</h2>
                        <p className="text-sm text-gray-500">Step {step}: {step === 1 ? 'Select Customer' : 'Invoice Details'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {step === 1 ? (
                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">
                                    {isCreatingCustomer ? 'New Customer Details' : 'Select Customer'}
                                </h3>
                                <button 
                                    onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                                    className="text-sm font-bold text-primary-600 hover:text-primary-700 underline flex items-center gap-1"
                                >
                                    {isCreatingCustomer ? '← Search Existing' : '+ Create New Customer'}
                                </button>
                            </div>

                            {isCreatingCustomer ? (
                                <form onSubmit={handleCreateCustomer} className="space-y-8 animate-fadeIn">
                                    {/* Basic Intel Section */}
                                    <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-100">
                                                <Info size={16} />
                                            </div>
                                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest italic">Basic Intel</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Full Identity Name <span className="text-red-500">*</span></label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="EX: JOHNATHAN PROTOCOL"
                                                    value={newCustomerForm.name}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Primary Signal (Email) <span className="text-red-500">*</span></label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    type="email"
                                                    placeholder="INTEL@CRYPTO.COM"
                                                    value={newCustomerForm.primaryEmail}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, primaryEmail: e.target.value})}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Primary Vector (Phone) <span className="text-red-500">*</span></label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="e.g. +91 9876543210"
                                                    value={newCustomerForm.primaryPhone}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, primaryPhone: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Secondary Signal Mode</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="OPTIONAL VECTOR"
                                                    value={newCustomerForm.secondaryPhone}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, secondaryPhone: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Classification Type</label>
                                                <select 
                                                    className="input-premium w-full bg-white"
                                                    value={newCustomerForm.customerType}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, customerType: e.target.value as CustomerType})}
                                                >
                                                    <option value="INDIVIDUAL">SINGLE UNIT (INDIVIDUAL)</option>
                                                    <option value="INSTITUTION">ORGANIZATIONAL NODE (INST)</option>
                                                    <option value="AGENCY">EXTERNAL AGENT (AGENCY)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Functional Designation</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="EX: LIBRARIAN / DIRECTOR"
                                                    value={newCustomerForm.designation}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, designation: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Organization Designation</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="GLOBAL ACADEMY / ENTERPRISE X"
                                                    value={newCustomerForm.organizationName}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, organizationName: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Global Matrix Bind (Institution)</label>
                                                <select 
                                                    className="input-premium w-full bg-white"
                                                    value={newCustomerForm.institutionId}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, institutionId: e.target.value})}
                                                >
                                                    <option value="">-- NO MATRIX BIND --</option>
                                                    {institutions.map(inst => (
                                                        <option key={inst.id} value={inst.id}>
                                                            {inst.name.toUpperCase()} [{inst.code}]
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Billing Matrix Section */}
                                    <div className="bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-100 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                                <CreditCard size={16} />
                                            </div>
                                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest italic">Billing Matrix</h4>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="label">GSTIN / VAT ID Protocol</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    placeholder="TAX-XXXXXX-XXXX"
                                                    value={newCustomerForm.gstVatTaxId}
                                                    onChange={e => setNewCustomerForm({...newCustomerForm, gstVatTaxId: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Base Street Coordinates</label>
                                                <textarea 
                                                    className="input-premium w-full bg-white min-h-[60px]" 
                                                    placeholder="BUILDING, STREET, BLOCK..."
                                                    value={newCustomerForm.billingAddress}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewCustomerForm(prev => {
                                                            const upd = {...prev, billingAddress: val};
                                                            if (isShippingSame) upd.shippingAddress = val;
                                                            return upd;
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Sector / City</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    value={newCustomerForm.billingCity}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewCustomerForm(prev => {
                                                            const upd = {...prev, billingCity: val};
                                                            if (isShippingSame) upd.shippingCity = val;
                                                            return upd;
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Region / State</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    value={newCustomerForm.billingState}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewCustomerForm(prev => {
                                                            const upd = {...prev, billingState: val};
                                                            if (isShippingSame) upd.shippingState = val;
                                                            return upd;
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Zone Code</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    value={newCustomerForm.billingPincode}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewCustomerForm(prev => {
                                                            const upd = {...prev, billingPincode: val};
                                                            if (isShippingSame) upd.shippingPincode = val;
                                                            return upd;
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Nation</label>
                                                <input 
                                                    className="input-premium w-full bg-white" 
                                                    value={newCustomerForm.billingCountry}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewCustomerForm(prev => {
                                                            const upd = {...prev, billingCountry: val};
                                                            if (isShippingSame) upd.shippingCountry = val;
                                                            return upd;
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shipping Matrix Section */}
                                    <div className="bg-blue-50/30 p-6 rounded-[2rem] border border-blue-100 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                                    <Globe size={16} />
                                                </div>
                                                <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest italic">Shipping Matrix</h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Mirror Billing</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = !isShippingSame;
                                                        setIsShippingSame(next);
                                                        if (next) {
                                                            setNewCustomerForm(prev => ({
                                                                ...prev,
                                                                shippingAddress: prev.billingAddress,
                                                                shippingCity: prev.billingCity,
                                                                shippingState: prev.billingState,
                                                                shippingPincode: prev.billingPincode,
                                                                shippingCountry: prev.billingCountry
                                                            }));
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isShippingSame ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isShippingSame ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {!isShippingSame ? (
                                            <div className="space-y-4 animate-fadeIn">
                                                <div>
                                                    <label className="label">Target Street Coordinates</label>
                                                    <textarea 
                                                        className="input-premium w-full bg-white min-h-[60px]" 
                                                        placeholder="ENTER DEPLOYMENT ADDRESS"
                                                        value={newCustomerForm.shippingAddress}
                                                        onChange={e => setNewCustomerForm({...newCustomerForm, shippingAddress: e.target.value})}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label">Sector / City</label>
                                                        <input 
                                                            className="input-premium w-full bg-white" 
                                                            value={newCustomerForm.shippingCity}
                                                            onChange={e => setNewCustomerForm({...newCustomerForm, shippingCity: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="label">Region / State</label>
                                                        <input 
                                                            className="input-premium w-full bg-white" 
                                                            value={newCustomerForm.shippingState}
                                                            onChange={e => setNewCustomerForm({...newCustomerForm, shippingState: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label">Zone Code</label>
                                                        <input 
                                                            className="input-premium w-full bg-white" 
                                                            value={newCustomerForm.shippingPincode}
                                                            onChange={e => setNewCustomerForm({...newCustomerForm, shippingPincode: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="label">Nation</label>
                                                        <input 
                                                            className="input-premium w-full bg-white" 
                                                            value={newCustomerForm.shippingCountry}
                                                            onChange={e => setNewCustomerForm({...newCustomerForm, shippingCountry: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 flex flex-col items-center justify-center text-center">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-2 animate-pulse border border-blue-100">
                                                    <Zap size={20} />
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mirroring Fiscal Coordinates</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Strategic Intel Section */}
                                    <div className="bg-purple-50/30 p-6 rounded-[2rem] border border-purple-100 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-100">
                                                <ClipboardList size={16} />
                                            </div>
                                            <h4 className="text-xs font-black text-purple-900 uppercase tracking-widest italic">Strategic Intel</h4>
                                        </div>
                                        <div>
                                            <label className="label">Observation Log</label>
                                            <textarea 
                                                className="input-premium w-full bg-white min-h-[100px] border-dashed" 
                                                placeholder="DOCUMENT INTERNAL INTEL, SPECIFIC BIASES, OR OPERATIONAL PREFERENCES..."
                                                value={newCustomerForm.notes}
                                                onChange={e => setNewCustomerForm({...newCustomerForm, notes: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-4">
                                        <button 
                                            type="submit" 
                                            disabled={creatingCustomerLoading}
                                            className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-primary-200"
                                        >
                                            {creatingCustomerLoading ? 'Propagating...' : 'Initialize Profile & Continue'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Search size={20} />
                                        </span>
                                        <input
                                            type="text"
                                            className="input-premium pl-12 w-full"
                                            placeholder="Type name, email, or organization..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setStep(2);
                                                }}
                                                className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all group flex items-center gap-4"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                                    <User size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-900">{c.name}</p>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase
                                                            ${c.customerType === 'INSTITUTION' ? 'bg-green-100 text-green-700' :
                                                              c.customerType === 'AGENCY' ? 'bg-amber-100 text-amber-700' :
                                                              'bg-blue-100 text-blue-700'}`}>
                                                            {c.customerType}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-500">{c.organizationName || c.primaryEmail}</p>
                                                </div>
                                            </button>
                                        ))}

                                        {customerSearch && customers.length === 0 && !loading && (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500 mb-4 font-medium">No customer found named &ldquo;{customerSearch}&rdquo;</p>
                                                <button 
                                                    onClick={() => {
                                                        setIsCreatingCustomer(true);
                                                        setNewCustomerForm({...newCustomerForm, name: customerSearch});
                                                    }}
                                                    className="btn btn-secondary border-dashed"
                                                >
                                                    + Create &ldquo;{customerSearch}&rdquo; as new customer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-primary-50 p-4 rounded-xl border border-primary-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{selectedCustomer?.name}</p>
                                        <p className="text-xs text-primary-600">{selectedCustomer?.organizationName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setStep(1)} className="text-xs font-bold text-primary-600 hover:underline">Change</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Invoice Date</label>
                                    <input type="date" disabled value={new Date().toISOString().split('T')[0]} className="input-premium bg-gray-50" />
                                </div>
                                <div>
                                    <label className="label">Due Date <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="input-premium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Select Brand (Optional)</label>
                                <select 
                                    className="input-premium"
                                    value={selectedBrandId}
                                    onChange={(e) => setSelectedBrandId(e.target.value)}
                                >
                                    <option value="">No Brand (Default Company)</option>
                                    {brands.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Selecting a brand will show the brand logo and name on the invoice.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="label mb-0">Region & Tax Type</label>
                                        <GuidelineHelp category="BILLING" search="Tax" />
                                    </div>
                                    <select 
                                        className="input-premium"
                                        value={taxType}
                                        onChange={(e) => handleTaxTypeChange(e.target.value as any)}
                                    >
                                        <option value="DOMESTIC">Domestic (GST 18%)</option>
                                        <option value="INTERNATIONAL">International (Non-Taxable)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Currency</label>
                                    <select 
                                        className="input-premium"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="label">Internal Notes / Description</label>
                                <textarea
                                    className="input-premium min-h-[80px]"
                                    placeholder="Optional notes..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <label className="label mb-0 uppercase tracking-widest text-[10px] font-black text-gray-400">Line Items</label>
                                        <GuidelineHelp category="BILLING" search="Items" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowProductModal(true)}
                                            className="text-[11px] font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded-lg border border-primary-100 hover:bg-primary-100 transition-colors flex items-center gap-1.5"
                                        >
                                            🗂️ Browse Catalogue
                                        </button>
                                        <button onClick={handleAddItem} className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors">
                                            <Plus size={14} /> Add Item
                                        </button>
                                    </div>
                                </div>
                                {items.map((item, index) => (
                                    <div key={item.id} className="space-y-2">
                                        <div className="flex gap-3 items-start animate-fade-in-up">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    className="input-premium text-sm"
                                                    placeholder="Description (e.g. Consulting Fee)"
                                                    value={item.description}
                                                    onBlur={() => {
                                                        // Small delay to allow clicking suggestions
                                                        setTimeout(() => {
                                                            setProductResults(prev => ({ ...prev, [item.id]: [] }));
                                                        }, 200);
                                                    }}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        updateItem(item.id, 'description', val);
                                                        if (val.length >= 2) {
                                                            searchCatalogue(item.id, val);
                                                        } else {
                                                            setProductResults(prev => ({ ...prev, [item.id]: [] }));
                                                        }
                                                    }}
                                                />
                                                
                                                {/* Product Search Results Dropdown */}
                                                {productResults[item.id] && productResults[item.id].length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                                                        {productResults[item.id].map((p: any) => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => handleSelectProductClick(p, item.id)}
                                                                className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0 group"
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                                                                        <p className="text-[9px] text-gray-400 font-mono">{p.sku || 'No SKU'}</p>
                                                                    </div>
                                                                    <div className="text-right ml-3">
                                                                        <p className="text-xs font-black text-primary-600">
                                                                            {getCurrencySymbol(currency)}
                                                                            {(currency === 'USD' ? p.priceUSD : p.priceINR)?.toLocaleString()}
                                                                        </p>
                                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{p.variants && p.variants.length > 0 ? '+ VARIANTS' : p.category.replace('_', ' ')}</p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    type="text"
                                                    className="input-premium text-sm text-center"
                                                    placeholder="HSN/SAC"
                                                    value={item.hsnCode || ''}
                                                    onChange={e => updateItem(item.id, 'hsnCode', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    className="input-premium text-sm text-center"
                                                    placeholder="Qty"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-28">
                                                <input
                                                    type="number"
                                                    className="input-premium text-sm text-right font-mono"
                                                    placeholder="Price"
                                                    min="0"
                                                    value={item.price}
                                                    onChange={e => updateItem(item.id, 'price', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-[1px]"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>


                            {/* Coupon / Discount */}
                            <div className="space-y-2">
                                <label className="label">Discount Coupon (Optional)</label>
                                {!couponResult ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="input-premium flex-1 uppercase tracking-widest font-mono"
                                            placeholder="ENTER COUPON CODE"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                            onKeyDown={e => e.key === 'Enter' && applyScoupon()}
                                        />
                                        <button
                                            type="button"
                                            onClick={applyScoupon}
                                            disabled={couponLoading || !couponCode.trim()}
                                            className="btn btn-secondary px-5 font-bold disabled:opacity-50"
                                        >
                                            {couponLoading ? '...' : 'Apply'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-600 text-lg">🎟️</span>
                                            <div>
                                                <p className="font-bold text-green-800 text-sm font-mono tracking-wider">{couponResult.coupon.code}</p>
                                                <p className="text-xs text-green-600">
                                                    {couponResult.coupon.discountType === 'PERCENTAGE'
                                                        ? `${couponResult.coupon.discountValue}% off`
                                                        : `${getCurrencySymbol(currency)}${couponResult.coupon.discountValue} flat off`}
                                                    {couponResult.coupon.description && ` — ${couponResult.coupon.description}`}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={removeCoupon} className="text-xs text-red-500 font-bold hover:underline">Remove</button>
                                    </div>
                                )}
                                {couponError && <p className="text-xs text-red-500 font-medium">{couponError}</p>}
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500 font-medium uppercase tracking-wider">Subtotal</span>
                                    <span className="text-secondary-900 font-bold">{getCurrencySymbol(currency)} {calculateTotal().toLocaleString()}</span>
                                </div>
                                {couponResult && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-green-600 font-bold uppercase tracking-wider">🎟️ Coupon Discount</span>
                                        <span className="text-green-600 font-bold">− {getCurrencySymbol(currency)} {calculateDiscount().toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500 font-medium uppercase tracking-wider">
                                        {taxType === 'DOMESTIC' ? 'GST (18%)' : 'Tax (International)'}
                                    </span>
                                    <span className="text-secondary-900 font-bold">
                                        {getCurrencySymbol(currency)} {(calculateTaxableAmount() * (taxRate / 100)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="text-base font-black text-gray-900 uppercase">Total Amount</span>
                                    <span className="text-2xl font-black text-primary-600">
                                        {getCurrencySymbol(currency)} {(calculateTaxableAmount() * (1 + taxRate / 100)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                    {step === 1 ? (
                        <button
                            disabled={!selectedCustomer}
                            onClick={() => setStep(2)}
                            className="btn btn-primary px-8 disabled:opacity-50"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="btn btn-primary px-8 flex items-center gap-2"
                        >
                            {loading ? 'Creating...' : 'Create Invoice'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
