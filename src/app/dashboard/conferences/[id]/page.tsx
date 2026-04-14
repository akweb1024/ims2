'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ConferenceShell from '@/components/dashboard/conferences/ConferenceShell';
import ConversationChecklist from '@/components/dashboard/ConversationChecklist';
import { getHealthBadgeColor } from '@/lib/predictions';
import {
    ArrowLeft, Calendar, MapPin, Users, FileText, DollarSign,
    Globe, Palette, Settings, Ticket, Tag, Award, CheckCircle,
    Plus, Edit2, Trash2, Save, X, ExternalLink, HelpCircle, Brain, MessageSquare, AlertCircle
} from 'lucide-react';

export default function ConferenceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const conferenceId = params.id as string;

    const [conference, setConference] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'tracks' | 'sponsors' | 'committee' | 'insights'>('overview');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState<any>({});

    // Modals
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [showSponsorModal, setShowSponsorModal] = useState(false);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [showFollowupModal, setShowFollowupModal] = useState(false);
    const [followupDetails, setFollowupDetails] = useState<any>(null);
    const [followupLoading, setFollowupLoading] = useState(false);
    const [submittingFollowup, setSubmittingFollowup] = useState(false);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [followupPage, setFollowupPage] = useState(1);
    const [followupPageSize, setFollowupPageSize] = useState(10);
 
    const [analytics, setAnalytics] = useState<any>(null);
    const [feedbackData, setFeedbackData] = useState<any>(null);
    const [fetchingInsights, setFetchingInsights] = useState(false);
 
    const fetchInsights = useCallback(async () => {
        try {
            setFetchingInsights(true);
            const token = localStorage.getItem('token');
            const [anaRes, feedRes] = await Promise.all([
                fetch(`/api/conferences/${conferenceId}/analytics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/conferences/${conferenceId}/feedback`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
 
            if (anaRes.ok) setAnalytics(await anaRes.json());
            if (feedRes.ok) setFeedbackData(await feedRes.json());
        } catch (error) {
            console.error('Fetch Insights Error:', error);
        } finally {
            setFetchingInsights(false);
        }
    }, [conferenceId]);



    const fetchCommittee = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/committee`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCommitteeMembers(await res.json());
        } catch (error) { console.error(error); }
    }, [conferenceId]);

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/users?limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setUsers(result.data || []);
            }
        } catch (error) { console.error(error); }
    }, []);

    const handleAddCommitteeMember = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/committee`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setShowCommitteeModal(false);
                fetchCommittee();
                form.reset();
            }
        } catch (error) { console.error(error); }
    };

    const removeCommitteeMember = async (memberId: string) => {
        if (!confirm('Remove this member?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/committee/${memberId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchCommittee();
        } catch (error) { console.error(error); }
    };

    const fetchConference = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setConference(data);
                setEditData(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [conferenceId]);

    const fetchConferenceFollowups = useCallback(async (page = followupPage, pageSize = followupPageSize) => {
        try {
            setFollowupLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            const res = await fetch(`/api/conferences/${conferenceId}/follow-ups?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error('Failed to load conference follow-ups');
            }

            const data = await res.json();
            setFollowupDetails(data);
            setCheckedItems([]);
        } catch (error) {
            console.error(error);
        } finally {
            setFollowupLoading(false);
        }
    }, [conferenceId, followupPage, followupPageSize]);

    const openConferenceFollowups = useCallback(async () => {
        setFollowupPage(1);
        setFollowupPageSize(10);
        setShowFollowupModal(true);
        await fetchConferenceFollowups(1, 10);
    }, [fetchConferenceFollowups]);

    const closeConferenceFollowups = () => {
        setShowFollowupModal(false);
        setFollowupDetails(null);
        setCheckedItems([]);
    };

    const handleConferenceFollowupSubmit = async (form: FormData) => {
        if (checkedItems.length === 0) {
            alert('Please check at least one item in the conversation checklist');
            return;
        }

        try {
            setSubmittingFollowup(true);
            const token = localStorage.getItem('token');
            const payload = {
                channel: form.get('channel'),
                type: 'COMMENT',
                subject: form.get('subject'),
                notes: form.get('notes'),
                outcome: form.get('outcome') || null,
                nextFollowUpDate: form.get('nextFollowUpDate') || null,
                checklist: {
                    checkedItems,
                },
                previousFollowUpId: followupDetails?.followups?.find((item: any) => item.nextFollowUpDate && !item.isFollowUpCompleted)?.id || null,
            };

            const res = await fetch(`/api/conferences/${conferenceId}/follow-ups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json().catch(() => null);
                throw new Error(error?.error || 'Failed to save follow-up');
            }

            await fetchConferenceFollowups();
            fetchConference();
        } catch (error: any) {
            alert(error?.message || 'Failed to save conference follow-up');
        } finally {
            setSubmittingFollowup(false);
        }
    };


    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchConference();
    }, [conferenceId, fetchConference]);

    useEffect(() => {
        fetchConferenceFollowups(followupPage, followupPageSize).catch(() => undefined);
    }, [fetchConferenceFollowups, followupPage, followupPageSize]);

    useEffect(() => {
        if (activeTab === 'insights') {
            fetchInsights();
        }
    }, [activeTab, fetchCommittee, fetchUsers, fetchInsights]);

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editData)
            });

            if (res.ok) {
                const updated = await res.json();
                setConference(updated);
                setEditMode(false);
                alert('Conference updated successfully!');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update conference');
        }
    };

    const handlePublish = async () => {
        if (!confirm('Are you sure you want to publish this conference? It will be visible to everyone.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/publish`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    fetchConference();
                    alert('Conference published successfully!');
                } else {
                    alert('Cannot publish: ' + result.errors.join(', '));
                }
            } else {
                const result = await res.json();
                console.error('Publish Failed:', result);
                alert('Cannot publish: ' + (result.errors?.join(', ') || result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('handlePublish Error:', error);
            alert('Failed to publish conference');
        }
    };

    const handleAddTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/tickets`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setShowTicketModal(false);
                fetchConference();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setShowTrackModal(false);
                fetchConference();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/sponsors`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setShowSponsorModal(false);
                fetchConference();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const canEdit = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    if (loading) return <div className="p-8 text-center">Loading conference...</div>;
    if (!conference) return <div className="p-8 text-center">Conference not found</div>;

    return (
        <ConferenceShell
            userRole={userRole}
            title={conference.title}
            subtitle="Run the conference from one workspace: registrations, papers, committee work, publishing readiness, and conference-level follow-up all stay connected here."
            badge="Conference command center"
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/conferences/all" className="btn btn-secondary btn-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <button
                        onClick={openConferenceFollowups}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <MessageSquare size={16} /> Add Conference Remark
                    </button>
                    <Link
                        href={`/dashboard/conferences/${conferenceId}/submit`}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <FileText size={16} /> Submit Paper
                    </Link>
                    <Link
                        href={`/dashboard/conferences/${conferenceId}/registrations`}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Users size={16} /> Registrations
                    </Link>
                    {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'REVIEWER'].includes(userRole) && (
                        <Link
                            href={`/dashboard/conferences/${conferenceId}/papers`}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Users size={16} /> Manage Papers
                        </Link>
                    )}
                    {canEdit && !editMode && (
                        <button onClick={() => setEditMode(true)} className="btn btn-primary">
                            <Edit2 size={16} /> Edit
                        </button>
                    )}
                    {editMode && (
                        <>
                            <button onClick={handleUpdate} className="btn btn-success">
                                <Save size={16} /> Save
                            </button>
                            <button onClick={() => { setEditMode(false); setEditData(conference); }} className="btn btn-secondary">
                                <X size={16} /> Cancel
                            </button>
                        </>
                    )}
                </div>
            }
            stats={
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="text-sm text-slate-500">Status</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{conference.status}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="text-sm text-slate-500">Registrations</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{conference._count.registrations}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="text-sm text-slate-500">Papers</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{conference._count.papers}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                        <div className="text-sm text-amber-700">Pending Follow-ups</div>
                        <p className="mt-3 text-3xl font-black text-amber-900">{followupDetails?.summary?.pendingFollowUps || 0}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50/80 p-5 shadow-sm">
                        <div className="text-sm text-red-700">Overdue</div>
                        <p className="mt-3 text-3xl font-black text-red-900">{followupDetails?.summary?.overdueFollowUps || 0}</p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                                {conference.mode.replace('_', ' ')} conference
                            </div>
                            <div className="mt-3 text-sm text-slate-500">
                                {new Date(conference.startDate).toLocaleDateString()} to {new Date(conference.endDate).toLocaleDateString()}
                                {conference.venue ? ` • ${conference.venue}` : ''}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                            {conference.organizer ? <span>Organizer: {conference.organizer}</span> : null}
                            {conference.website ? (
                                <a href={conference.website} target="_blank" rel="noreferrer" className="font-semibold text-sky-700">
                                    Visit website
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>



                {/* Registration CTA (Public) */}
                {conference.status === 'PUBLISHED' && (
                    <div className="rounded-[1.75rem] border border-sky-200 bg-[linear-gradient(135deg,_#0284c7_0%,_#2563eb_52%,_#0f172a_100%)] p-8 text-white shadow-xl shadow-sky-200/50">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-black mb-2">Registration is Open!</h2>
                                <p className="text-primary-100 text-lg">Secure your spot at {conference.title} today.</p>
                            </div>
                            <Link
                                href={`/dashboard/conferences/${conferenceId}/register`}
                                className="btn bg-white text-primary-700 hover:bg-gray-100 px-8 py-4 text-lg font-bold shadow-lg transform hover:-translate-y-1 transition-all"
                            >
                                <Ticket className="inline mr-2" /> Register Now
                            </Link>
                        </div>
                    </div>
                )}

                {/* Status Banner */}
                <div className={`rounded-[1.75rem] p-5 ${conference.status === 'PUBLISHED' ? 'bg-success-50 border border-success-200' :
                    conference.status === 'DRAFT' ? 'bg-warning-50 border border-warning-200' :
                        'bg-primary-50 border border-primary-200'
                    }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <p className="font-bold text-secondary-900">Status: {conference.status}</p>
                            <p className="text-sm text-secondary-600">
                                {conference.status === 'DRAFT' && 'This conference is not yet published.'}
                                {conference.status === 'PUBLISHED' && 'This conference is live and accepting registrations.'}
                            </p>
                            {conference.status === 'DRAFT' && (
                                <ul className="mt-2 text-xs space-y-1">
                                    <li className={`flex items-center gap-1 ${conference.ticketTypes?.length > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                        {conference.ticketTypes?.length > 0 ? '✓' : '✗'} At least one ticket type required
                                        <div className="tooltip">
                                            <HelpCircle size={12} className="text-secondary-400" />
                                            <span className="tooltip-text">Add tickets in the &apos;Tickets&apos; tab to allow registrations.</span>
                                        </div>
                                    </li>
                                    <li className={`flex items-center gap-1 ${conference.title ? 'text-success-600' : 'text-danger-600'}`}>
                                        {conference.title ? '✓' : '✗'} Title required
                                        <div className="tooltip">
                                            <HelpCircle size={12} className="text-secondary-400" />
                                            <span className="tooltip-text">Visible title for your conference.</span>
                                        </div>
                                    </li>
                                    <li className={`flex items-center gap-1 ${conference.description ? 'text-success-600' : 'text-danger-600'}`}>
                                        {conference.description ? '✓' : '✗'} Description required
                                        <div className="tooltip">
                                            <HelpCircle size={12} className="text-secondary-400" />
                                            <span className="tooltip-text">Detailed info about the event.</span>
                                        </div>
                                    </li>
                                    <li className={`flex items-center gap-1 ${conference.startDate ? 'text-success-600' : 'text-danger-600'}`}>
                                        {conference.startDate ? '✓' : '✗'} Start Date required
                                        <div className="tooltip">
                                            <HelpCircle size={12} className="text-secondary-400" />
                                            <span className="tooltip-text">When the conference begins.</span>
                                        </div>
                                    </li>
                                    <li className={`flex items-center gap-1 ${conference.endDate ? 'text-success-600' : 'text-danger-600'}`}>
                                        {conference.endDate ? '✓' : '✗'} End Date required
                                        <div className="tooltip">
                                            <HelpCircle size={12} className="text-secondary-400" />
                                            <span className="tooltip-text">When the conference ends.</span>
                                        </div>
                                    </li>
                                </ul>
                            )}
                        </div>
                        <div className="text-right flex items-center gap-6">
                            <div>
                                <p className="text-2xl font-black text-secondary-900">{conference._count.registrations}</p>
                                <p className="text-sm text-secondary-500">Registrations</p>
                            </div>
                            {canEdit && conference.status === 'DRAFT' && (
                                <button
                                    onClick={handlePublish}
                                    disabled={!conference.title || !conference.description || !conference.startDate || !conference.endDate || conference.ticketTypes?.length === 0}
                                    className="btn btn-success"
                                >
                                    <CheckCircle size={16} /> Publish
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-secondary-900">
                                <Brain size={18} className="text-primary-600" />
                                <h3 className="text-lg font-black">Conference-Level Follow-up</h3>
                            </div>
                            <p className="text-sm text-secondary-500 mt-1">
                                Track sponsor outreach, organizer updates, campaign progress, and conference-wide action items here.
                            </p>
                        </div>
                        <button
                            onClick={openConferenceFollowups}
                            className="btn btn-primary"
                        >
                            <MessageSquare size={16} /> Add Conference Remark
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                            <div className="text-sm text-slate-500">Total Follow-ups</div>
                            <div className="text-3xl font-black text-slate-900 mt-2">{followupDetails?.summary?.totalFollowUps || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                            <div className="text-sm text-amber-700">Pending</div>
                            <div className="text-3xl font-black text-amber-900 mt-2">{followupDetails?.summary?.pendingFollowUps || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
                            <div className="text-sm text-red-700">Overdue</div>
                            <div className="text-3xl font-black text-red-900 mt-2">{followupDetails?.summary?.overdueFollowUps || 0}</div>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
                            <div className="text-sm text-sky-700">Conference Health</div>
                            <div className="mt-2">
                                {followupDetails?.summary?.latestPrediction?.customerHealth ? (
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getHealthBadgeColor(followupDetails.summary.latestPrediction.customerHealth)}`}>
                                        {followupDetails.summary.latestPrediction.customerHealth}
                                    </span>
                                ) : (
                                    <span className="text-sm text-secondary-500">No signal yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white/90 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <div className="flex min-w-max gap-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'overview'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Settings size={16} className="inline mr-2" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'tickets'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Ticket size={16} className="inline mr-2" />
                        Tickets ({conference.ticketTypes?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('tracks')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'tracks'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Tag size={16} className="inline mr-2" />
                        Tracks ({conference.tracks?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('sponsors')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'sponsors'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Award size={16} className="inline mr-2" />
                        Sponsors ({conference.sponsors?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('committee')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'committee'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Users size={16} className="inline mr-2" />
                        Committee ({committeeMembers.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`inline-flex items-center rounded-2xl px-5 py-3 font-bold transition-all ${activeTab === 'insights'
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'text-secondary-500 hover:bg-slate-50 hover:text-secondary-900'
                            }`}
                    >
                        <Brain size={16} className="inline mr-2" />
                        Insights & Feedback
                    </button>
                    </div>
                </div>

                {/* Tab Content */}
                {
                    activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div className="card-premium p-6">
                                <h3 className="font-bold text-lg mb-4">Basic Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Title</label>
                                        {editMode ? (
                                            <input
                                                value={editData.title}
                                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                                className="input w-full"
                                            />
                                        ) : (
                                            <p className="text-secondary-900">{conference.title}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        {editMode ? (
                                            <textarea
                                                value={editData.description}
                                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                className="input w-full h-24"
                                            />
                                        ) : (
                                            <p className="text-secondary-900">{conference.description}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Start Date</label>
                                            {editMode ? (
                                                <input
                                                    type="date"
                                                    value={editData.startDate?.split('T')[0]}
                                                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                                    className="input w-full"
                                                />
                                            ) : (
                                                <p className="text-secondary-900">{new Date(conference.startDate).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">End Date</label>
                                            {editMode ? (
                                                <input
                                                    type="date"
                                                    value={editData.endDate?.split('T')[0]}
                                                    onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                                    className="input w-full"
                                                />
                                            ) : (
                                                <p className="text-secondary-900">{new Date(conference.endDate).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Venue</label>
                                        {editMode ? (
                                            <input
                                                value={editData.venue || ''}
                                                onChange={(e) => setEditData({ ...editData, venue: e.target.value })}
                                                className="input w-full"
                                            />
                                        ) : (
                                            <p className="text-secondary-900">{conference.venue || 'Not specified'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Mode</label>
                                        {editMode ? (
                                            <select
                                                value={editData.mode}
                                                onChange={(e) => setEditData({ ...editData, mode: e.target.value })}
                                                className="input w-full"
                                            >
                                                <option value="IN_PERSON">In-Person</option>
                                                <option value="VIRTUAL">Virtual</option>
                                                <option value="HYBRID">Hybrid</option>
                                            </select>
                                        ) : (
                                            <p className="text-secondary-900">{conference.mode.replace('_', ' ')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="card-premium p-6">
                                <h3 className="font-bold text-lg mb-4">Additional Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Organizer</label>
                                        {editMode ? (
                                            <input
                                                value={editData.organizer || ''}
                                                onChange={(e) => setEditData({ ...editData, organizer: e.target.value })}
                                                className="input w-full"
                                            />
                                        ) : (
                                            <p className="text-secondary-900">{conference.organizer || 'Not specified'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Website</label>
                                        {editMode ? (
                                            <input
                                                type="url"
                                                value={editData.website || ''}
                                                onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                                                className="input w-full"
                                            />
                                        ) : (
                                            conference.website ? (
                                                <a href={conference.website} target="_blank" className="text-primary-600 hover:underline flex items-center gap-1">
                                                    {conference.website} <ExternalLink size={14} />
                                                </a>
                                            ) : (
                                                <p className="text-secondary-500">Not specified</p>
                                            )
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Max Attendees</label>
                                        {editMode ? (
                                            <input
                                                type="number"
                                                value={editData.maxAttendees || ''}
                                                onChange={(e) => setEditData({ ...editData, maxAttendees: e.target.value })}
                                                className="input w-full"
                                                placeholder="Unlimited"
                                            />
                                        ) : (
                                            <p className="text-secondary-900">{conference.maxAttendees || 'Unlimited'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">Primary Color</label>
                                        {editMode ? (
                                            <input
                                                type="color"
                                                value={editData.primaryColor || '#3B82F6'}
                                                onChange={(e) => setEditData({ ...editData, primaryColor: e.target.value })}
                                                className="input w-full h-12"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded" style={{ backgroundColor: conference.primaryColor }} />
                                                <p className="text-secondary-900">{conference.primaryColor}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'tickets' && (
                        <div className="card-premium p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Ticket Types</h3>
                                {canEdit && (
                                    <button onClick={() => setShowTicketModal(true)} className="btn btn-primary btn-sm">
                                        <Plus size={14} /> Add Ticket
                                    </button>
                                )}
                            </div>
                            {conference.ticketTypes?.length === 0 ? (
                                <div className="text-center py-12">
                                    <Ticket size={48} className="mx-auto text-secondary-300 mb-4" />
                                    <p className="text-secondary-500 mb-4">No ticket types yet</p>
                                    {canEdit && (
                                        <button onClick={() => setShowTicketModal(true)} className="btn btn-primary">
                                            Add First Ticket Type
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {conference.ticketTypes.map((ticket: any) => (
                                        <div key={ticket.id} className="p-4 border-2 border-secondary-200 rounded-2xl hover:border-primary-200 transition-all">
                                            <h4 className="font-bold text-lg text-secondary-900 mb-2">{ticket.name}</h4>
                                            <p className="text-3xl font-black text-primary-600 mb-2">
                                                {ticket.currency} {ticket.price.toFixed(2)}
                                            </p>
                                            <div className="flex justify-between text-sm text-secondary-500">
                                                <span>Sold: {ticket.soldCount}</span>
                                                {ticket.limit && <span>Limit: {ticket.limit}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeTab === 'tracks' && (
                        <div className="card-premium p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Conference Tracks</h3>
                                {canEdit && (
                                    <button onClick={() => setShowTrackModal(true)} className="btn btn-primary btn-sm">
                                        <Plus size={14} /> Add Track
                                    </button>
                                )}
                            </div>
                            {conference.tracks?.length === 0 ? (
                                <div className="text-center py-12">
                                    <Tag size={48} className="mx-auto text-secondary-300 mb-4" />
                                    <p className="text-secondary-500 mb-4">No tracks yet</p>
                                    {canEdit && (
                                        <button onClick={() => setShowTrackModal(true)} className="btn btn-primary">
                                            Add First Track
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {conference.tracks.map((track: any) => (
                                        <div key={track.id} className="p-4 border-l-4 bg-secondary-50 rounded-r-xl" style={{ borderColor: track.color }}>
                                            <h4 className="font-bold text-secondary-900">{track.name}</h4>
                                            {track.description && <p className="text-sm text-secondary-600 mt-1">{track.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeTab === 'sponsors' && (
                        <div className="card-premium p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Sponsors</h3>
                                {canEdit && (
                                    <button onClick={() => setShowSponsorModal(true)} className="btn btn-primary btn-sm">
                                        <Plus size={14} /> Add Sponsor
                                    </button>
                                )}
                            </div>
                            {conference.sponsors?.length === 0 ? (
                                <div className="text-center py-12">
                                    <Award size={48} className="mx-auto text-secondary-300 mb-4" />
                                    <p className="text-secondary-500 mb-4">No sponsors yet</p>
                                    {canEdit && (
                                        <button onClick={() => setShowSponsorModal(true)} className="btn btn-primary">
                                            Add First Sponsor
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].map(tier => {
                                        const tierSponsors = conference.sponsors.filter((s: any) => s.tier === tier);
                                        if (tierSponsors.length === 0) return null;

                                        return (
                                            <div key={tier}>
                                                <h4 className="font-bold text-secondary-900 mb-3">{tier} Sponsors</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {tierSponsors.map((sponsor: any) => (
                                                        <div key={sponsor.id} className="p-4 border border-secondary-200 rounded-xl text-center">
                                                            <p className="font-bold text-secondary-900">{sponsor.name}</p>
                                                            {sponsor.website && (
                                                                <a href={sponsor.website} target="_blank" className="text-xs text-primary-600 hover:underline">
                                                                    Visit
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeTab === 'committee' && (
                        <div className="card-premium p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg">Committee Members</h3>
                                {canEdit && (
                                    <button onClick={() => setShowCommitteeModal(true)} className="btn btn-primary btn-sm">
                                        <Plus size={14} /> Add Member
                                    </button>
                                )}
                            </div>
                            {committeeMembers.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users size={48} className="mx-auto text-secondary-300 mb-4" />
                                    <p className="text-secondary-500 mb-4">No committee members yet</p>
                                    {canEdit && (
                                        <button onClick={() => setShowCommitteeModal(true)} className="btn btn-primary">
                                            Add First Member
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {committeeMembers.map((member: any) => (
                                        <div key={member.id} className="p-6 border border-secondary-200 rounded-2xl bg-white hover:shadow-lg transition-all relative">
                                            {canEdit && (
                                                <button
                                                    onClick={() => removeCommitteeMember(member.id)}
                                                    className="absolute top-4 right-4 text-secondary-300 hover:text-danger-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                                                    {member.photoUrl ? (
                                                        <Image src={member.photoUrl} alt={member.name} width={48} height={48} className="rounded-full object-cover" />
                                                    ) : member.name[0]}
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-secondary-900">{member.name}</h4>
                                                    <p className="text-xs font-black text-primary-600 uppercase tracking-tighter">{member.role}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-secondary-600 font-medium italic">{member.affiliation || 'No affiliation specified'}</p>
                                            {member.bio && <p className="text-xs text-secondary-400 mt-2 line-clamp-2">{member.bio}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Modals */}
                {
                    showTicketModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                                <h3 className="text-2xl font-bold mb-6">Add Ticket Type</h3>
                                <form onSubmit={handleAddTicket} className="space-y-4">
                                    <div>
                                        <label className="label">Ticket Name *</label>
                                        <input name="name" className="input" required placeholder="e.g., Early Bird" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Price *</label>
                                            <input name="price" type="number" step="0.01" className="input" required />
                                        </div>
                                        <div>
                                            <label className="label">Currency</label>
                                            <select name="currency" className="input">
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Ticket Limit</label>
                                        <input name="limit" type="number" className="input" placeholder="Leave empty for unlimited" />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="submit" className="btn btn-primary flex-1">Add Ticket</button>
                                        <button type="button" onClick={() => setShowTicketModal(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showTrackModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                                <h3 className="text-2xl font-bold mb-6">Add Track</h3>
                                <form onSubmit={handleAddTrack} className="space-y-4">
                                    <div>
                                        <label className="label">Track Name *</label>
                                        <input name="name" className="input" required placeholder="e.g., AI & Machine Learning" />
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <textarea name="description" className="input h-20" placeholder="Brief description..." />
                                    </div>
                                    <div>
                                        <label className="label">Color</label>
                                        <input name="color" type="color" className="input h-12" defaultValue="#3B82F6" />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="submit" className="btn btn-primary flex-1">Add Track</button>
                                        <button type="button" onClick={() => setShowTrackModal(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showSponsorModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                                <h3 className="text-2xl font-bold mb-6">Add Sponsor</h3>
                                <form onSubmit={handleAddSponsor} className="space-y-4">
                                    <div>
                                        <label className="label">Sponsor Name *</label>
                                        <input name="name" className="input" required placeholder="e.g., Tech Corp" />
                                    </div>
                                    <div>
                                        <label className="label">Tier</label>
                                        <select name="tier" className="input">
                                            <option value="PLATINUM">Platinum</option>
                                            <option value="GOLD">Gold</option>
                                            <option value="SILVER">Silver</option>
                                            <option value="BRONZE">Bronze</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Website</label>
                                        <input name="website" type="url" className="input" placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="label">Description</label>
                                        <textarea name="description" className="input h-20" placeholder="About the sponsor..." />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="submit" className="btn btn-primary flex-1">Add Sponsor</button>
                                        <button type="button" onClick={() => setShowSponsorModal(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showCommitteeModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                                <h3 className="text-2xl font-bold mb-6">Add Committee Member</h3>
                                <form onSubmit={handleAddCommitteeMember} className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="label">Select User (Optional)</label>
                                            <select name="userId" className="input">
                                                <option value="">External Member</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Name *</label>
                                            <input name="name" className="input" required placeholder="Member Name" />
                                        </div>
                                        <div>
                                            <label className="label flex items-center gap-2">
                                                Role *
                                                <div className="tooltip">
                                                    <HelpCircle size={14} className="text-secondary-400" />
                                                    <span className="tooltip-text">
                                                        <b>Chair:</b> Oversees the conference.<br />
                                                        <b>Editor:</b> Manages track submissions.<br />
                                                        <b>Reviewer:</b> Peer-reviews papers.<br />
                                                        <b>Organizer:</b> General operations.
                                                    </span>
                                                </div>
                                            </label>
                                            <select name="role" className="input" required>
                                                <option value="EDITOR">Editor</option>
                                                <option value="REVIEWER">Reviewer</option>
                                                <option value="CHAIR">Chair</option>
                                                <option value="ORGANIZER">Organizer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Affiliation</label>
                                            <input name="affiliation" className="input" placeholder="University / Company" />
                                        </div>
                                        <div>
                                            <label className="label">Bio</label>
                                            <textarea name="bio" className="input h-20" placeholder="Short bio..." />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <button type="submit" className="btn btn-primary flex-1">Add Member</button>
                                        <button type="button" onClick={() => setShowCommitteeModal(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {showFollowupModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-6xl w-full max-h-[92vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-secondary-900">Conference Follow-up</h2>
                                    <p className="text-secondary-500">{conference.title}</p>
                                </div>
                                <button onClick={closeConferenceFollowups} className="text-secondary-400 hover:text-secondary-900">
                                    <X size={24} />
                                </button>
                            </div>

                            {followupLoading ? (
                                <div className="py-12 text-center text-secondary-500">Loading conference follow-ups...</div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="card-premium p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Brain size={18} className="text-primary-600" />
                                                <h3 className="font-black text-secondary-900">Conference Analytics</h3>
                                            </div>

                                            {followupDetails?.summary?.latestPrediction ? (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="rounded-xl bg-secondary-50 p-3 text-center">
                                                            <div className="text-xs text-secondary-500">Renewal</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.summary.latestPrediction.renewalLikelihood}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-secondary-50 p-3 text-center">
                                                            <div className="text-xs text-secondary-500">Upsell</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.summary.latestPrediction.upsellPotential}</div>
                                                        </div>
                                                        <div className="rounded-xl bg-secondary-50 p-3 text-center">
                                                            <div className="text-xs text-secondary-500">Churn</div>
                                                            <div className="text-2xl font-black text-secondary-900">{followupDetails.summary.latestPrediction.churnRisk}</div>
                                                        </div>
                                                    </div>

                                                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getHealthBadgeColor(followupDetails.summary.latestPrediction.customerHealth)}`}>
                                                        {followupDetails.summary.latestPrediction.customerHealth}
                                                    </div>

                                                    <div className="text-sm text-secondary-600">
                                                        Pending follow-ups: <span className="font-bold text-secondary-900">{followupDetails.summary.pendingFollowUps}</span>
                                                    </div>
                                                    {followupDetails.summary.nextFollowUpDate && (
                                                        <div className="text-sm text-secondary-600">
                                                            Next scheduled: <span className="font-bold text-secondary-900">{new Date(followupDetails.summary.nextFollowUpDate).toLocaleString()}</span>
                                                        </div>
                                                    )}

                                                    {(followupDetails.summary.latestPrediction.recommendedActions || []).length > 0 && (
                                                        <div>
                                                            <div className="text-sm font-bold text-secondary-900 mb-2">Recommended Actions</div>
                                                            <ul className="space-y-2">
                                                                {(followupDetails.summary.latestPrediction.recommendedActions || []).map((action: string, idx: number) => (
                                                                    <li key={idx} className="text-sm text-secondary-700 flex items-start gap-2">
                                                                        <AlertCircle size={14} className="mt-0.5 text-primary-600 shrink-0" />
                                                                        <span>{action}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-secondary-500">
                                                    No conference-level analytics yet. Add the first conference follow-up to generate AI insights.
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-premium p-5">
                                            <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare size={18} className="text-primary-600" />
                                                    <div>
                                                        <h3 className="font-black text-secondary-900">Conference Follow-up History</h3>
                                                        <div className="text-xs text-secondary-500">
                                                            Showing the latest {followupDetails?.pagination?.pageSize || followupPageSize} remarks per page
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <label className="text-secondary-500 font-medium" htmlFor="conference-followup-page-size">
                                                        Comments per page
                                                    </label>
                                                    <select
                                                        id="conference-followup-page-size"
                                                        className="input h-10 w-24"
                                                        value={followupPageSize}
                                                        onChange={(event) => {
                                                            const nextPageSize = Number(event.target.value);
                                                            setFollowupPage(1);
                                                            setFollowupPageSize(nextPageSize);
                                                        }}
                                                    >
                                                        {[10, 20, 40, 100].map((size) => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {(followupDetails?.followups || []).length === 0 ? (
                                                <div className="text-sm text-secondary-500">No conference-level follow-up remarks yet.</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {followupDetails.followups.map((log: any) => (
                                                        <div key={log.id} className="rounded-2xl border border-secondary-200 p-4">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className="font-bold text-secondary-900">{log.subject}</div>
                                                                    <div className="text-xs text-secondary-500 mt-1">
                                                                        {new Date(log.createdAt).toLocaleString()}
                                                                        {log.user?.name ? ` · ${log.user.name}` : ''}
                                                                    </div>
                                                                </div>
                                                                {log.checklist?.customerHealth && (
                                                                    <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${getHealthBadgeColor(log.checklist.customerHealth)}`}>
                                                                        {log.checklist.customerHealth}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-secondary-700 mt-3">{log.notes}</div>
                                                            {log.nextFollowUpDate && !log.isFollowUpCompleted && (
                                                                <div className="text-xs text-amber-700 mt-3">
                                                                    Next: {new Date(log.nextFollowUpDate).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <div className="flex flex-col gap-3 border-t border-secondary-100 pt-4 md:flex-row md:items-center md:justify-between">
                                                        <div className="text-xs text-secondary-500">
                                                            Showing{' '}
                                                            <span className="font-bold text-secondary-900">
                                                                {followupDetails.pagination?.totalItems
                                                                    ? ((followupDetails.pagination.page - 1) * followupDetails.pagination.pageSize) + 1
                                                                    : 0}
                                                            </span>
                                                            {' '}to{' '}
                                                            <span className="font-bold text-secondary-900">
                                                                {followupDetails.pagination?.totalItems
                                                                    ? Math.min(
                                                                        followupDetails.pagination.page * followupDetails.pagination.pageSize,
                                                                        followupDetails.pagination.totalItems
                                                                    )
                                                                    : 0}
                                                            </span>
                                                            {' '}of{' '}
                                                            <span className="font-bold text-secondary-900">
                                                                {followupDetails.pagination?.totalItems || 0}
                                                            </span>
                                                            {' '}remarks
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                disabled={!followupDetails.pagination?.hasPreviousPage || followupLoading}
                                                                onClick={() => setFollowupPage((current) => Math.max(1, current - 1))}
                                                            >
                                                                Previous
                                                            </button>
                                                            <div className="text-xs font-bold text-secondary-500">
                                                                Page {followupDetails.pagination?.page || followupPage} of {followupDetails.pagination?.totalPages || 1}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                disabled={!followupDetails.pagination?.hasNextPage || followupLoading}
                                                                onClick={() => setFollowupPage((current) => current + 1)}
                                                            >
                                                                Next
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card-premium p-5">
                                        <h3 className="font-black text-secondary-900 mb-4">Add Conference Follow-up</h3>
                                        <form
                                            className="space-y-4"
                                            onSubmit={async (event) => {
                                                event.preventDefault();
                                                await handleConferenceFollowupSubmit(new FormData(event.currentTarget));
                                                event.currentTarget.reset();
                                                setCheckedItems([]);
                                            }}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label">Channel</label>
                                                    <select name="channel" className="input" defaultValue="INTERNAL">
                                                        <option value="INTERNAL">Internal</option>
                                                        <option value="EMAIL">Email</option>
                                                        <option value="PHONE">Phone</option>
                                                        <option value="WHATSAPP">WhatsApp</option>
                                                        <option value="MEETING">Meeting</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="label">Outcome</label>
                                                    <select name="outcome" className="input" defaultValue="FOLLOW_UP_REQUIRED">
                                                        <option value="">Select outcome...</option>
                                                        <option value="FOLLOW_UP_REQUIRED">Follow-up required</option>
                                                        <option value="READY_TO_LAUNCH">Ready to launch</option>
                                                        <option value="SPONSOR_PIPELINE_ACTIVE">Sponsor pipeline active</option>
                                                        <option value="REGISTRATION_PUSH_REQUIRED">Registration push required</option>
                                                        <option value="ON_TRACK">On track</option>
                                                        <option value="AT_RISK">At risk</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="label">Subject</label>
                                                <input name="subject" className="input" placeholder="Conference planning or outreach update" required />
                                            </div>

                                            <div>
                                                <label className="label">Remark / Notes</label>
                                                <textarea name="notes" className="input h-28" placeholder="Write the conference-level follow-up here..." required />
                                            </div>

                                            <div>
                                                <label className="label">Next Follow-up Date</label>
                                                <input type="datetime-local" name="nextFollowUpDate" className="input" />
                                            </div>

                                            <ConversationChecklist checkedItems={checkedItems} onChange={setCheckedItems} />

                                            <button type="submit" className="btn btn-primary w-full" disabled={submittingFollowup}>
                                                {submittingFollowup ? 'Saving...' : 'Save Conference Follow-up'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                        {activeTab === 'insights' && (
                            <div className="space-y-6">
                                {fetchingInsights ? (
                                    <div className="p-12 text-center text-slate-500 font-bold">Analyzing conference data...</div>
                                ) : (
                                    <>
                                        {/* Analytics Overview */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="card-premium p-6 bg-white border-l-4 border-emerald-500">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Total Revenue</h4>
                                                <div className="text-3xl font-black text-slate-900">₹{analytics?.overview?.totalRevenue.toLocaleString() || 0}</div>
                                                <p className="text-xs text-emerald-600 mt-2 font-bold">Real-time aggregation</p>
                                            </div>
                                            <div className="card-premium p-6 bg-white border-l-4 border-sky-500">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Paper Submissions</h4>
                                                <div className="text-3xl font-black text-slate-900">{analytics?.overview?.totalPapers || 0}</div>
                                                <p className="text-xs text-sky-600 mt-2 font-bold">Academics active</p>
                                            </div>
                                            <div className="card-premium p-6 bg-white border-l-4 border-amber-500">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Attendee Sentiment</h4>
                                                <div className="text-3xl font-black text-slate-900">{feedbackData?.statistics?.averageRating.toFixed(1) || '0.0'} / 5.0</div>
                                                <p className="text-xs text-amber-600 mt-2 font-bold">Based on {feedbackData?.statistics?.totalResponses || 0} reviews</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Tickets & Tracks distribution */}
                                            <div className="card-premium p-6">
                                                <h3 className="font-bold text-lg mb-6 border-b pb-4">Revenue by Ticket Type</h3>
                                                <div className="space-y-4">
                                                    {analytics?.tickets?.length > 0 ? analytics.tickets.map((t: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4">
                                                            <div className="w-24 text-sm font-bold text-slate-500 truncate">{t.name}</div>
                                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-sky-500 transition-all duration-1000" 
                                                                    style={{ width: `${analytics.overview.totalRevenue > 0 ? (t.revenue / analytics.overview.totalRevenue) * 100 : 0}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="w-20 text-right text-sm font-black text-slate-900">₹{t.revenue.toLocaleString()}</div>
                                                        </div>
                                                    )) : <p className="text-center text-slate-400 py-4 text-sm">No ticket data available</p>}
                                                </div>
                                            </div>

                                            {/* Recent Feedback */}
                                            <div className="card-premium p-6 max-h-[500px] overflow-y-auto">
                                                <h3 className="font-bold text-lg mb-6 border-b pb-4">Latest Feedback</h3>
                                                {feedbackData?.feedbacks.length === 0 ? (
                                                    <p className="text-slate-400 text-center py-8 italic text-sm">No feedback received yet.</p>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {feedbackData?.feedbacks.map((f: any, i: number) => (
                                                            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black italic">
                                                                            {f.rating} ★
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-900">{f.user?.name || f.user?.email || 'Anonymous'}</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.category}</span>
                                                                </div>
                                                                <p className="text-sm text-slate-600 italic">&quot;{f.content}&quot;</p>
                                                                <div className="text-[10px] text-slate-400 mt-2 text-right">{new Date(f.createdAt).toLocaleDateString()}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </div>
        </ConferenceShell>
    );
}
