'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { MapPin, Globe } from 'lucide-react';

export default function NewAgencyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isFetchingBillingPincode, setIsFetchingBillingPincode] = useState(false);
    const [isFetchingShippingPincode, setIsFetchingShippingPincode] = useState(false);
    const [isShippingSame, setIsShippingSame] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        organizationName: '',
        primaryEmail: '',
        primaryPhone: '',
        discountRate: 0,
        commissionTerms: '',
        territory: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingCountry: 'India',
        billingPincode: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingCountry: 'India',
        shippingPincode: ''
    });

    const handlePincodeLookup = async (pincode: string, type: 'billing' | 'shipping') => {
        if (pincode.length !== 6) return;
        
        if (type === 'billing') setIsFetchingBillingPincode(true);
        else setIsFetchingShippingPincode(true);

        try {
            const response = await fetch(`/api/pincode?pincode=${pincode}`);
            const data = await response.json();
            
            if (data && data[0] && data[0].Status === 'Success') {
                const detail = data[0].PostOffice[0];
                const city = detail.District;
                const state = detail.State;
                
                setFormData(prev => {
                    const update = { ...prev };
                    if (type === 'billing') {
                        update.billingCity = city;
                        update.billingState = state;
                        update.billingCountry = 'India';
                        update.billingPincode = pincode;
                    } else {
                        update.shippingCity = city;
                        update.shippingState = state;
                        update.shippingCountry = 'India';
                        update.shippingPincode = pincode;
                    }
                    return update;
                });
            }
        } catch (error) {
            console.error('Pincode fetch error:', error);
        } finally {
            if (type === 'billing') setIsFetchingBillingPincode(false);
            else setIsFetchingShippingPincode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/agencies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    shippingAddress: isShippingSame ? formData.billingAddress : formData.shippingAddress,
                    shippingCity: isShippingSame ? formData.billingCity : formData.shippingCity,
                    shippingState: isShippingSame ? formData.billingState : formData.shippingState,
                    shippingCountry: isShippingSame ? formData.billingCountry : formData.shippingCountry,
                    shippingPincode: isShippingSame ? formData.billingPincode : formData.shippingPincode
                })
            });

            if (res.ok) {
                router.push('/dashboard/crm/agencies');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create agency');
            }
        } catch (error) {
            console.error('Error creating agency:', error);
            alert('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole="ADMIN">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-6">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full transition-colors text-secondary-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">New Agency</h1>
                        <p className="text-secondary-500">Register a new agency partner.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="label">Contact Name *</label>
                            <input
                                required
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Agency / Organization Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Email *</label>
                            <input
                                required
                                type="email"
                                className="input"
                                value={formData.primaryEmail}
                                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label">Phone *</label>
                            <input
                                required
                                type="tel"
                                className="input"
                                value={formData.primaryPhone}
                                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-secondary-200 col-span-2 pt-4 mt-2">
                            <h3 className="font-bold text-secondary-900 mb-4">Commercial Terms</h3>
                        </div>

                        <div>
                            <label className="label">Standard Discount Rate (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                className="input"
                                value={formData.discountRate}
                                onChange={(e) => setFormData({ ...formData, discountRate: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-secondary-500 mt-1">This discount will be applied automatically to subscriptions.</p>
                        </div>
                        <div>
                            <label className="label">Commission / Payment Terms</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. Net 30, 5% Commission"
                                value={formData.commissionTerms}
                                onChange={(e) => setFormData({ ...formData, commissionTerms: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label">Territory / Region</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. North India, Global"
                                value={formData.territory}
                                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                            />
                        </div>

                        <div className="border-t border-secondary-200 col-span-2 pt-4 mt-2">
                             <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mt-4">
                                  {/* Billing Address */}
                                  <div className="bg-white rounded-[1.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                                       <div className="p-6 border-b border-secondary-50 bg-indigo-50/20 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                                 <MapPin size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1 leading-none">Billing</span>
                                                 <h3 className="text-lg font-black text-secondary-900 uppercase tracking-tight italic">Billing Address</h3>
                                            </div>
                                       </div>
                                       <div className="p-8 space-y-6">
                                             <div>
                                                 <label className="label">Complete Address</label>
                                                 <textarea
                                                     className="input h-20"
                                                     placeholder="Street, Building, etc."
                                                     value={formData.billingAddress}
                                                     onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                                                 />
                                             </div>
                                             <div className="grid grid-cols-2 gap-4">
                                                 <div>
                                                     <label className="label text-xs">City</label>
                                                     <input
                                                         type="text"
                                                         className="input text-sm"
                                                         value={formData.billingCity}
                                                         onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="label text-xs">State</label>
                                                     <input
                                                         type="text"
                                                         className="input text-sm"
                                                         value={formData.billingState}
                                                         onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="label text-xs flex items-center gap-2">
                                                         Pincode
                                                         {isFetchingBillingPincode && <span className="text-blue-500 animate-pulse text-[10px]">Fetching...</span>}
                                                     </label>
                                                     <input
                                                         type="text"
                                                         className="input text-sm"
                                                         maxLength={6}
                                                         value={formData.billingPincode}
                                                         onChange={(e) => {
                                                             const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                             setFormData({ ...formData, billingPincode: val });
                                                             if (val.length === 6) {
                                                                 handlePincodeLookup(val, 'billing');
                                                             }
                                                         }}
                                                     />
                                                 </div>
                                                 <div>
                                                     <label className="label text-xs">Country</label>
                                                     <input
                                                         type="text"
                                                         className="input text-sm"
                                                         value={formData.billingCountry}
                                                         onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })}
                                                     />
                                                 </div>
                                             </div>
                                       </div>
                                  </div>

                                  {/* Shipping Address */}
                                  <div className="bg-white rounded-[1.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                                       <div className="p-6 border-b border-secondary-50 bg-blue-50/20 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                 <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                                      <Globe size={20} />
                                                 </div>
                                                 <div className="flex flex-col">
                                                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mb-1 leading-none">Shipping</span>
                                                      <h3 className="text-lg font-black text-secondary-900 uppercase tracking-tight italic">Shipping Address</h3>
                                                 </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none">Mirror Billing</span>
                                                 <button
                                                     type="button"
                                                     onClick={() => setIsShippingSame(!isShippingSame)}
                                                     className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-500 ease-in-out focus:outline-none ${isShippingSame ? 'bg-blue-600' : 'bg-secondary-200'}`}
                                                 >
                                                     <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-500 ease-in-out ${isShippingSame ? 'translate-x-4' : 'translate-x-0'}`} />
                                                 </button>
                                            </div>
                                       </div>
                                       <div className="p-8">
                                            {!isShippingSame ? (
                                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                                     <div>
                                                         <label className="label">Complete Address</label>
                                                         <textarea
                                                             className="input h-20"
                                                             placeholder="Street, Building, etc."
                                                             value={formData.shippingAddress}
                                                             onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                         />
                                                     </div>
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <div>
                                                             <label className="label text-xs">City</label>
                                                             <input
                                                                 type="text"
                                                                 className="input text-sm"
                                                                 value={formData.shippingCity}
                                                                 onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="label text-xs">State</label>
                                                             <input
                                                                 type="text"
                                                                 className="input text-sm"
                                                                 value={formData.shippingState}
                                                                 onChange={(e) => setFormData({ ...formData, shippingState: e.target.value })}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="label text-xs flex items-center gap-2">
                                                                 Pincode
                                                                 {isFetchingShippingPincode && <span className="text-blue-500 animate-pulse text-[10px]">Fetching...</span>}
                                                             </label>
                                                             <input
                                                                 type="text"
                                                                 className="input text-sm"
                                                                 maxLength={6}
                                                                 value={formData.shippingPincode}
                                                                 onChange={(e) => {
                                                                     const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                     setFormData({ ...formData, shippingPincode: val });
                                                                     if (val.length === 6) {
                                                                         handlePincodeLookup(val, 'shipping');
                                                                     }
                                                                 }}
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="label text-xs">Country</label>
                                                             <input
                                                                 type="text"
                                                                 className="input text-sm"
                                                                 value={formData.shippingCountry}
                                                                 onChange={(e) => setFormData({ ...formData, shippingCountry: e.target.value })}
                                                             />
                                                         </div>
                                                     </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                                                     <div className="w-14 h-14 rounded-2xl bg-secondary-50 flex items-center justify-center animate-bounce-slow">
                                                          <Globe className="text-secondary-400" size={24} />
                                                     </div>
                                                     <div>
                                                          <p className="text-sm font-bold text-secondary-900">Deploying to Billing Coordinates</p>
                                                          <p className="text-xs text-secondary-500 mt-1">Shipping details are currently mirroring the billing profile.</p>
                                                     </div>
                                                </div>
                                            )}
                                       </div>
                                  </div>
                             </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Creating...' : 'Register Agency'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
