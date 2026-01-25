'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Calendar, MapPin, Users, FileText, Plus, Search,
    Filter, Eye, Edit2, Trash2, CheckCircle, Clock, X
} from 'lucide-react';

export default function ConferencesPage() {
    const router = useRouter();
    const [conferences, setConferences] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [modeFilter, setModeFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchConferences = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            let url = '/api/conferences?';

            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (modeFilter !== 'all') url += `mode=${modeFilter}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setConferences(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, modeFilter]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchConferences();
    }, [fetchConferences]);

    const handleCreateConference = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/conferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const conference = await res.json();
                setShowCreateModal(false);
                router.push(`/dashboard/conferences/${conference.id}`);
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to create conference');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to create conference');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this conference?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchConferences();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredConferences = conferences.filter(conf =>
        conf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conf.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canCreate = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: any }> = {
            DRAFT: { bg: 'bg-secondary-100', text: 'text-secondary-700', icon: Clock },
            PUBLISHED: { bg: 'bg-success-100', text: 'text-success-700', icon: CheckCircle },
            ONGOING: { bg: 'bg-primary-100', text: 'text-primary-700', icon: Calendar },
            COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700', icon: CheckCircle },
            CANCELLED: { bg: 'bg-danger-100', text: 'text-danger-700', icon: X }
        };

        const badge = badges[status] || badges.DRAFT;
        const Icon = badge.icon;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text} flex items-center gap-1`}>
                <Icon size={12} />
                {status}
            </span>
        );
    };

    const getModeBadge = (mode: string) => {
        const colors: Record<string, string> = {
            IN_PERSON: 'bg-blue-100 text-blue-700',
            VIRTUAL: 'bg-green-100 text-green-700',
            HYBRID: 'bg-purple-100 text-purple-700'
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors[mode] || colors.IN_PERSON}`}>
                {mode.replace('_', ' ')}
            </span>
        );
    };

    if (loading) return <div className="p-8 text-center">Loading conferences...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Conferences & Events</h1>
                        <p className="text-secondary-500">Manage academic conferences and workshops</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={16} /> New Conference
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="card-premium p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search conferences..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input pl-10 w-full"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input w-full"
                            >
                                <option value="all">All Status</option>
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ONGOING">Ongoing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {/* Mode Filter */}
                        <div>
                            <select
                                value={modeFilter}
                                onChange={(e) => setModeFilter(e.target.value)}
                                className="input w-full"
                            >
                                <option value="all">All Modes</option>
                                <option value="IN_PERSON">In-Person</option>
                                <option value="VIRTUAL">Virtual</option>
                                <option value="HYBRID">Hybrid</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Conference Grid */}
                {filteredConferences.length === 0 ? (
                    <div className="card-premium p-12 text-center">
                        <Calendar size={64} className="mx-auto text-secondary-300 mb-4" />
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">No Conferences Found</h3>
                        <p className="text-secondary-500 mb-6">
                            {searchTerm ? 'Try adjusting your search or filters' : 'Get started by creating your first conference'}
                        </p>
                        {canCreate && !searchTerm && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-primary"
                            >
                                Create Conference
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredConferences.map((conference) => (
                            <div key={conference.id} className="card-premium group hover:border-primary-200 transition-all">
                                {/* Banner */}
                                <div
                                    className="h-32 rounded-t-2xl relative overflow-hidden"
                                    style={{
                                        backgroundColor: conference.primaryColor || '#3B82F6',
                                        backgroundImage: conference.bannerUrl ? `url(${conference.bannerUrl})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <div className="absolute top-2 right-2 flex gap-2">
                                        {getStatusBadge(conference.status)}
                                    </div>
                                    <div className="absolute bottom-2 left-2">
                                        {getModeBadge(conference.mode)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <h3 className="font-bold text-lg text-secondary-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                                        {conference.title}
                                    </h3>
                                    <p className="text-sm text-secondary-600 line-clamp-2 mb-4">
                                        {conference.description}
                                    </p>

                                    {/* Info */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-secondary-500">
                                            <Calendar size={14} />
                                            <span>
                                                {new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {conference.venue && (
                                            <div className="flex items-center gap-2 text-sm text-secondary-500">
                                                <MapPin size={14} />
                                                <span className="line-clamp-1">{conference.venue}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-secondary-50 rounded-xl">
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-secondary-900">{conference._count.registrations}</p>
                                            <p className="text-xs text-secondary-500">Registrations</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-secondary-900">{conference._count.papers}</p>
                                            <p className="text-xs text-secondary-500">Papers</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/dashboard/conferences/${conference.id}`}
                                            className="btn btn-sm btn-primary flex-1"
                                        >
                                            <Eye size={14} /> View
                                        </Link>
                                        {canCreate && (
                                            <button
                                                onClick={() => handleDelete(conference.id)}
                                                className="btn btn-sm btn-danger"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Create New Conference</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-secondary-400 hover:text-secondary-900">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateConference} className="space-y-4">
                                <div>
                                    <label className="label">Conference Title *</label>
                                    <input name="title" className="input" required placeholder="e.g., International Conference on AI 2026" />
                                </div>
                                <div>
                                    <label className="label">Description *</label>
                                    <textarea name="description" className="input h-24" required placeholder="Brief description of the conference..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Start Date *</label>
                                        <input name="startDate" type="date" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">End Date *</label>
                                        <input name="endDate" type="date" className="input" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Mode</label>
                                        <select name="mode" className="input">
                                            <option value="IN_PERSON">In-Person</option>
                                            <option value="VIRTUAL">Virtual</option>
                                            <option value="HYBRID">Hybrid</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Max Attendees</label>
                                        <input name="maxAttendees" type="number" className="input" placeholder="Leave empty for unlimited" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Venue</label>
                                    <input name="venue" className="input" placeholder="e.g., Grand Hotel, New York" />
                                </div>
                                <div>
                                    <label className="label">Organizer</label>
                                    <input name="organizer" className="input" placeholder="e.g., IEEE Computer Society" />
                                </div>
                                <div>
                                    <label className="label">Website</label>
                                    <input name="website" type="url" className="input" placeholder="https://conference.example.com" />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">Create Conference</button>
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
