'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ConferenceShell from '@/components/dashboard/conferences/ConferenceShell';
import ConversationChecklist from '@/components/dashboard/ConversationChecklist';
import { getHealthBadgeColor } from '@/lib/predictions';
import {
    ArrowLeft, Search, CheckCircle, Clock,
    Download, Brain, AlertTriangle, MessageSquare, X, Users, Sparkles, Calendar
} from 'lucide-react';

export default function RegistrationManagementPage() {
    const params = useParams();
    const conferenceId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [conference, setConference] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('');
    const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
    const [followupDetails, setFollowupDetails] = useState<any>(null);
    const [followupLoading, setFollowupLoading] = useState(false);
    const [submittingFollowup, setSubmittingFollowup] = useState(false);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('all');

    const fetchData = useCallback(async () => {
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
    }, [conferenceId]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
    }, [fetchData]);

    const openFollowup = async (registration: any) => {
        setSelectedRegistration(registration);
        setFollowupLoading(true);
        setCheckedItems([]);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `/api/conferences/${conferenceId}/registrations/${registration.id}/follow-ups`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                setFollowupDetails(await res.json());
            } else {
                alert('Failed to load follow-up details');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to load follow-up details');
        } finally {
            setFollowupLoading(false);
        }
    };

    const closeFollowup = () => {
        setSelectedRegistration(null);
        setFollowupDetails(null);
        setCheckedItems([]);
    };

    const handleFollowupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedRegistration) return;
        if (checkedItems.length === 0) {
            alert('Please check at least one checklist item');
            return;
        }

        setSubmittingFollowup(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData(e.currentTarget);
            const payload = {
                channel: formData.get('channel'),
                type: 'COMMENT',
                subject: formData.get('subject'),
                notes: formData.get('notes'),
                outcome: formData.get('outcome') || null,
                nextFollowUpDate: formData.get('nextFollowUpDate') || null,
                checklist: {
                    checkedItems,
                },
            };

            const res = await fetch(
                `/api/conferences/${conferenceId}/registrations/${selectedRegistration.id}/follow-ups`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save follow-up');
            }

            await fetchData();
            await openFollowup(selectedRegistration);
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Failed to save follow-up');
        } finally {
            setSubmittingFollowup(false);
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
        <ConferenceShell
            userRole={userRole}
            title="Registration Follow-ups"
            subtitle={`Manage attendee conversations, follow-up pressure, and event-day readiness for ${conference?.title || 'this conference'} without switching into CRM.`}
            badge="Registrant workspace"
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/conferences/${conferenceId}`} className="btn btn-secondary btn-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <button onClick={exportData} className="btn btn-secondary flex items-center gap-2">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            }
            stats={
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Users size={16} /> Total Registrations</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{registrations.length}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700 text-sm"><CheckCircle size={16} /> Checked In</div>
                        <p className="mt-3 text-3xl font-black text-emerald-900">
                            {registrations.filter(r => r.status === 'CHECKED_IN').length}
                        </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-700 text-sm"><Clock size={16} /> Pending Check-in</div>
                        <p className="mt-3 text-3xl font-black text-amber-900">
                            {registrations.filter(r => r.status === 'REGISTERED').length}
                        </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-purple-200 bg-purple-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-purple-700 text-sm"><Calendar size={16} /> Revenue</div>
                        <p className="mt-3 text-3xl font-black text-purple-900">
                            {registrations.reduce((acc, r) => acc + r.amountPaid, 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-sky-700 text-sm"><Sparkles size={16} /> Pending Follow-ups</div>
                        <p className="mt-3 text-3xl font-black text-sky-900">
                            {registrations.reduce((acc, r) => acc + (r.followup?.pendingFollowUpCount || 0), 0)}
                        </p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
                        <div className="xl:col-span-6">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Search Attendees</label>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by attendee, email, or organization..."
                                    className="input h-12 pl-10 w-full rounded-2xl border-slate-200 bg-slate-50/70"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="xl:col-span-3">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Registration Status</label>
                            <select
                                className="input mt-2 h-12 w-full rounded-2xl border-slate-200 bg-slate-50/70"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="REGISTERED">Registered</option>
                                <option value="CHECKED_IN">Checked In</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div className="xl:col-span-3">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Ticket Type</label>
                            <select
                                className="input mt-2 h-12 w-full rounded-2xl border-slate-200 bg-slate-50/70"
                                value={ticketFilter}
                                onChange={e => setTicketFilter(e.target.value)}
                            >
                                <option value="all">All Ticket Types</option>
                                {conference?.ticketTypes.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.95),_rgba(240,249,255,0.85))] px-5 py-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Attendee Queue</h3>
                            <p className="text-sm text-slate-500">Review readiness and follow-up state without leaving the conference workspace.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                            {filteredRegs.length} in view
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50/90 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attendee</th>
                                <th className="text-left p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Ticket Type</th>
                                <th className="text-left p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Status</th>
                                <th className="text-left p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Date</th>
                                <th className="text-left p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Follow-up</th>
                                <th className="text-right p-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRegs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-500">No registrations found.</td>
                                </tr>
                            ) : (
                                filteredRegs.map(reg => (
                                    <tr key={reg.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                                                    {reg.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{reg.name}</p>
                                                    <p className="text-xs text-slate-500">{reg.email}</p>
                                                    {reg.organization && (
                                                        <p className="text-xs text-slate-400">{reg.organization}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
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
                                        <td className="p-4 text-sm text-slate-600">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                            <div className="text-xs text-slate-400">
                                                {new Date(reg.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {reg.followup?.latestPrediction ? (
                                                <div className="space-y-1">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${getHealthBadgeColor(reg.followup.latestPrediction.customerHealth)}`}>
                                                        {reg.followup.latestPrediction.customerHealth}
                                                    </span>
                                                    {reg.followup.nextFollowUpDate && (
                                                        <div className="text-[11px] text-slate-500">
                                                            Next: {new Date(reg.followup.nextFollowUpDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {reg.followup.overdueFollowUpCount > 0 && (
                                                        <div className="text-[11px] text-red-600 font-bold">
                                                            {reg.followup.overdueFollowUpCount} overdue
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">No follow-up yet</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openFollowup(reg)}
                                                    className="btn btn-sm btn-secondary"
                                                >
                                                    Follow-up
                                                </button>
                                                {reg.status === 'REGISTERED' && (
                                                    <button
                                                        onClick={() => handleCheckIn(reg.id)}
                                                        className="btn btn-sm btn-primary"
                                                    >
                                                        Check In
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>

                {selectedRegistration && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-6 border-b border-secondary-100">
                                <div>
                                    <h2 className="text-2xl font-black text-secondary-900">Conference Follow-up</h2>
                                    <p className="text-secondary-500">{selectedRegistration.name} · {selectedRegistration.email}</p>
                                </div>
                                <button onClick={closeFollowup} className="btn btn-secondary btn-sm">
                                    <X size={16} />
                                </button>
                            </div>

                            {followupLoading ? (
                                <div className="p-8 text-center text-secondary-500">Loading follow-up details...</div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
                                    <div className="space-y-6">
                                        <div className="card-premium p-5 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <Brain size={18} className="text-primary-600" />
                                                <h3 className="font-black text-secondary-900">Lead Analytics</h3>
                                            </div>
                                            {followupDetails?.analytics?.latestPrediction ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="bg-primary-50 rounded-xl p-3">
                                                            <div className="text-[11px] font-bold uppercase text-primary-600">Renewal</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.analytics.latestPrediction.renewalLikelihood}</div>
                                                        </div>
                                                        <div className="bg-green-50 rounded-xl p-3">
                                                            <div className="text-[11px] font-bold uppercase text-green-600">Upsell</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.analytics.latestPrediction.upsellPotential}</div>
                                                        </div>
                                                        <div className="bg-red-50 rounded-xl p-3">
                                                            <div className="text-[11px] font-bold uppercase text-red-600">Churn</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.analytics.latestPrediction.churnRisk}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getHealthBadgeColor(followupDetails.analytics.latestPrediction.customerHealth)}`}>
                                                        {followupDetails.analytics.latestPrediction.customerHealth}
                                                    </div>
                                                    <div className="text-sm text-secondary-600">
                                                        Pending follow-ups: <span className="font-bold">{followupDetails.analytics.pendingFollowUpCount}</span>
                                                    </div>
                                                    {followupDetails.analytics.nextFollowUpDate && (
                                                        <div className="text-sm text-secondary-600">
                                                            Next scheduled: <span className="font-bold">{new Date(followupDetails.analytics.nextFollowUpDate).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <div className="text-sm font-bold text-secondary-800">Recommended Actions</div>
                                                        <ul className="space-y-1 text-sm text-secondary-600">
                                                            {followupDetails.analytics.latestPrediction.recommendedActions.map((action: string, idx: number) => (
                                                                <li key={idx}>• {action}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-secondary-500">No analytics yet. Log the first follow-up to generate insights.</div>
                                            )}
                                        </div>

                                        <div className="card-premium p-5 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare size={18} className="text-primary-600" />
                                                <h3 className="font-black text-secondary-900">Follow-up History</h3>
                                            </div>
                                            <div className="space-y-3 max-h-[320px] overflow-y-auto">
                                                {(followupDetails?.followups || []).length === 0 ? (
                                                    <div className="text-sm text-secondary-500">No follow-up remarks yet.</div>
                                                ) : (
                                                    followupDetails.followups.map((log: any) => (
                                                        <div key={log.id} className="border border-secondary-100 rounded-xl p-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="font-bold text-secondary-900">{log.subject}</div>
                                                                {log.nextFollowUpDate && !log.isFollowUpCompleted && (
                                                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                                                                        Next: {new Date(log.nextFollowUpDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-secondary-600 mt-2 whitespace-pre-wrap">{log.notes}</div>
                                                            {log.checklist?.customerHealth && (
                                                                <div className="mt-3">
                                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${getHealthBadgeColor(log.checklist.customerHealth)}`}>
                                                                        {log.checklist.customerHealth}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-premium p-5">
                                        <h3 className="font-black text-secondary-900 mb-4">Add Follow-up Remark</h3>
                                        <form onSubmit={handleFollowupSubmit} className="space-y-4">
                                            <div>
                                                <label className="label">Channel</label>
                                                <select name="channel" className="input" defaultValue="Phone" required>
                                                    <option>Phone</option>
                                                    <option>Email</option>
                                                    <option>WhatsApp</option>
                                                    <option>In-Person</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Outcome</label>
                                                <select name="outcome" className="input" defaultValue="Follow-up required">
                                                    <option value="">Select outcome...</option>
                                                    <option>Interested</option>
                                                    <option>Follow-up required</option>
                                                    <option>Responded</option>
                                                    <option>No Answer</option>
                                                    <option>Converted</option>
                                                    <option>Lost</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Subject</label>
                                                <input name="subject" className="input" required placeholder="Conference follow-up discussion" />
                                            </div>
                                            <div>
                                                <label className="label">Remark / Notes</label>
                                                <textarea name="notes" className="input h-28" required placeholder="Write the follow-up remark here..." />
                                            </div>
                                            <div>
                                                <label className="label">Next Follow-up Date</label>
                                                <input type="datetime-local" name="nextFollowUpDate" className="input" />
                                            </div>
                                            <ConversationChecklist
                                                checkedItems={checkedItems}
                                                onChange={setCheckedItems}
                                                showPredictions={true}
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={submittingFollowup}
                                                    className="btn btn-primary"
                                                >
                                                    {submittingFollowup ? 'Saving...' : 'Save Follow-up'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ConferenceShell>
    );
}
