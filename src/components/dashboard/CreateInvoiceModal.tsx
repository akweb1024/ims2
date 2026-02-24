'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, User } from 'lucide-react';
import GuidelineHelp from './GuidelineHelp';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Customer Selection
    const [customerSearch, setCustomerSearch] = useState('');
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [searching, setSearching] = useState(false);

    // Step 2: Invoice Details
    const [dueDate, setDueDate] = useState('');
    const [items, setItems] = useState([{ id: 1, description: '', quantity: 1, price: 0 }]);
    const [description, setDescription] = useState('');
    const [journalResults, setJournalResults] = useState<{ [key: number]: any[] }>({});
    const [taxType, setTaxType] = useState<'DOMESTIC' | 'INTERNATIONAL'>('DOMESTIC');
    const [currency, setCurrency] = useState('INR');
    const [taxRate, setTaxRate] = useState(18); // Default GST 18%
    const searchTimeout = useRef<any>(null);

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

    const searchJournals = async (itemId: number, query: string) => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/journals?search=${query}&limit=5`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setJournalResults(prev => ({ ...prev, [itemId]: data || [] }));
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);
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

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), description: '', quantity: 1, price: 0 }]);
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

    const handleSubmit = async () => {
        if (!selectedCustomer || !dueDate || items.some(i => !i.description || i.price <= 0)) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerProfileId: selectedCustomer.id,
                    dueDate,
                    description,
                    lineItems: items.map(({ id, description, quantity, price }) => ({ id, description, quantity, price })),
                    taxRate,
                    currency
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
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
                        <p className="text-sm text-gray-500">Step {step}: {step === 1 ? 'Select Customer' : 'Invoice Details'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="relative">
                                <label className="label mb-2 block">Search Customer / Organization</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        className="input-premium pl-12 w-full"
                                        placeholder="Type name, email, or organization..."
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                {searching && <p className="text-xs text-secondary-400 mt-2 ml-1">Searching...</p>}
                            </div>

                            <div className="space-y-2">
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
                                        <div>
                                            <p className="font-bold text-gray-900">{c.name}</p>
                                            <p className="text-sm text-gray-500">{c.organizationName || c.primaryEmail}</p>
                                        </div>
                                    </button>
                                ))}
                                {customers.length === 0 && customerSearch.length > 2 && !searching && (
                                    <p className="text-center text-gray-400 py-8">No customers found.</p>
                                )}
                            </div>
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
                                        <label className="label mb-0">Line Items</label>
                                        <GuidelineHelp category="BILLING" search="Items" />
                                    </div>
                                    <button onClick={handleAddItem} className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors">
                                        <Plus size={14} /> Add Item
                                    </button>
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
                                                            setJournalResults(prev => ({ ...prev, [item.id]: [] }));
                                                        }, 200);
                                                    }}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        updateItem(item.id, 'description', val);
                                                        if (val.length >= 2) {
                                                            searchJournals(item.id, val);
                                                        } else {
                                                            setJournalResults(prev => ({ ...prev, [item.id]: [] }));
                                                        }
                                                    }}
                                                />
                                                
                                                {/* Journal Search Results Dropdown */}
                                                {journalResults[item.id] && journalResults[item.id].length > 0 && (
                                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                                                        {journalResults[item.id].map((journal: any) => (
                                                            <button
                                                                key={journal.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateItem(item.id, 'description', journal.name);
                                                                    updateItem(item.id, 'price', journal.priceINR || 0);
                                                                    setJournalResults(prev => ({ ...prev, [item.id]: [] }));
                                                                }}
                                                                className="w-full text-left px-4 py-2 hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0"
                                                            >
                                                                <p className="text-sm font-bold text-gray-900 truncate">{journal.name}</p>
                                                                <p className="text-[10px] text-primary-600 font-bold">Standard Price: ₹{journal.priceINR?.toLocaleString()}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
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
                                                    className="input-premium text-sm text-right"
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

                            <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500 font-medium uppercase tracking-wider">Subtotal</span>
                                    <span className="text-secondary-900 font-bold">{currency === 'INR' ? '₹' : currency} {calculateTotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500 font-medium uppercase tracking-wider">
                                        {taxType === 'DOMESTIC' ? 'GST (18%)' : 'Tax (International)'}
                                    </span>
                                    <span className="text-secondary-900 font-bold">
                                        {currency === 'INR' ? '₹' : currency} {(calculateTotal() * (taxRate / 100)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <span className="text-base font-black text-gray-900 uppercase">Total Amount</span>
                                    <span className="text-2xl font-black text-primary-600">
                                        {currency === 'INR' ? '₹' : currency} {(calculateTotal() * (1 + taxRate / 100)).toLocaleString()}
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
