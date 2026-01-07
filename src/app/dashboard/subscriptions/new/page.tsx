'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function NewSubscriptionPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('CUSTOMER');

    // Data for Selection
    const [customers, setCustomers] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        customerProfileId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
        salesChannel: 'DIRECT',
        items: [] as any[], // { journalId, planId, quantity, journalName, planName, price }
        autoRenew: false,
        currency: 'INR'
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        let role = 'CUSTOMER';
        if (userData) {
            const user = JSON.parse(userData);
            role = user.role;
            setUserRole(role);

            // If customer, pre-assign profile or skip step 1
            if (role === 'CUSTOMER') {
                setStep(2);
            }
        }

        const fetchData = async () => {
            const token = localStorage.getItem('token');
            const searchParams = new URLSearchParams(window.location.search);
            const preSelectedId = searchParams.get('customerId');

            // Only fetch customers if not a customer role
            const fetchCustomers = role !== 'CUSTOMER';

            const [custRes, jourRes] = await Promise.all([
                fetchCustomers
                    ? fetch('/api/customers?limit=100', { headers: { 'Authorization': `Bearer ${token}` } })
                    : Promise.resolve(null),
                fetch('/api/journals', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (custRes && custRes.ok) {
                const data = await custRes.json();
                setCustomers(data.data);

                if (preSelectedId) {
                    setFormData(prev => ({ ...prev, customerProfileId: preSelectedId }));
                    setStep(2);
                }
            }
            if (jourRes.ok) {
                const data = await jourRes.json();
                setJournals(data);
            }
        };

        fetchData();
    }, []);

    const addItem = (journal: any, plan: any) => {
        if (formData.items.some(i => i.journalId === journal.id)) return;

        const price = formData.currency === 'INR' ? (plan.priceINR || 0) : (plan.priceUSD || 0);

        setFormData({
            ...formData,
            items: [...formData.items, {
                journalId: journal.id,
                planId: plan.id,
                quantity: 1,
                journalName: journal.name,
                planName: `${plan.planType} - ${plan.format}`,
                price: price
            }]
        });
    };

    const removeItem = (journalId: string) => {
        setFormData({
            ...formData,
            items: formData.items.filter(i => i.journalId !== journalId)
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = userRole === 'CUSTOMER' ? '/api/subscriptions/request' : '/api/subscriptions/create';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(userRole === 'CUSTOMER' ? 'Your subscription request has been submitted successfully!' : 'Subscription created successfully!');
                router.push('/dashboard/subscriptions');
            } else {
                const err = await res.json();
                alert(err.error || 'Something went wrong');
            }
        } catch (error) {
            console.error('Submit Error:', error);
            alert('Failed to submit subscription. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = formData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const currencySymbol = formData.currency === 'INR' ? '₹' : '$';

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">New Subscription</h1>
                        <p className="text-secondary-500">Create a new journal subscription package for a customer</p>
                    </div>
                </div>

                {/* Progress Tracker */}
                <div className="flex justify-between items-center mb-8 px-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-secondary-200 text-secondary-500'
                                }`}>
                                {s}
                            </div>
                            <span className={`text-xs mt-2 font-medium ${step >= s ? 'text-primary-600' : 'text-secondary-400'}`}>
                                {s === 1 ? 'Customer' : s === 2 ? 'Selection' : 'Details'}
                            </span>
                        </div>
                    ))}
                    <div className="absolute left-[calc(50%-150px)] top-[140px] w-[300px] h-[2px] bg-secondary-100 -z-10 hidden md:block"></div>
                </div>

                {/* Step 1: Select Customer */}
                {step === 1 && (
                    <div className="card-premium p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-xl font-bold text-secondary-900">Step 1: Select Customer</h3>
                            <div className="relative w-full md:w-72">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search customers..."
                                    className="input pl-10 w-full"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {customers
                                .filter(c => {
                                    const term = customerSearch.toLowerCase();
                                    return (
                                        c.name.toLowerCase().includes(term) ||
                                        (c.organizationName && c.organizationName.toLowerCase().includes(term)) ||
                                        c.primaryEmail.toLowerCase().includes(term)
                                    );
                                })
                                .map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setFormData({ ...formData, customerProfileId: c.id });
                                            setStep(2);
                                        }}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${formData.customerProfileId === c.id
                                            ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-50'
                                            : 'border-secondary-100 hover:border-primary-200 hover:bg-secondary-50'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <div className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">{c.name}</div>
                                            <div className="text-sm text-secondary-500">{c.organizationName || c.primaryEmail}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`badge ${c.customerType === 'INSTITUTION' ? 'badge-success' : 'badge-primary'}`}>
                                                {c.customerType}
                                            </div>
                                            <svg className={`w-5 h-5 transition-transform ${formData.customerProfileId === c.id ? 'text-primary-600 translate-x-1' : 'text-secondary-300 group-hover:translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </button>
                                ))}
                            {customers.filter(c => {
                                const term = customerSearch.toLowerCase();
                                return (
                                    c.name.toLowerCase().includes(term) ||
                                    (c.organizationName && c.organizationName.toLowerCase().includes(term)) ||
                                    c.primaryEmail.toLowerCase().includes(term)
                                );
                            }).length === 0 && (
                                    <div className="text-center py-10 text-secondary-400 italic">
                                        No customers found matching "{customerSearch}"
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Journals */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="card-premium p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                <h3 className="text-xl font-bold text-secondary-900">Step 2: Selection Catalog</h3>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Search journals..."
                                        className="input py-1 px-3 w-full md:w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <select
                                        className="input py-1 px-3 w-auto"
                                        value={formData.currency}
                                        onChange={(e) => {
                                            if (formData.items.length > 0) {
                                                if (!confirm('Changing currency will clear your current selection. Continue?')) return;
                                            }
                                            setFormData({ ...formData, currency: e.target.value, items: [] });
                                        }}
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {journals.filter(j => {
                                    const term = searchTerm.toLowerCase();
                                    return j.name.toLowerCase().includes(term) || (j.frequency && j.frequency.toLowerCase().includes(term));
                                }).length === 0 && (
                                        <div className="text-center py-10 text-secondary-400">
                                            No journals found matching your search.
                                        </div>
                                    )}
                                {journals.filter(j => {
                                    const term = searchTerm.toLowerCase();
                                    return j.name.toLowerCase().includes(term) || (j.frequency && j.frequency.toLowerCase().includes(term));
                                }).map((j) => (
                                    <div key={j.id} className="p-4 rounded-xl border border-secondary-100 hover:border-primary-200 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-secondary-900">{j.name}</h4>
                                                <p className="text-xs text-secondary-500 uppercase">{j.frequency} Access</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {j.plans.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => addItem(j, p)}
                                                    className={`p-3 rounded-lg border text-left transition-all ${formData.items.some(i => i.planId === p.id)
                                                        ? 'bg-primary-600 border-primary-600 text-white'
                                                        : 'bg-white border-secondary-200 hover:border-primary-600 '
                                                        }`}
                                                >
                                                    <div className="text-sm font-bold">{p.planType}</div>
                                                    <div className="text-xs opacity-75">{p.format}</div>
                                                    <div className="text-sm mt-1 font-bold">
                                                        {formData.currency === 'INR' ? '₹' : '$'}
                                                        {formData.currency === 'INR' ? (p.priceINR?.toLocaleString() || 0) : (p.priceUSD?.toLocaleString() || 0)}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Cart Summary */}
                        {formData.items.length > 0 && (
                            <div className="card-premium p-6 border-l-4 border-primary-600">
                                <h4 className="font-bold text-secondary-900 mb-4">Current Selection</h4>
                                <div className="space-y-3">
                                    {formData.items.map((item) => (
                                        <div key={item.planId} className="flex justify-between items-center text-sm bg-secondary-50 p-3 rounded-lg">
                                            <div>
                                                <span className="font-bold text-secondary-900">{item.journalName}</span>
                                                <span className="text-secondary-500 ml-2">({item.planName})</span>
                                            </div>
                                            <div className="flex items-center space-x-4">
                                                <span className="font-bold text-primary-600">{currencySymbol}{item.price.toLocaleString()}</span>
                                                <button onClick={() => removeItem(item.journalId)} className="text-danger-500 hover:text-danger-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center border-t border-secondary-200 pt-4 mt-4">
                                        <div className="text-lg font-bold text-secondary-900">Total</div>
                                        <div className="text-2xl font-bold text-primary-600">{currencySymbol}{totalAmount.toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="btn btn-primary w-full mt-4"
                                    >
                                        Configure Details
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Configure Details */}
                {step === 3 && (
                    <div className="card-premium p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-xl font-bold text-secondary-900">Step 3: Final Configuration</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Start Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">End Date</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Sales Channel</label>
                                <select
                                    className="input"
                                    value={formData.salesChannel}
                                    onChange={(e) => setFormData({ ...formData, salesChannel: e.target.value })}
                                >
                                    <option value="DIRECT">Direct Sales</option>
                                    <option value="AGENCY">Agency Partner</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-3 pt-8">
                                <input
                                    type="checkbox"
                                    id="autoRenew"
                                    className="h-5 w-5 rounded border-secondary-300 text-primary-600"
                                    checked={formData.autoRenew}
                                    onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                                />
                                <label htmlFor="autoRenew" className="text-secondary-700 font-medium cursor-pointer">
                                    Enable Auto-Renewal
                                </label>
                            </div>
                        </div>

                        <div className="bg-primary-50 p-6 rounded-2xl space-y-4">
                            <h4 className="font-bold text-primary-900">Summary</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-primary-700">Customer</span>
                                <span className="font-bold text-primary-900">{customers.find(c => c.id === formData.customerProfileId)?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-primary-700">Items</span>
                                <span className="font-bold text-primary-900">{formData.items.length} Journals</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-primary-700">Initial Invoice</span>
                                <span className="font-bold text-primary-900">{currencySymbol}{totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setStep(2)}
                                className="btn btn-secondary flex-1"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn btn-primary flex-1"
                            >
                                {loading ? 'Creating...' : 'Confirm & Create Subscription'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );

}
