'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowLeft, Search, Filter, CheckCircle, Clock,
    Download, User, Mail, DollarSign, Calendar
} from 'lucide-react';

export default function RegistrationManagementPage() {
    const params = useParams();
    const router = useRouter();
    const conferenceId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [conference, setConference] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('all');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, [conferenceId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [confRes, regRes] = await Promise.all([
                fetch(`/api/conferences/${conferenceId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/conferences/${conferenceId}/registrations`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (confRes.ok) setConference(await confRes.json());
            if (regRes.ok) setRegistrations(await regRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (id: string) => {
        if (!confirm('Confirm Check-in for this attendee?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/registrations/${id}/check-in`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                // Update local state
                setRegistrations(regs => regs.map(r =>
                    r.id === id ? { ...r, status: 'CHECKED_IN', checkInTime: new Date().toISOString() } : r
                ));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const exportData = () => {
        // Simple CSV Export
        const headers = ['Name', 'Email', 'Organization', 'Ticket Type', 'Status', 'Paid', 'Dietary', 'T-Shirt', 'Check-in Time'];
        const csvContent = [
            headers.join(','),
            ...registrations.map(r => [
                `"${r.name}"`,
                `"${r.email}"`,
                `"${r.organization || ''}"`,
                `"${r.ticketType.name}"`,
                `"${r.status}"`,
                r.amountPaid,
                `"${r.dietaryRequirements || ''}"`,
                `"${r.tshirtSize || ''}"`,
                `"${r.checkInTime ? new Date(r.checkInTime).toLocaleString() : ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `registrations_${conferenceId}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const filteredRegs = registrations.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.organization && r.organization.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        const matchesTicket = ticketFilter === 'all' || r.ticketTypeId === ticketFilter;
        return matchesSearch && matchesStatus && matchesTicket;
    });

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href={`/dashboard/conferences/${conferenceId}`} className="btn btn-secondary btn-sm">
                            <ArrowLeft size={16} /> Back
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-secondary-900">Registration Management</h1>
                            <p className="text-secondary-500">{conference?.title}</p>
                        </div>
                    </div>
                    <button onClick={exportData} className="btn btn-secondary flex items-center gap-2">
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="card-premium p-4 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search attendees..."
                            className="input pl-10 w-full"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Statuses</option>
                        <option value="REGISTERED">Registered</option>
                        <option value="CHECKED_IN">Checked In</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select
                        className="input"
                        value={ticketFilter}
                        onChange={e => setTicketFilter(e.target.value)}
                    >
                        <option value="all">All Ticket Types</option>
                        {conference?.ticketTypes.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                        <p className="text-primary-600 text-sm font-bold uppercase">Total Registrations</p>
                        <p className="text-3xl font-black text-secondary-900">{registrations.length}</p>
                    </div>
                    <div className="bg-success-50 p-4 rounded-xl border border-success-100">
                        <p className="text-success-600 text-sm font-bold uppercase">Checked In</p>
                        <p className="text-3xl font-black text-secondary-900">
                            {registrations.filter(r => r.status === 'CHECKED_IN').length}
                        </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-purple-600 text-sm font-bold uppercase">Total Revenue</p>
                        <p className="text-3xl font-black text-secondary-900">
                            {/* Assuming mostly consistent currency for simplicity in dashboard total */}
                            {registrations.reduce((acc, r) => acc + r.amountPaid, 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="card-premium overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-secondary-50 border-b border-secondary-200">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold uppercase text-secondary-500">Attendee</th>
                                <th className="text-left p-4 text-xs font-bold uppercase text-secondary-500">Ticket Type</th>
                                <th className="text-left p-4 text-xs font-bold uppercase text-secondary-500">Status</th>
                                <th className="text-left p-4 text-xs font-bold uppercase text-secondary-500">Date</th>
                                <th className="text-right p-4 text-xs font-bold uppercase text-secondary-500">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-secondary-500">No registrations found.</td>
                                </tr>
                            ) : (
                                filteredRegs.map(reg => (
                                    <tr key={reg.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                                                    {reg.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary-900">{reg.name}</p>
                                                    <p className="text-xs text-secondary-500">{reg.email}</p>
                                                    {reg.organization && (
                                                        <p className="text-xs text-secondary-400">{reg.organization}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-secondary-100 text-secondary-700 px-2 py-1 rounded text-xs font-medium">
                                                {reg.ticketType.name}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {reg.status === 'CHECKED_IN' ? (
                                                <span className="flex items-center gap-1 text-success-600 font-bold text-xs bg-success-50 px-2 py-1 rounded-full w-fit">
                                                    <CheckCircle size={12} /> Checked In
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-secondary-600 font-bold text-xs bg-secondary-100 px-2 py-1 rounded-full w-fit">
                                                    <Clock size={12} /> Registered
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-secondary-600">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                            <div className="text-xs text-secondary-400">
                                                {new Date(reg.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            {reg.status === 'REGISTERED' && (
                                                <button
                                                    onClick={() => handleCheckIn(reg.id)}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Check In
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
