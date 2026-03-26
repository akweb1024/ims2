'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import {
    Building2,
    ArrowLeft,
    Globe,
    MapPin,
    Landmark,
    Users,
    TrendingUp,
    Network,
    Briefcase,
} from 'lucide-react';
import InstitutionActivityDashboard from '@/components/dashboard/InstitutionActivityDashboard';
import { CRMPageShell } from '@/components/crm/CRMPageShell';

export default function InstitutionDetailPage() {
    const params = useParams();
    const [institution, setInstitution] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    const fetchInstitution = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/institutions?id=${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
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
    }, [params.id]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setUserRole(JSON.parse(user).role);
        }
        if (params.id) {
            fetchInstitution();
        }
    }, [params.id, fetchInstitution]);

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-secondary-500 font-bold">Loading institution intelligence...</p>
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
                    <Link href="/dashboard/crm/partners?tab=institutions" className="btn btn-primary mt-4">
                        Back to Partner Institutions
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const createInvoiceHref = `/dashboard/crm/invoices/new?institutionId=${institution.id}&context=institution`;
    const identityBadges = [
        { label: institution.code, tone: 'bg-primary-50 text-primary-700 border-primary-100' },
        { label: institution.type.replace(/_/g, ' '), tone: 'bg-secondary-100 text-secondary-700 border-secondary-200' },
        { label: institution.affiliationStatus?.replace(/_/g, ' ') || 'SELF AFFILIATED', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    ];
    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📋', hint: 'Summary and KPI view' },
        { id: 'affiliations', name: 'Affiliations', icon: '🏛️', hint: 'University and network links' },
        { id: 'customers', name: 'Customers', icon: '👥', hint: 'Paid customers and billing' },
        { id: 'activity', name: 'Activity', icon: '📈', hint: 'Operational activity view' },
        { id: 'profile', name: 'Profile', icon: '🧾', hint: 'Institution master data' },
    ];

    const actions = (
        <>
            <Link href="/dashboard/crm/partners?tab=institutions" className="btn btn-secondary bg-white">
                <ArrowLeft className="w-4 h-4" />
                Back to Matrix
            </Link>
            <Link href={createInvoiceHref} className="btn btn-primary">
                Create Invoice
            </Link>
        </>
    );

    const renderAffiliationSection = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="crm-card p-5">
                    <div className="flex items-center gap-3">
                        <Landmark className="w-5 h-5 text-primary-600" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Affiliation Model</div>
                            <div className="mt-1 text-lg font-black text-secondary-900">{institution.affiliationStatus?.replace(/_/g, ' ') || 'SELF AFFILIATED'}</div>
                        </div>
                    </div>
                </div>
                <div className="crm-card p-5">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-600" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Paid Customers</div>
                            <div className="mt-1 text-lg font-black text-secondary-900">{institution.analytics?.paidCustomerCount || 0}</div>
                        </div>
                    </div>
                </div>
                <div className="crm-card p-5">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Affiliate Revenue</div>
                            <div className="mt-1 text-lg font-black text-secondary-900">₹{Math.round(institution.analytics?.affiliateRevenue || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div className="crm-card p-5">
                    <div className="flex items-center gap-3">
                        <Network className="w-5 h-5 text-purple-600" />
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Affiliated Paid Customers</div>
                            <div className="mt-1 text-lg font-black text-secondary-900">{institution.analytics?.affiliatedPaidCustomerCount || 0}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                <div className="crm-card p-6">
                    <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Affiliation Intelligence</h2>
                    <div className="space-y-4">
                        {institution.university ? (
                            <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400 mb-1">Affiliated To</div>
                                <div className="text-lg font-black text-secondary-900">{institution.university.name}</div>
                                <div className="text-sm text-secondary-500">{institution.university.code} • {institution.university.type?.replace(/_/g, ' ')}</div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-500">
                                This record is currently acting as a university root or a self-affiliated institution.
                            </div>
                        )}

                        {institution.agency && (
                            <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400 mb-1">Agency Link</div>
                                <div className="text-lg font-black text-secondary-900">{institution.agency.organizationName || institution.agency.name}</div>
                                <div className="text-sm text-secondary-500">{institution.agency.primaryEmail}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="crm-card p-6">
                    <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Affiliated Institution List</h2>
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                        {institution.affiliates?.length ? institution.affiliates.map((affiliate: any) => (
                            <div key={affiliate.id} className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="font-black text-secondary-900">{affiliate.name}</div>
                                        <div className="text-xs text-secondary-500 uppercase tracking-widest">{affiliate.code} • {affiliate.type?.replace(/_/g, ' ')}</div>
                                    </div>
                                    <Link href={`/dashboard/institutions/${affiliate.id}`} className="text-xs font-black text-primary-600 hover:underline">
                                        View →
                                    </Link>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-xl bg-white p-3 border border-secondary-100">
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Customers</div>
                                        <div className="mt-1 font-black text-secondary-900">{affiliate._count?.customers || 0}</div>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 border border-secondary-100">
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Subscriptions</div>
                                        <div className="mt-1 font-black text-secondary-900">{affiliate._count?.subscriptions || 0}</div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="rounded-2xl border border-dashed border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-500">
                                No affiliated institutions are linked to this record yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    const renderCustomersSection = () => (
        <div className="crm-card p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                <h2 className="text-lg font-black text-secondary-900 border-l-4 border-primary-500 pl-3">Paid Customer Matrix</h2>
                <Link href={createInvoiceHref} className="btn btn-primary">
                    Create Invoice For Institution
                </Link>
            </div>
            <div className="space-y-3">
                {institution.linkedPaidCustomers?.length ? institution.linkedPaidCustomers.map((customer: any) => (
                    <div key={customer.id} className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="font-black text-secondary-900">{customer.name}</div>
                            <div className="text-sm text-secondary-500">{customer.organizationName || customer.primaryEmail}</div>
                            {customer.designation && (
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400 mt-1">{customer.designation.replace(/_/g, ' ')}</div>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
                            <div className="rounded-xl bg-white p-3 border border-secondary-100">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Revenue</div>
                                <div className="mt-1 font-black text-secondary-900">₹{Math.round(customer.revenue || 0).toLocaleString()}</div>
                            </div>
                            <div className="rounded-xl bg-white p-3 border border-secondary-100">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Subscriptions</div>
                                <div className="mt-1 font-black text-secondary-900">{customer.subscriptionCount || 0}</div>
                            </div>
                            <div className="rounded-xl bg-white p-3 border border-secondary-100">
                                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Latest Status</div>
                                <div className="mt-1 font-black text-secondary-900">{customer.latestStatus || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-500">
                        No paid customers are linked to this institution yet.
                    </div>
                )}
            </div>
        </div>
    );

    const renderProfileSidebar = () => (
        <>
            <div className="crm-card p-6">
                <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Institution Profile</h2>
                <div className="space-y-4">
                    {institution.category && (
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.18em] leading-none mb-1">Category</p>
                            <p className="text-sm font-bold text-secondary-900">{institution.category}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.18em] leading-none mb-1">Affiliation Status</p>
                        <p className="text-sm font-bold text-secondary-900">{institution.affiliationStatus?.replace(/_/g, ' ') || 'SELF AFFILIATED'}</p>
                    </div>
                    {institution.website && (
                        <div>
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.18em] leading-none mb-1">Website</p>
                            <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                                <Globe size={14} /> Visit Website
                            </a>
                        </div>
                    )}
                    <div>
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.18em] leading-none mb-1">Emails</p>
                        <p className="text-sm font-bold text-secondary-900">{institution.primaryEmail || 'Not available'}</p>
                        {institution.secondaryEmail && <p className="text-xs text-secondary-500">{institution.secondaryEmail}</p>}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.18em] leading-none mb-1">Location</p>
                        <div className="flex items-start gap-2 mt-1">
                            <MapPin size={14} className="text-secondary-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-secondary-600">
                                {[institution.city, institution.state].filter(Boolean).join(', ') || 'Location not available'}<br />
                                <span className="font-bold">{institution.country || 'India'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="crm-card p-6">
                <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Network Notes</h2>
                <div className="space-y-4 text-sm text-secondary-600">
                    <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                        <div className="flex items-center gap-2 font-black text-secondary-900 mb-2">
                            <Briefcase size={16} className="text-primary-600" />
                            Relationship Summary
                        </div>
                        <p>
                            This profile now uses the CRM partner shell so the institution detail view stays aligned with the partner matrix and commercial workflows.
                        </p>
                    </div>
                    {institution.notes ? (
                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4 italic">
                            &quot;{institution.notes}&quot;
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-secondary-200 bg-secondary-50 p-4">
                            No internal notes added yet.
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title={institution.name}
                subtitle="Institution intelligence, affiliation mapping, linked customers, and revenue visibility."
                icon={<Building2 className="w-5 h-5" />}
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Partners', href: '/dashboard/crm/partners?tab=institutions' },
                    { label: institution.name }
                ]}
                actions={actions}
            >
                <div className="space-y-6">
                    <div className="crm-card p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className="w-20 h-20 rounded-3xl bg-white border-2 border-secondary-100 shadow-xl shadow-secondary-100/40 p-3 shrink-0">
                                    {institution.logo ? (
                                        <Image src={institution.logo} alt={institution.name} width={80} height={80} className="w-full h-full object-contain rounded-2xl" />
                                    ) : (
                                        <div className="w-full h-full rounded-2xl bg-secondary-50 flex items-center justify-center">
                                            <Building2 className="text-secondary-300" size={34} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-secondary-950 tracking-tight">{institution.name}</h1>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {identityBadges.map((badge, index) => (
                                            <span key={`${badge.label}-${index}`} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border ${badge.tone}`}>
                                                {badge.label}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary-600">
                                        {(institution.primaryEmail || institution.secondaryEmail) && (
                                            <div>
                                                <span className="font-black uppercase text-[10px] tracking-[0.18em] text-secondary-400 block mb-1">Email</span>
                                                <span>{institution.primaryEmail || institution.secondaryEmail}</span>
                                            </div>
                                        )}
                                        {(institution.city || institution.state || institution.country) && (
                                            <div>
                                                <span className="font-black uppercase text-[10px] tracking-[0.18em] text-secondary-400 block mb-1">Location</span>
                                                <span>{[institution.city, institution.state, institution.country].filter(Boolean).join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 lg:min-w-[340px]">
                                <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Paid Customers</div>
                                    <div className="mt-2 text-2xl font-black text-secondary-900">{institution.analytics?.paidCustomerCount || 0}</div>
                                </div>
                                <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Direct Revenue</div>
                                    <div className="mt-2 text-2xl font-black text-secondary-900">₹{Math.round(institution.analytics?.directRevenue || 0).toLocaleString()}</div>
                                </div>
                                <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Affiliated Institutions</div>
                                    <div className="mt-2 text-2xl font-black text-secondary-900">{institution.analytics?.affiliatedInstitutionCount || 0}</div>
                                </div>
                                <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">Revenue With Network</div>
                                    <div className="mt-2 text-2xl font-black text-secondary-900">₹{Math.round(institution.analytics?.revenueWithNetwork || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="crm-card p-3">
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                            isActive
                                                ? 'border-primary-200 bg-primary-50 shadow-sm'
                                                : 'border-secondary-100 bg-white hover:border-primary-100 hover:bg-primary-50/40'
                                        }`}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-secondary-400">{tab.icon} {tab.name}</div>
                                        <div className={`mt-1 text-sm font-black ${isActive ? 'text-primary-700' : 'text-secondary-900'}`}>{tab.name}</div>
                                        <div className="mt-1 text-xs text-secondary-500">{tab.hint}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-6">
                            {(activeTab === 'overview' || activeTab === 'affiliations') && renderAffiliationSection()}
                            {(activeTab === 'overview' || activeTab === 'customers') && renderCustomersSection()}
                            {(activeTab === 'overview' || activeTab === 'activity') && (
                                <InstitutionActivityDashboard institutionId={institution.id} />
                            )}
                        </div>

                        <div className="space-y-6">
                            {(activeTab === 'overview' || activeTab === 'profile') && renderProfileSidebar()}

                            {activeTab === 'customers' && (
                                <div className="crm-card p-6">
                                    <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Commercial Actions</h2>
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4 text-sm text-secondary-600">
                                            Use the institution context to create an invoice for an existing linked customer or initialize a new customer already mapped to this institution.
                                        </div>
                                        <Link href={createInvoiceHref} className="btn btn-primary w-full justify-center">
                                            Create Invoice
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CRMPageShell>
        </DashboardLayout>
    );
}
