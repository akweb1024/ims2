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

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'UNIVERSITY',
        category: '',
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

    const institutionTypes = [
        'UNIVERSITY', 'COLLEGE', 'SCHOOL', 'RESEARCH_INSTITUTE',
        'CORPORATE', 'LIBRARY', 'GOVERNMENT', 'HOSPITAL',
        'NGO', 'AGENCY', 'OTHER'
    ];

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
    }, []);

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
                body: JSON.stringify(formData)
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
                    <div className="card-premium p-6">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-secondary-100">
                            <MapPin className="text-primary-600" size={20} />
                            <h2 className="text-lg font-black text-secondary-900">Location Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="label">Complete Address</label>
                                <textarea
                                    className="input h-20"
                                    placeholder="Street, Building, etc."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">City</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">State / Province</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Country</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Pincode / Postal Code</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                />
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
