'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { ArrowLeft, Users, BookOpen, MessageSquare, TrendingUp, Mail, Phone, Globe, MapPin, Calendar } from 'lucide-react';

export default function InstitutionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [institution, setInstitution] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setUserRole(JSON.parse(user).role);
        }
        if (params.id) {
            fetchInstitution();
        }
    }, [params.id]);

    const fetchInstitution = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions?id=${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInstitution(data);
            }
        } catch (error) {
            console.error('Error fetching institution:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-secondary-500 font-bold">Loading institution details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!institution) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-black text-secondary-400">Institution Not Found</h2>
                    <button onClick={() => router.back()} className="btn btn-primary mt-4">Go Back</button>
                </div>
            </DashboardLayout>
        );
    }

    const designationCounts = institution.customers?.reduce((acc: any, customer: any) => {
        const designation = customer.designation || 'OTHER';
        acc[designation] = (acc[designation] || 0) + 1;
        return acc;
    }, {});

    const totalRevenue = institution.subscriptions?.reduce((sum: number, sub: any) => sum + (sub.total || 0), 0) || 0;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-lg">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-4">
                            {institution.logo && (
                                <img src={institution.logo} alt={institution.name} className="w-16 h-16 rounded-xl object-cover" />
                            )}
                            <div>
                                <h1 className="text-3xl font-black text-secondary-900">{institution.name}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-black rounded-full">
                                        {institution.code}
                                    </span>
                                    <span className="px-3 py-1 bg-secondary-100 text-secondary-700 text-xs font-black rounded-full">
                                        {institution.type.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href={`/dashboard/institutions`} className="btn btn-secondary">
                        Edit Institution
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Customers</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{institution._count?.customers || 0}</p>
                            </div>
                            <Users className="text-primary-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-success-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Subscriptions</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{institution._count?.subscriptions || 0}</p>
                            </div>
                            <BookOpen className="text-success-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Communications</p>
                                <p className="text-3xl font-black text-secondary-900 mt-2">{institution._count?.communications || 0}</p>
                            </div>
                            <MessageSquare className="text-warning-500" size={40} />
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-accent-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-secondary-400 uppercase tracking-widest">Total Revenue</p>
                                <p className="text-2xl font-black text-secondary-900 mt-2">₹{totalRevenue.toLocaleString()}</p>
                            </div>
                            <TrendingUp className="text-accent-500" size={40} />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-secondary-100 w-fit">
                    {['overview', 'customers', 'subscriptions', 'communications'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'text-secondary-400 hover:bg-secondary-50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Institution Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="card-premium p-6">
                                <h2 className="text-xl font-black text-secondary-900 mb-4">Institution Details</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {institution.category && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Category</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.category}</p>
                                        </div>
                                    )}
                                    {institution.establishedYear && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Established</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.establishedYear}</p>
                                        </div>
                                    )}
                                    {institution.accreditation && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Accreditation</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.accreditation}</p>
                                        </div>
                                    )}
                                    {institution.totalStudents && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Total Students</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.totalStudents.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {institution.totalFaculty && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Total Faculty</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.totalFaculty.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {institution.totalStaff && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Total Staff</p>
                                            <p className="text-sm font-bold text-secondary-900">{institution.totalStaff.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {institution.libraryBudget && (
                                        <div>
                                            <p className="text-xs font-bold text-secondary-500">Library Budget</p>
                                            <p className="text-sm font-bold text-secondary-900">₹{institution.libraryBudget.toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer Breakdown by Designation */}
                            <div className="card-premium p-6">
                                <h2 className="text-xl font-black text-secondary-900 mb-4">Customer Breakdown by Designation</h2>
                                <div className="space-y-3">
                                    {Object.entries(designationCounts || {}).map(([designation, count]: any) => (
                                        <div key={designation} className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-secondary-700">{designation.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-32 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500"
                                                        style={{ width: `${(count / (institution.customers?.length || 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-black text-secondary-900 w-8 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Contact & Address */}
                        <div className="space-y-6">
                            <div className="card-premium p-6">
                                <h2 className="text-xl font-black text-secondary-900 mb-4">Contact Information</h2>
                                <div className="space-y-3">
                                    {institution.primaryEmail && (
                                        <div className="flex items-start gap-3">
                                            <Mail className="text-primary-500 mt-1" size={18} />
                                            <div>
                                                <p className="text-xs font-bold text-secondary-500">Primary Email</p>
                                                <a href={`mailto:${institution.primaryEmail}`} className="text-sm font-bold text-primary-600 hover:underline">
                                                    {institution.primaryEmail}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {institution.primaryPhone && (
                                        <div className="flex items-start gap-3">
                                            <Phone className="text-success-500 mt-1" size={18} />
                                            <div>
                                                <p className="text-xs font-bold text-secondary-500">Primary Phone</p>
                                                <a href={`tel:${institution.primaryPhone}`} className="text-sm font-bold text-secondary-900">
                                                    {institution.primaryPhone}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {institution.website && (
                                        <div className="flex items-start gap-3">
                                            <Globe className="text-accent-500 mt-1" size={18} />
                                            <div>
                                                <p className="text-xs font-bold text-secondary-500">Website</p>
                                                <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary-600 hover:underline">
                                                    {institution.website}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card-premium p-6">
                                <h2 className="text-xl font-black text-secondary-900 mb-4">Address</h2>
                                <div className="flex items-start gap-3">
                                    <MapPin className="text-danger-500 mt-1" size={18} />
                                    <div className="text-sm text-secondary-700">
                                        {institution.address && <p>{institution.address}</p>}
                                        <p>{[institution.city, institution.state, institution.pincode].filter(Boolean).join(', ')}</p>
                                        <p className="font-bold">{institution.country}</p>
                                    </div>
                                </div>
                            </div>

                            {institution.notes && (
                                <div className="card-premium p-6">
                                    <h2 className="text-xl font-black text-secondary-900 mb-4">Notes</h2>
                                    <p className="text-sm text-secondary-700">{institution.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div className="card-premium overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr className="text-xs uppercase font-black text-secondary-400 border-b border-secondary-50">
                                    <th className="pb-4">Customer</th>
                                    <th className="pb-4">Designation</th>
                                    <th className="pb-4">Email</th>
                                    <th className="pb-4">Subscriptions</th>
                                    <th className="pb-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {institution.customers?.map((customer: any) => (
                                    <tr key={customer.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="py-4">
                                            <p className="font-bold text-secondary-900">{customer.name}</p>
                                        </td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-black rounded">
                                                {customer.designation?.replace('_', ' ') || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm text-secondary-600">{customer.user?.email}</p>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm font-black text-secondary-900">{customer.subscriptions?.length || 0}</p>
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link href={`/dashboard/customers/${customer.id}`} className="btn btn-sm btn-primary">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(!institution.customers || institution.customers.length === 0) && (
                            <div className="text-center py-20 text-secondary-400">
                                <Users size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="font-bold">No customers found</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'subscriptions' && (
                    <div className="card-premium overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr className="text-xs uppercase font-black text-secondary-400 border-b border-secondary-50">
                                    <th className="pb-4">Customer</th>
                                    <th className="pb-4">Period</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4">Amount</th>
                                    <th className="pb-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {institution.subscriptions?.map((subscription: any) => (
                                    <tr key={subscription.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="py-4">
                                            <p className="font-bold text-secondary-900">{subscription.customerProfile?.name}</p>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm text-secondary-600">
                                                {new Date(subscription.startDate).toLocaleDateString()} - {new Date(subscription.endDate).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 text-xs font-black rounded ${subscription.status === 'ACTIVE' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                                                }`}>
                                                {subscription.status}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm font-black text-secondary-900">₹{subscription.total.toLocaleString()}</p>
                                        </td>
                                        <td className="py-4 text-right">
                                            <Link href={`/dashboard/subscriptions/${subscription.id}`} className="btn btn-sm btn-primary">
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {(!institution.subscriptions || institution.subscriptions.length === 0) && (
                            <div className="text-center py-20 text-secondary-400">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="font-bold">No subscriptions found</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'communications' && (
                    <div className="card-premium overflow-hidden">
                        <div className="space-y-4 p-6">
                            {institution.communications?.map((comm: any) => (
                                <div key={comm.id} className="border-l-4 border-primary-500 bg-secondary-50 p-4 rounded-r-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-black text-secondary-900">{comm.subject}</h3>
                                            <p className="text-xs text-secondary-500 mt-1">
                                                {comm.channel} • {new Date(comm.date).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-black rounded ${comm.type === 'EMAIL' ? 'bg-primary-100 text-primary-700' :
                                                comm.type === 'CALL' ? 'bg-success-100 text-success-700' :
                                                    'bg-secondary-100 text-secondary-700'
                                            }`}>
                                            {comm.type}
                                        </span>
                                    </div>
                                    <p className="text-sm text-secondary-700">{comm.notes}</p>
                                    {comm.outcome && (
                                        <p className="text-xs text-secondary-500 mt-2">Outcome: {comm.outcome}</p>
                                    )}
                                </div>
                            ))}
                            {(!institution.communications || institution.communications.length === 0) && (
                                <div className="text-center py-20 text-secondary-400">
                                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-bold">No communications found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
