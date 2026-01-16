'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowLeft, Calendar, MapPin, Users, FileText, DollarSign,
    Globe, Palette, Settings, Ticket, Tag, Award, CheckCircle,
    Plus, Edit2, Trash2, Save, X, ExternalLink, HelpCircle
} from 'lucide-react';

export default function ConferenceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const conferenceId = params.id as string;

    const [conference, setConference] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'tracks' | 'sponsors' | 'committee'>('overview');
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState<any>({});

    // Modals
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [showSponsorModal, setShowSponsorModal] = useState(false);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [committeeMembers, setCommitteeMembers] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);



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


    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchConference();
    }, [conferenceId, fetchConference]);

    useEffect(() => {
        if (activeTab === 'committee') {
            fetchCommittee();
            fetchUsers();
        }
    }, [activeTab, fetchCommittee, fetchUsers]);

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

            console.log('Publish Response:', res.status);
            if (res.ok) {
                const result = await res.json();
                console.log('Publish Result:', result);
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
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/conferences" className="btn btn-secondary btn-sm">
                            <ArrowLeft size={16} /> Back
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-secondary-900">{conference.title}</h1>
                            <p className="text-secondary-500">Conference Management</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
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
                </div>



                {/* Registration CTA (Public) */}
                {conference.status === 'PUBLISHED' && (
                    <div className="card-premium p-8 bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-xl shadow-primary-200">
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
                <div className={`p-4 rounded-2xl ${conference.status === 'PUBLISHED' ? 'bg-success-50 border border-success-200' :
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

                {/* Tabs */}
                <div className="flex gap-2 border-b border-secondary-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'overview'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        <Settings size={16} className="inline mr-2" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'tickets'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        <Ticket size={16} className="inline mr-2" />
                        Tickets ({conference.ticketTypes?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('tracks')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'tracks'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        <Tag size={16} className="inline mr-2" />
                        Tracks ({conference.tracks?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('sponsors')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'sponsors'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        <Award size={16} className="inline mr-2" />
                        Sponsors ({conference.sponsors?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('committee')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'committee'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        <Users size={16} className="inline mr-2" />
                        Committee ({committeeMembers.length || 0})
                    </button>
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
            </div >
        </DashboardLayout >
    );
}
