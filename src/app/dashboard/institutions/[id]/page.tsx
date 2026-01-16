'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Phone, Globe, MapPin } from 'lucide-react';
import InstitutionActivityDashboard from '@/components/dashboard/InstitutionActivityDashboard';

export default function InstitutionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [institution, setInstitution] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

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
                                <Image src={institution.logo} alt={institution.name} width={64} height={64} className="rounded-xl object-cover" />
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
                    {['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole) && (
                        <Link href={`/dashboard/institutions`} className="btn btn-secondary">
                            Manage Institutions
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Unified Dashboard (LHS 3 Chunks) */}
                    <div className="lg:col-span-3">
                        <InstitutionActivityDashboard institutionId={institution.id} />
                    </div>

                    {/* Sidebar with Basic Info */}
                    <div className="space-y-6">
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 border-l-4 border-primary-500 pl-3">Institution Info</h2>
                            <div className="space-y-4">
                                {institution.category && (
                                    <div>
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Category</p>
                                        <p className="text-sm font-bold text-secondary-900">{institution.category}</p>
                                    </div>
                                )}
                                {institution.website && (
                                    <div>
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Website</p>
                                        <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                                            <Globe size={14} /> Visit Website
                                        </a>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Emails</p>
                                    <p className="text-sm font-bold text-secondary-900">{institution.primaryEmail}</p>
                                    {institution.secondaryEmail && <p className="text-xs text-secondary-500">{institution.secondaryEmail}</p>}
                                </div>
                                <div className="pt-4 border-t border-secondary-100">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none mb-1">Location</p>
                                    <div className="flex items-start gap-2 mt-1">
                                        <MapPin size={14} className="text-secondary-400 mt-0.5" />
                                        <p className="text-sm text-secondary-600">
                                            {institution.city}, {institution.state}<br />
                                            <span className="font-bold">{institution.country}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {institution.notes && (
                            <div className="card-premium p-6">
                                <h2 className="text-lg font-black text-secondary-900 mb-2">Internal Notes</h2>
                                <p className="text-sm text-secondary-600 leading-relaxed italic">
                                    &quot;{institution.notes}&quot;
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
