'use client';

import { useState, useEffect } from 'react';
import CRMClientLayout from '../CRMClientLayout';
import { CRMPageShell } from '@/components/crm/CRMPageShell';
import { BarChart3, Users, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CRMInsightsPage() {
    const [stats, setStats] = useState({
        customers: 0,
        institutions: 0,
        agencies: 0,
        subscriptions: 0,
        loading: true
    });

    useEffect(() => {
        // Fetch simple aggregated stats for Insights page overviews
        Promise.all([
            fetch('/api/customers?limit=1&type=INDIVIDUAL').then(r => r.json()),
            fetch('/api/customers?limit=1&type=INSTITUTION').then(r => r.json()),
            fetch('/api/customers?limit=1&type=AGENCY').then(r => r.json()),
        ]).then(([inds, insts, ags]) => {
            setStats({
                customers: inds.pagination?.total || 0,
                institutions: insts.pagination?.total || 0,
                agencies: ags.pagination?.total || 0,
                subscriptions: 0, // Mocked for now; real tracking requires complex queries across user scope
                loading: false
            });
        }).catch(() => {
            setStats(s => ({ ...s, loading: false }));
        });
    }, []);

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="CRM Insights"
                subtitle="High-level metrics, customer groups, and forecasting."
                icon={<BarChart3 className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Insights' }]}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-primary-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <Users size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Individuals</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.customers}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-success-600">
                            <TrendingUp size={12} /> Active contacts
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-emerald-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <Building2 size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Institutions</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.institutions}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                            <TrendingUp size={12} /> Registered organizations
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-amber-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <BarChart3 size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Agencies</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.agencies}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-600">
                            <TrendingUp size={12} /> Channel partners
                        </div>
                    </div>
                </div>

                <div className="bg-warning-50 border border-warning-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-warning-100 text-warning-600 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-warning-900 uppercase tracking-wide">Insights Engine Under Construction</h3>
                            <p className="text-xs text-warning-700 leading-relaxed mt-1">
                                We are rolling out advanced forecasting, relationship grouping (e.g. University -&gt; Colleges maps), and renewal probability scores in the upcoming v2.1 CRM update. Please track direct relationships through the Customers tab for now.
                            </p>
                        </div>
                    </div>
                    <Link href="/dashboard/crm/customers" className="whitespace-nowrap px-6 py-3 bg-white text-warning-700 border border-warning-200 hover:bg-warning-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Back to Customers
                    </Link>
                </div>
            </CRMPageShell>
        </CRMClientLayout>
    );
}
