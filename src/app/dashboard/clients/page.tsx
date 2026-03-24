'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';

type AgencyClient = {
    id: string;
    name: string;
    organizationName: string;
    activeSubscriptionCount: number;
    totalSubscriptionCount: number;
    latestSubscriptionStatus: string;
    lastRenewalDate: string | null;
    lastActivityAt: string;
};

export default function ClientsPage() {
    const [userRole, setUserRole] = useState('AGENCY');
    const [clients, setClients] = useState<AgencyClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [summary, setSummary] = useState({
        totalClients: 0,
        activeClients: 0,
        activeSubscriptions: 0,
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }

        const controller = new AbortController();

        const fetchClients = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const params = new URLSearchParams();
                if (search.trim()) params.set('search', search.trim());
                if (status) params.set('status', status);

                const res = await fetch(`/api/agency/clients?${params.toString()}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch agency clients');
                }

                const data = await res.json();
                setClients(data.data || []);
                setSummary(
                    data.summary || {
                        totalClients: 0,
                        activeClients: 0,
                        activeSubscriptions: 0,
                    }
                );
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to load agency clients', error);
                    setClients([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchClients();

        return () => controller.abort();
    }, [search, status]);

    const statusTone = (value: string) => {
        if (value === 'ACTIVE') return 'badge-success';
        if (value === 'PENDING_PAYMENT' || value === 'REQUESTED') return 'badge-warning';
        if (value === 'EXPIRED' || value === 'CANCELLED') return 'badge-danger';
        return 'badge-secondary';
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">My Clients</h1>
                        <p className="text-secondary-600">Managing accounts and subscriptions for your partners</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Total Clients</p>
                        <p className="text-3xl font-black text-secondary-900">{summary.totalClients}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Active Clients</p>
                        <p className="text-3xl font-black text-success-600">{summary.activeClients}</p>
                    </div>
                    <div className="card-premium">
                        <p className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Active Subscriptions</p>
                        <p className="text-3xl font-black text-primary-600">{summary.activeSubscriptions}</p>
                    </div>
                </div>

                <div className="card-premium">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search client, organization, institution, or email..."
                            className="input"
                        />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="input"
                        >
                            <option value="">All Subscription States</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PENDING_PAYMENT">Pending Payment</option>
                            <option value="REQUESTED">Requested</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Client Name</th>
                                    <th>Organization</th>
                                    <th>Active Subs</th>
                                    <th>Status</th>
                                    <th>Last Renewal</th>
                                    <th>Last Activity</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-12 animate-pulse">Loading clients...</td></tr>
                                ) : clients.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-secondary-500">
                                            No clients found for the current filters.
                                        </td>
                                    </tr>
                                ) : clients.map(c => (
                                    <tr key={c.id}>
                                        <td className="font-bold text-secondary-900">{c.name}</td>
                                        <td className="text-sm text-secondary-500">{c.organizationName}</td>
                                        <td className="font-bold text-primary-600">
                                            {c.activeSubscriptionCount}
                                            <span className="text-secondary-400 font-medium ml-1">/ {c.totalSubscriptionCount}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusTone(c.latestSubscriptionStatus)}`}>
                                                {c.latestSubscriptionStatus.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="text-sm text-secondary-500">
                                            {c.lastRenewalDate ? <FormattedDate date={c.lastRenewalDate} /> : '—'}
                                        </td>
                                        <td className="text-sm text-secondary-500"><FormattedDate date={c.lastActivityAt} /></td>
                                        <td className="text-right">
                                            <Link href={`/dashboard/customers/${c.id}`} className="p-2 border border-secondary-100 rounded-lg hover:bg-secondary-50 transition-colors inline-block text-xs font-bold uppercase tracking-widest text-secondary-600">
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
