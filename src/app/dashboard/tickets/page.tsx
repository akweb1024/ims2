'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [user, setUser] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);
            setUserRole(u.role);
            fetchTickets();
        }
    }, [statusFilter]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = `/api/support/tickets${statusFilter ? `?status=${statusFilter}` : ''}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (err) {
            console.error('Fetch tickets error:', err);
        } finally {
            setLoading(false);
        }
    };

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

            if (res.ok) {
                fetchTickets();
            } else {
                alert('Failed to assign ticket');
            }
        } catch (err) {
            console.error('Assign error:', err);
        }
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

            if (res.ok) {
                fetchTickets();
            }
        } catch (err) {
            console.error('Update status error:', err);
        }
    };

    const handleJoinChat = async (ticket: any) => {
        try {
            const token = localStorage.getItem('token');
            // Ensure self is in participants
            await fetch('/api/chat/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: ticket.chatRoomId,
                    participantIds: [user.id]
                })
            });

            router.push(`/dashboard/chat?roomId=${ticket.chatRoomId}`);
        } catch (err) {
            console.error('Join chat error:', err);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Support Tickets</h1>
                        <p className="text-secondary-600">Manage customer inquiries and support requests</p>
                    </div>
                    <div className="flex space-x-2">
                        <select
                            className="input text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                        <Link href="/dashboard/tickets/new" className="btn btn-primary text-sm whitespace-nowrap">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Ticket
                        </Link>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="card-premium p-12 text-center text-secondary-500 italic">
                        No tickets found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {tickets.map((ticket) => (
                            <div key={ticket.id} className="card-premium p-6 hover:shadow-xl transition-all border-l-4 border-l-primary-500">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center space-x-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ticket.priority === 'URGENT' ? 'bg-danger-100 text-danger-700' :
                                                ticket.priority === 'HIGH' ? 'bg-warning-100 text-warning-700' :
                                                    'bg-secondary-100 text-secondary-700'
                                                }`}>
                                                {ticket.priority}
                                            </span>
                                            <span className="text-xs font-bold text-primary-600">#{ticket.id.split('-')[0].toUpperCase()}</span>
                                            <span className="text-xs text-secondary-400 font-medium">| {new Date(ticket.createdAt).toLocaleString()}</span>
                                        </div>
                                        <Link href={`/dashboard/tickets/${ticket.id}`} className="block hover:opacity-75 transition-opacity">
                                            <h3 className="text-lg font-bold text-secondary-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight">{ticket.subject}</h3>
                                        </Link>
                                        <div className="flex items-center space-x-4 text-sm">
                                            <p className="text-secondary-700">
                                                <span className="font-bold text-secondary-400 text-[10px] uppercase tracking-widest mr-2">Client</span>
                                                <span className="font-medium">{ticket.customerProfile?.name}</span>
                                                <span className="text-secondary-400 text-xs ml-2">({ticket.customerProfile?.primaryEmail})</span>
                                            </p>
                                        </div>
                                        <p className="text-sm text-secondary-600 line-clamp-1 mt-2">{ticket.description}</p>
                                    </div>

                                    <div className="flex flex-col items-end space-y-3 min-w-[200px]">
                                        <div className="flex items-center space-x-2">
                                            <select
                                                className={`text-xs font-bold border-0 rounded-full px-3 py-1 outline-none ${ticket.status === 'OPEN' ? 'bg-success-100 text-success-700' :
                                                    ticket.status === 'IN_PROGRESS' ? 'bg-primary-100 text-primary-700' :
                                                        ticket.status === 'RESOLVED' ? 'bg-secondary-200 text-secondary-600' :
                                                            'bg-secondary-100 text-secondary-400'
                                                    }`}
                                                value={ticket.status}
                                                onChange={(e) => handleUpdateStatus(ticket.id, e.target.value)}
                                            >
                                                <option value="OPEN">OPEN</option>
                                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                                <option value="RESOLVED">RESOLVED</option>
                                                <option value="CLOSED">CLOSED</option>
                                            </select>
                                        </div>

                                        <div className="text-right">
                                            {ticket.assignedTo ? (
                                                <p className="text-xs text-secondary-500">
                                                    Assigned to: <span className="font-bold text-secondary-900">{ticket.assignedTo.email}</span>
                                                </p>
                                            ) : (
                                                <button
                                                    onClick={() => handleAssignToMe(ticket.id)}
                                                    className="btn btn-secondary text-[10px] py-1 px-3"
                                                >
                                                    Claim Ticket
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex space-x-2">
                                            {ticket.chatRoomId && (
                                                <button
                                                    onClick={() => handleJoinChat(ticket)}
                                                    className="btn btn-primary text-xs py-2 px-4 shadow-md bg-gradient-to-r from-primary-600 to-primary-700"
                                                >
                                                    Join Conversation
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
