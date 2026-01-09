'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, User } from 'lucide-react';

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
                    lineItems: items.map(({ description, quantity, price }) => ({ description, quantity, price })),
                    taxRate: 18 // Default 18% GST ? Or 0 for now
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
                                    <label className="label">Line Items</label>
                                    <button onClick={handleAddItem} className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:bg-primary-50 px-2 py-1 rounded-lg transition-colors">
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>
                                {items.map((item, index) => (
                                    <div key={item.id} className="flex gap-3 items-start animate-fade-in-up">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                className="input-premium text-sm"
                                                placeholder="Description (e.g. Consulting Fee)"
                                                value={item.description}
                                                onChange={e => updateItem(item.id, 'description', e.target.value)}
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
                                ))}
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-500 uppercase">Subtotal</span>
                                <span className="text-xl font-black text-gray-900">₹{calculateTotal().toLocaleString()}</span>
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
