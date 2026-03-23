'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ConferenceShell from '@/components/dashboard/conferences/ConferenceShell';
import { Calendar, MapPin, Users, Plus, Search, Eye, Trash2, CheckCircle, Clock, X, Brain, Sparkles, Radio, ArrowRight } from 'lucide-react';
import { getHealthBadgeColor } from '@/lib/predictions';

export default function AllConferencesPage() {
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
            setLoading(true);
            const token = localStorage.getItem('token');
            let url = '/api/conferences?';
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (modeFilter !== 'all') url += `mode=${modeFilter}&`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setConferences(await res.json());
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
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (res.ok) {
                const conference = await res.json();
                setShowCreateModal(false);
                router.push(`/dashboard/conferences/${conference.id}`);
            } else {
                const error = await res.json().catch(() => null);
                alert(error?.error || 'Failed to create conference');
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
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) fetchConferences();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredConferences = conferences.filter((conference) =>
        conference.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conference.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const canCreate = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; icon: any }> = {
            DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock },
            PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
            ONGOING: { bg: 'bg-sky-100', text: 'text-sky-700', icon: Calendar },
            COMPLETED: { bg: 'bg-violet-100', text: 'text-violet-700', icon: CheckCircle },
            CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', icon: X }
        };

        const badge = badges[status] || badges.DRAFT;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${badge.bg} ${badge.text}`}>
                <Icon size={12} />
                {status}
            </span>
        );
    };

    const getModeBadge = (mode: string) => {
        const colors: Record<string, string> = {
            IN_PERSON: 'bg-blue-100 text-blue-700',
            VIRTUAL: 'bg-emerald-100 text-emerald-700',
            HYBRID: 'bg-violet-100 text-violet-700'
        };

        return (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[mode] || colors.IN_PERSON}`}>
                {mode.replace('_', ' ')}
            </span>
        );
    };

    return (
        <ConferenceShell
            userRole={userRole}
            title="All Conferences"
            subtitle="Browse the entire conference portfolio with cleaner filtering, stronger visual hierarchy, and an at-a-glance read on event health and follow-up pressure."
            badge="Portfolio view"
            actions={canCreate ? (
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-sky-200"
                >
                    <Plus size={16} /> New Conference
                </button>
            ) : null}
            stats={
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Calendar size={16} /> Conferences</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{conferences.length}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 text-slate-500 text-sm"><Search size={16} /> In View</div>
                        <p className="mt-3 text-3xl font-black text-slate-950">{filteredConferences.length}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-blue-700 text-sm"><Radio size={16} /> Live Or Published</div>
                        <p className="mt-3 text-3xl font-black text-blue-900">
                            {conferences.filter((conference) => ['PUBLISHED', 'ONGOING'].includes(conference.status)).length}
                        </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-amber-700 text-sm"><Sparkles size={16} /> Follow-up Ready</div>
                        <p className="mt-3 text-3xl font-black text-amber-900">
                            {conferences.filter((conference) => conference.followup?.pendingFollowUps > 0).length}
                        </p>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <section className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
                        <div className="xl:col-span-5">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Search</label>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by title or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input h-12 pl-10 w-full rounded-2xl border-slate-200 bg-slate-50/70"
                                />
                            </div>
                        </div>
                        <div className="xl:col-span-3">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Status</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input mt-2 h-12 w-full rounded-2xl border-slate-200 bg-slate-50/70">
                                <option value="all">All Status</option>
                                <option value="DRAFT">Draft</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ONGOING">Ongoing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                        <div className="xl:col-span-2">
                            <label className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Mode</label>
                            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="input mt-2 h-12 w-full rounded-2xl border-slate-200 bg-slate-50/70">
                                <option value="all">All Modes</option>
                                <option value="IN_PERSON">In-Person</option>
                                <option value="VIRTUAL">Virtual</option>
                                <option value="HYBRID">Hybrid</option>
                            </select>
                        </div>
                        <div className="xl:col-span-2">
                            <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,_rgba(14,165,233,0.07),_rgba(248,250,252,0.95))] px-4 py-3">
                                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">View State</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {loading ? 'Refreshing portfolio...' : `${filteredConferences.length} conferences in view`}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {loading ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                        Loading conferences...
                    </div>
                ) : filteredConferences.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-12 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
                        <Calendar size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">No Conferences Found</h3>
                        <p className="text-slate-500 mb-6">
                            {searchTerm ? 'Try adjusting your search or filters.' : 'Get started by creating your first conference.'}
                        </p>
                        {canCreate && !searchTerm && (
                            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">Create Conference</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {filteredConferences.map((conference) => (
                            <article key={conference.id} className="group overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(14,165,233,0.10)]">
                                <div
                                    className="relative h-40 overflow-hidden border-b border-white/20"
                                    style={{
                                        backgroundColor: conference.primaryColor || '#0ea5e9',
                                        backgroundImage: conference.bannerUrl
                                            ? `linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.58)), url(${conference.bannerUrl})`
                                            : 'radial-gradient(circle at top left, rgba(255,255,255,0.28), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.16), rgba(15,23,42,0.16))',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center'
                                    }}
                                >
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.22),_transparent_24%)]" />
                                    <div className="absolute left-4 top-4">{getModeBadge(conference.mode)}</div>
                                    <div className="absolute right-4 top-4">{getStatusBadge(conference.status)}</div>
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="inline-flex items-center rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                                            Conference Workspace
                                        </div>
                                        <h3 className="mt-3 line-clamp-2 text-xl font-black text-white">{conference.title}</h3>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <p className="line-clamp-3 text-sm leading-6 text-slate-600">{conference.description}</p>

                                    <div className="mt-5 grid grid-cols-1 gap-2 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 p-4">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Calendar size={14} className="text-sky-600" />
                                            <span>{new Date(conference.startDate).toLocaleDateString()} - {new Date(conference.endDate).toLocaleDateString()}</span>
                                        </div>
                                        {conference.venue && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <MapPin size={14} className="text-sky-600" />
                                                <span className="line-clamp-1">{conference.venue}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                                            <p className="text-2xl font-black text-slate-950">{conference._count.registrations}</p>
                                            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Registrations</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                                            <p className="text-2xl font-black text-slate-950">{conference._count.papers}</p>
                                            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Papers</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.95),_rgba(240,249,255,0.9))] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                                <Brain size={14} className="text-sky-600" />
                                                Follow-up Snapshot
                                            </div>
                                            {conference.followup?.highestRiskPrediction && (
                                                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getHealthBadgeColor(conference.followup.highestRiskPrediction.customerHealth)}`}>
                                                    {conference.followup.highestRiskPrediction.customerHealth}
                                                </span>
                                            )}
                                        </div>

                                        {conference.followup?.totalFollowUps ? (
                                            <>
                                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                                    <div className="rounded-xl bg-white p-2.5">
                                                        <div className="text-lg font-black text-slate-900">{conference.followup.totalFollowUps}</div>
                                                        <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
                                                    </div>
                                                    <div className="rounded-xl bg-amber-50 p-2.5">
                                                        <div className="text-lg font-black text-amber-900">{conference.followup.pendingFollowUps}</div>
                                                        <div className="text-[10px] uppercase tracking-wide text-amber-700">Pending</div>
                                                    </div>
                                                    <div className="rounded-xl bg-red-50 p-2.5">
                                                        <div className="text-lg font-black text-red-900">{conference.followup.overdueFollowUps}</div>
                                                        <div className="text-[10px] uppercase tracking-wide text-red-700">Overdue</div>
                                                    </div>
                                                </div>
                                                {conference.followup.nextFollowUpDate && (
                                                    <div className="mt-3 text-xs text-slate-600">
                                                        Next follow-up: <span className="font-semibold text-slate-900">{new Date(conference.followup.nextFollowUpDate).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="mt-3 text-xs text-slate-500">No follow-up logged yet.</div>
                                        )}
                                    </div>

                                    <div className="mt-5 flex gap-2">
                                        <Link href={`/dashboard/conferences/${conference.id}`} className="btn btn-sm btn-primary flex-1">
                                            <Eye size={14} /> View
                                        </Link>
                                        <Link href={`/dashboard/conferences/${conference.id}/registrations`} className="btn btn-sm btn-secondary flex-1">
                                            <Users size={14} /> Follow-ups
                                        </Link>
                                        {canCreate && (
                                            <button onClick={() => handleDelete(conference.id)} className="btn btn-sm btn-danger">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span>{conference.organizer || 'Organizer not set'}</span>
                                        <Link href={`/dashboard/conferences/${conference.id}`} className="inline-flex items-center gap-1 font-semibold text-sky-700">
                                            Open workspace <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8">
                            <div className="mb-6 flex items-center justify-between">
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
        </ConferenceShell>
    );
}
