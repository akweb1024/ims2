'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchTicket();
    }, [id]);

    const fetchTicket = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTicket(await res.json());
            } else {
                router.push('/dashboard/tickets');
            }
        } catch (err) {
            console.error('Fetch ticket error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                const updated = await res.json();
                setTicket(updated);
            }
        } catch (err) {
            console.error('Update status error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAssignToMe = async () => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assignedToId: user.id, status: 'IN_PROGRESS' })
            });
            if (res.ok) {
                const updated = await res.json();
                setTicket(updated);
            }
        } catch (err) {
            console.error('Assign error:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinChat = () => {
        if (ticket.chatRoomId) {
            router.push(`/dashboard/chat?roomId=${ticket.chatRoomId}`);
        }
    };

    if (loading) return (
        <DashboardLayout userRole={user?.role}>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        </DashboardLayout>
    );

    if (!ticket) return null;

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className="text-primary-600 hover:text-primary-700 font-bold flex items-center transition-all"
                        >
                            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Tickets
                        </button>
                    </div>

                    <div className="card-premium p-8">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${ticket.priority === 'URGENT' ? 'bg-danger-100 text-danger-700' :
                                ticket.priority === 'HIGH' ? 'bg-warning-100 text-warning-700' :
                                    'bg-secondary-100 text-secondary-700'
                                }`}>
                                {ticket.priority} PRIORITY
                            </span>
                            <span className="text-secondary-400 font-bold text-sm">#{ticket.id.split('-')[0].toUpperCase()}</span>
                        </div>

                        <h1 className="text-3xl font-extrabold text-secondary-900 mb-4">{ticket.subject}</h1>

                        <div className="prose max-w-none text-secondary-700 whitespace-pre-wrap bg-secondary-50 p-6 rounded-2xl border border-secondary-100 mb-8">
                            {ticket.description}
                        </div>

                        <div className="flex flex-wrap gap-4 pt-6 border-t border-secondary-100">
                            {ticket.chatRoomId && (
                                <button
                                    onClick={handleJoinChat}
                                    className="btn btn-primary px-8 shadow-xl shadow-primary-200 bg-gradient-to-r from-primary-600 to-primary-700"
                                >
                                    💬 Open Discussion
                                </button>
                            )}

                            {!ticket.assignedToId && user?.role !== 'CUSTOMER' && (
                                <button
                                    onClick={handleAssignToMe}
                                    disabled={actionLoading}
                                    className="btn btn-secondary px-8"
                                >
                                    Claim This Ticket
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Timeline / Activity Section (Expansion Opportunity) */}
                    <div className="card-premium p-8">
                        <h3 className="text-xl font-bold text-secondary-900 mb-6">Activity History</h3>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-secondary-900">Ticket Created</p>
                                    <p className="text-xs text-secondary-500 mt-1">
                                        {new Date(ticket.createdAt).toLocaleString()} by {ticket.customerProfile?.name}
                                    </p>
                                </div>
                            </div>
                            {ticket.assignedTo && (
                                <div className="flex gap-4 border-l-2 border-secondary-100 ml-5 pl-7 pb-2 mt-[-8px]">
                                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 ml-[-20px]">
                                        👤
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-secondary-900">Assigned to {ticket.assignedTo.email}</p>
                                        <p className="text-xs text-secondary-500 mt-1">
                                            Status changed to IN PROGRESS
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 pb-2 border-b border-secondary-50">Ticket Status</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Current Status</label>
                                <select
                                    className={`w-full font-bold rounded-xl px-4 py-3 outline-none border-2 transition-all ${ticket.status === 'OPEN' ? 'bg-success-50 text-success-700 border-success-200' :
                                        ticket.status === 'IN_PROGRESS' ? 'bg-primary-50 text-primary-700 border-primary-200' :
                                            ticket.status === 'RESOLVED' ? 'bg-secondary-50 text-secondary-600 border-secondary-200' :
                                                'bg-secondary-100 text-secondary-400 border-secondary-200'
                                        }`}
                                    value={ticket.status}
                                    onChange={(e) => handleUpdateStatus(e.target.value)}
                                    disabled={actionLoading || user?.role === 'CUSTOMER'}
                                >
                                    <option value="OPEN">OPEN</option>
                                    <option value="IN_PROGRESS">IN PROGRESS</option>
                                    <option value="RESOLVED">RESOLVED</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
                                {user?.role === 'CUSTOMER' && (
                                    <p className="text-[10px] text-secondary-400 mt-2 italic">* Only support staff can change status</p>
                                )}
                            </div>

                            <div className="pt-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500">Created</span>
                                    <span className="font-medium text-secondary-900"><FormattedDate date={ticket.createdAt} /></span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-secondary-500">Last Updated</span>
                                    <span className="font-medium text-secondary-900"><FormattedDate date={ticket.updatedAt} /></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium p-6">
                        <h3 className="text-lg font-bold text-secondary-900 mb-4 pb-2 border-b border-secondary-50">Customer Profile</h3>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                                    {ticket.customerProfile?.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-secondary-900">{ticket.customerProfile?.name}</p>
                                    <p className="text-xs text-secondary-500">{ticket.customerProfile?.primaryEmail}</p>
                                </div>
                            </div>
                            <Link
                                href={`/dashboard/customers/${ticket.customerProfileId}`}
                                className="btn btn-secondary w-full text-xs font-bold"
                            >
                                View Full Profile
                            </Link>
                        </div>
                    </div>

                    {ticket.assignedTo && (
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4 pb-2 border-b border-secondary-50">Assigned Agent</h3>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center text-secondary-600">
                                    👤
                                </div>
                                <div>
                                    <p className="font-bold text-secondary-900">{ticket.assignedTo.email.split('@')[0]}</p>
                                    <p className="text-[10px] text-primary-600 font-black uppercase tracking-widest">{ticket.assignedTo.role}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
