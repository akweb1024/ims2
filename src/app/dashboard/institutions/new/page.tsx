'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Building2, ArrowLeft, Save, Globe, MapPin, Phone, Mail, User } from 'lucide-react';
import Link from 'next/link';

export default function NewInstitutionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [executives, setExecutives] = useState<any[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isFetchingBillingPincode, setIsFetchingBillingPincode] = useState(false);
    const [isFetchingShippingPincode, setIsFetchingShippingPincode] = useState(false);
    const [isShippingSame, setIsShippingSame] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'UNIVERSITY',
        category: '',
        universityCategory: '',
        universityId: '',
        establishedYear: '',
        accreditation: '',
        primaryEmail: '',
        secondaryEmail: '',
        primaryPhone: '',
        secondaryPhone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        billingAddress: '',
        billingCity: '',
        billingState: '',
        billingCountry: 'India',
        billingPincode: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingCountry: 'India',
        shippingPincode: '',
        totalStudents: '',
        totalFaculty: '',
        totalStaff: '',
        libraryBudget: '',
        ipRange: '',
        notes: '',
        domain: '',
        logo: '',
        assignedToUserId: ''
    });

    const institutionTypes = ['UNIVERSITY', 'COLLEGE', 'RESEARCH_INSTITUTE', 'OTHER'];
    
    const universityCategories = [
        'CENTRAL_UNIVERSITY', 'STATE_UNIVERSITY', 'GOVERNMENT_UNIVERSITY', 
        'DEEMED_UNIVERSITY', 'PRIVATE_UNIVERSITY'
    ];

    const [universities, setUniversities] = useState<any[]>([]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            setUserRole(userData.role);
            if (['SUPER_ADMIN', 'MANAGER'].includes(userData.role)) {
                fetch('/api/users?limit=100', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        const users = Array.isArray(data) ? data : (data.data || []);
                        setExecutives(users.filter((u: any) => ['EXECUTIVE', 'MANAGER', 'TEAM_LEADER'].includes(u.role)));
                    })
                    .catch(err => console.error('Failed to fetch staff', err));
            }
        }
        
        // Fetch universities for affiliation dropdown
        fetch('/api/institutions?type=UNIVERSITY&limit=1000')
            .then(res => res.json())
            .then(data => {
                const unis = Array.isArray(data) ? data : (data.data || []);
                setUniversities(unis);
            })
            .catch(console.error);
    }, []);

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
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/institutions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    address: formData.billingAddress,
                    city: formData.billingCity,
                    state: formData.billingState,
                    country: formData.billingCountry,
                    pincode: formData.billingPincode,
                    shippingAddress: isShippingSame ? formData.billingAddress : formData.shippingAddress,
                    shippingCity: isShippingSame ? formData.billingCity : formData.shippingCity,
                    shippingState: isShippingSame ? formData.billingState : formData.shippingState,
                    shippingCountry: isShippingSame ? formData.billingCountry : formData.shippingCountry,
                    shippingPincode: isShippingSame ? formData.billingPincode : formData.shippingPincode,
                    universityCategory: formData.type === 'UNIVERSITY' ? formData.universityCategory : null,
                    universityId: formData.type === 'COLLEGE' ? formData.universityId : null
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMessage('Institution created successfully! Redirecting...');
                setTimeout(() => {
                    router.push('/dashboard/institutions');
                }, 2000);
            } else {
                setErrorMessage(data.error || 'Failed to create institution. Please check all required fields.');
            }
        } catch (error: any) {
            console.error('Error saving institution:', error);
            setErrorMessage(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/institutions"
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-secondary-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Add New Institution</h1>
                        <p className="text-secondary-600">Enter organization details to create a new profile</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Feedback Messages */}
                    {errorMessage && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
                            <p className="text-sm font-bold text-red-800">{errorMessage}</p>
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                            <p className="text-sm font-bold text-green-800">{successMessage}</p>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-secondary-100">
                            <Building2 className="text-primary-600" size={20} />
                            <h2 className="text-lg font-black text-secondary-900">Basic Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Institution Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Full Legal Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Unique Code *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., MIT-001"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Organization Type *</label>
                                <select
                                    className="input"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    required
                                >
                                    {institutionTypes.map(type => (
                                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Category</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Engineering, Art, Medical"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                            
                            {formData.type === 'UNIVERSITY' && (
                                <div>
                                    <label className="label text-emerald-700 font-bold">University Category *</label>
                                    <select
                                        className="input border-emerald-200 focus:ring-emerald-50"
                                        value={formData.universityCategory}
                                        onChange={(e) => setFormData({ ...formData, universityCategory: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {universityCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.type === 'COLLEGE' && (
                                <div>
                                    <label className="label text-indigo-700 font-bold">Affiliated University</label>
                                    <select
                                        className="input border-indigo-200 focus:ring-indigo-50"
                                        value={formData.universityId}
                                        onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
                                    >
                                        <option value="">-- Independent/None --</option>
                                        {universities.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="label">Primary Domain</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., education.gov"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Year Established</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="YYYY"
                                    value={formData.establishedYear}
                                    onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ownership & Assignment */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-secondary-100">
                            <User className="text-primary-600" size={20} />
                            <h2 className="text-lg font-black text-secondary-900">Assignment & Management</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Assigned Executive</label>
                                <select
                                    className="input"
                                    value={formData.assignedToUserId}
                                    onChange={(e) => setFormData({ ...formData, assignedToUserId: e.target.value })}
                                >
                                    <option value="">-- No Assignment --</option>
                                    {executives.map(ex => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.email} ({ex.role})
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-secondary-500 font-medium italic">
                                    The executive who will manage this institution.
                                </p>
                            </div>
                            <div>
                                <label className="label">Accreditation</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., NAAC A++, ISO"
                                    value={formData.accreditation}
                                    onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-secondary-100">
                            <Phone className="text-primary-600" size={20} />
                            <h2 className="text-lg font-black text-secondary-900">Contact Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Primary Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                    <input
                                        type="email"
                                        className="input pl-10"
                                        placeholder="admin@institution.com"
                                        value={formData.primaryEmail}
                                        onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Primary Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                    <input
                                        type="tel"
                                        className="input pl-10"
                                        placeholder="+91..."
                                        value={formData.primaryPhone}
                                        onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Official Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                    <input
                                        type="url"
                                        className="input pl-10"
                                        placeholder="https://..."
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">IP Range (for library access)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., 192.168.1.1-50"
                                    value={formData.ipRange}
                                    onChange={(e) => setFormData({ ...formData, ipRange: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Info */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                         {/* Billing Address */}
                         <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                              <div className="p-8 border-b border-secondary-50 bg-indigo-50/20 flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                                        <MapPin size={24} />
                                   </div>
                                   <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1 leading-none">Billing</span>
                                        <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Billing Address</h3>
                                   </div>
                              </div>
                              <div className="p-10 space-y-8">
                                    <div>
                                        <label className="label">Complete Address</label>
                                        <textarea
                                            className="input h-20"
                                            placeholder="Street, Building, etc."
                                            value={formData.billingAddress}
                                            onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
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
                         <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 relative overflow-hidden">
                              <div className="p-8 border-b border-secondary-50 bg-blue-50/20 flex items-center justify-between">
                                   <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100">
                                             <Globe size={24} />
                                        </div>
                                        <div className="flex flex-col">
                                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 mb-1 leading-none">Shipping</span>
                                             <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight italic">Shipping Address</h3>
                                        </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-secondary-400 uppercase tracking-widest leading-none">Mirror Billing</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsShippingSame(!isShippingSame)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-500 ease-in-out focus:outline-none ${isShippingSame ? 'bg-blue-600' : 'bg-secondary-200'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition duration-500 ease-in-out ${isShippingSame ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                   </div>
                              </div>
                              <div className="p-10">
                                   {!isShippingSame ? (
                                       <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                            <div>
                                                <label className="label">Complete Address</label>
                                                <textarea
                                                    className="input h-20"
                                                    placeholder="Street, Building, etc."
                                                    value={formData.shippingAddress}
                                                    onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
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
                                       <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                            <div className="w-16 h-16 rounded-3xl bg-secondary-50 flex items-center justify-center animate-bounce-slow">
                                                 <Globe className="text-secondary-400" size={32} />
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

                    {/* Stats */}
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-secondary-100">
                            <Globe className="text-primary-600" size={20} />
                            <h2 className="text-lg font-black text-secondary-900">Capacity & Budget</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="label">Total Students</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.totalStudents}
                                    onChange={(e) => setFormData({ ...formData, totalStudents: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Total Faculty</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.totalFaculty}
                                    onChange={(e) => setFormData({ ...formData, totalFaculty: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Library Budget (Annually)</label>
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="INR"
                                    value={formData.libraryBudget}
                                    onChange={(e) => setFormData({ ...formData, libraryBudget: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="card-premium p-6">
                        <label className="label font-black text-secondary-900">Internal Notes</label>
                        <textarea
                            className="input h-32"
                            placeholder="Add any additional context or background for this institution..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t border-secondary-200">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn btn-secondary px-8 font-bold"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary px-12 flex items-center gap-2 font-black"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Institution
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
