'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [user, setUser] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });
    const router = useRouter();

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = `/api/support/tickets?page=${pagination.page}&limit=${pagination.limit}${statusFilter ? `&status=${statusFilter}` : ''}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setStats(data.stats || {});
                if (data.pagination) setPagination(data.pagination);
            }
        } catch (err) {
            console.error('Fetch tickets error:', err);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, statusFilter]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);
            setUserRole(u.role);
            fetchTickets();
        }
    }, [fetchTickets]);

    const handleAssignToMe = async (ticketId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignedToId: user.id, status: 'IN_PROGRESS' })
            });
            if (res.ok) fetchTickets();
        } catch (err) { console.error(err); }
    };

    const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchTickets();
        } catch (err) { console.error(err); }
    };

    const getSLADetails = (createdAt: string, status: string) => {
        if (status === 'RESOLVED' || status === 'CLOSED') return { label: 'Settled', color: 'text-secondary-400' };
        const hrs = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
        if (hrs < 4) return { label: 'Healthy', color: 'text-success-600' };
        if (hrs < 24) return { label: 'Due Soon', color: 'text-warning-600' };
        return { label: 'SLA Breached', color: 'text-danger-600' };
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Support Command Center</h1>
                        <p className="text-secondary-500 font-medium">Resolution tracking and client satisfaction management.</p>
                    </div>
                    <Link href="/dashboard/tickets/new" className="btn btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary-200">
                        <span>+</span> Launch New Ticket
                    </Link>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium border-t-4 border-t-primary-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Active (Open)</p>
                        <p className="text-3xl font-black text-secondary-900">{stats.OPEN || 0}</p>
                    </div>
                    <div className="card-premium border-t-4 border-t-warning-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">In Pipeline</p>
                        <p className="text-3xl font-black text-secondary-900">{stats.IN_PROGRESS || 0}</p>
                    </div>
                    <div className="card-premium border-t-4 border-t-success-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Resolved (MTD)</p>
                        <p className="text-3xl font-black text-secondary-900">{stats.RESOLVED || 0}</p>
                    </div>
                    <div className="card-premium bg-secondary-50 border-0">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Overall Closed</p>
                        <p className="text-3xl font-black text-secondary-400">{stats.CLOSED || 0}</p>
                    </div>
                </div>

                <div className="flex gap-4 items-center pb-2 border-b border-secondary-100">
                    <button onClick={() => setStatusFilter('')} className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${statusFilter === '' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}>All Inquiries</button>
                    <button onClick={() => setStatusFilter('OPEN')} className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${statusFilter === 'OPEN' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}>New</button>
                    <button onClick={() => setStatusFilter('IN_PROGRESS')} className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${statusFilter === 'IN_PROGRESS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}>Under Review</button>
                    <button onClick={() => setStatusFilter('RESOLVED')} className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${statusFilter === 'RESOLVED' ? 'border-primary-600 text-primary-600' : 'border-transparent text-secondary-400 hover:text-secondary-600'}`}>Settled</button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="card-premium py-20 text-center text-secondary-400 bg-secondary-50/50 border-dashed">
                        <div className="text-4xl mb-4">📫</div>
                        <p className="font-bold text-lg">Inbox clear. No pending tickets found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {tickets.map((t) => {
                            const sla = getSLADetails(t.createdAt, t.status);
                            return (
                                <div key={t.id} className="card-premium group hover:border-primary-200 hover:shadow-xl transition-all p-0 overflow-hidden flex flex-col md:flex-row">
                                    <div className={`w-2 md:w-3 shrink-0 ${t.priority === 'URGENT' ? 'bg-danger-500' : t.priority === 'HIGH' ? 'bg-warning-500' : 'bg-primary-500'}`}></div>
                                    <div className="flex-1 p-6 flex flex-col md:flex-row justify-between gap-6">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded ${t.priority === 'URGENT' ? 'bg-danger-100 text-danger-700' : 'bg-secondary-100 text-secondary-600'}`}>
                                                    {t.priority} Priority
                                                </span>
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">#{t.id.slice(0, 8)}</span>
                                                <span className={`text-[10px] font-black uppercase ml-auto md:ml-0 ${sla.color}`}>{sla.label}</span>
                                            </div>
                                            <Link href={`/dashboard/tickets/${t.id}`}>
                                                <h3 className="text-xl font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{t.subject}</h3>
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                                                <p className="text-secondary-500"><span className="font-bold text-secondary-400 uppercase text-[9px] tracking-widest mr-2">Client</span> {t.customerProfile?.name}</p>
                                                <p className="text-secondary-500"><span className="font-bold text-secondary-400 uppercase text-[9px] tracking-widest mr-2">Assigned</span> {t.assignedTo?.email || 'Unassigned'}</p>
                                                <p className="text-secondary-400 font-medium italic">{new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-secondary-100 pt-4 md:pt-0 md:pl-8">
                                            <select
                                                value={t.status}
                                                onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl outline-none transition-all cursor-pointer ${t.status === 'OPEN' ? 'bg-primary-50 text-primary-600 hover:bg-primary-100' :
                                                    t.status === 'IN_PROGRESS' ? 'bg-warning-50 text-warning-600 hover:bg-warning-100' :
                                                        'bg-secondary-100 text-secondary-500 hover:bg-secondary-200'
                                                    }`}
                                            >
                                                <option value="OPEN">Open</option>
                                                <option value="IN_PROGRESS">Processing</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>

                                            <div className="flex gap-2">
                                                {!t.assignedToId && (
                                                    <button onClick={() => handleAssignToMe(t.id)} className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:underline">Claim</button>
                                                )}
                                                {t.chatRoomId && (
                                                    <Link href={`/dashboard/chat?roomId=${t.chatRoomId}`} className="btn btn-secondary py-2 px-4 text-[10px] font-black uppercase tracking-widest">Join Chat</Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && tickets.length > 0 && (
                    <div className="px-6 py-4 bg-white rounded-2xl shadow-sm border border-secondary-100 flex items-center justify-between">
                        <div className="text-sm text-secondary-500">
                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> tickets
                        </div>
                        <div className="flex space-x-2">
                            <button
                                className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50 transition-colors"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <button
                                className="px-3 py-1 bg-white border border-secondary-200 rounded-md text-sm disabled:opacity-50 hover:bg-secondary-50 transition-colors"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
