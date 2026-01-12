'use client';

import { useState, useEffect, use, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Users,
    UserPlus,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    UserCheck,
    Mail,
    Award,
    BookOpen,
    CheckCircle,
    XCircle,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export default function JournalReviewersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: journalId } = use(params);
    const [journal, setJournal] = useState<any>(null);
    const [reviewers, setReviewers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [specialization, setSpecialization] = useState<string>('');
    const [specializations, setSpecializations] = useState<string[]>([]);
    const [bio, setBio] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchJournal = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setJournal(await res.json());
        } catch (error) { console.error(error); }
    }, [journalId]);

    const fetchReviewers = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}/reviewers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setReviewers(await res.json());
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [journalId]);

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableUsers(Array.isArray(data) ? data : (data.data || []));
            }
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchJournal();
        fetchReviewers();
        fetchUsers();
    }, [fetchJournal, fetchReviewers, fetchUsers]);

    const handleAddReviewer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        const finalSpecs = [...specializations];
        if (specialization.trim() && !finalSpecs.includes(specialization.trim())) {
            finalSpecs.push(specialization.trim());
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}/reviewers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: selectedUser,
                    specialization: finalSpecs,
                    bio
                })
            });

            if (res.ok) {
                setShowAddModal(false);
                fetchReviewers();
                resetForm();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to add reviewer');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedUser('');
        setSpecializations([]);
        setSpecialization('');
        setBio('');
    };

    const addSpecialization = () => {
        if (specialization.trim() && !specializations.includes(specialization.trim())) {
            setSpecializations([...specializations, specialization.trim()]);
            setSpecialization('');
        }
    };

    const removeSpecialization = (spec: string) => {
        setSpecializations(specializations.filter(s => s !== spec));
    };

    const toggleReviewerStatus = async (reviewerId: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}/reviewers/${reviewerId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });

            if (res.ok) {
                fetchReviewers();
            }
        } catch (error) { console.error(error); }
    };

    const removeReviewer = async (reviewerId: string) => {
        if (!confirm('Are you sure you want to remove this reviewer?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}/reviewers/${reviewerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchReviewers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to remove reviewer');
            }
        } catch (error) { console.error(error); }
    };

    const filteredReviewers = reviewers.filter(r =>
        r.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.specialization.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/editorial" className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Journal Reviewers</h1>
                        <p className="text-secondary-500">{journal?.name || 'Loading...'}</p>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Reviewers', count: reviewers.length, icon: Users, color: 'text-primary-600' },
                        { label: 'Active', count: reviewers.filter(r => r.isActive).length, icon: UserCheck, color: 'text-success-600' },
                        { label: 'Total Reviews', count: reviewers.reduce((acc, r) => acc + (r.totalReviews || 0), 0), icon: BookOpen, color: 'text-secondary-600' },
                        { label: 'Completed', count: reviewers.reduce((acc, r) => acc + (r.completedReviews || 0), 0), icon: CheckCircle, color: 'text-success-600' }
                    ].map((stat, i) => (
                        <div key={i} className="card-premium p-5 bg-white flex items-center gap-4">
                            <div className={`p-3 rounded-2xl bg-secondary-50 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{stat.label}</h4>
                                <p className="text-2xl font-black text-secondary-900">{stat.count}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions & Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or expertise..."
                            className="input pl-10 h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center gap-2 w-full md:w-auto h-11"
                    >
                        <UserPlus size={18} /> Add Reviewer
                    </button>
                </div>

                {/* Reviewers List */}
                <div className="bg-white rounded-3xl border border-secondary-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-12 text-center text-secondary-500">Loading reviewers...</div>
                    ) : reviewers.length === 0 ? (
                        <div className="p-12 text-center text-secondary-500">
                            <Users size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-bold">No reviewers found</p>
                            <p className="text-sm">Start by adding experts to your journal&apos;s reviewer pool.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-secondary-50 text-secondary-900 font-bold border-b border-secondary-200">
                                    <tr>
                                        <th className="p-4">Expert</th>
                                        <th className="p-4">Specialization</th>
                                        <th className="p-4 text-center">Reviews</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 text-secondary-600">
                                    {filteredReviewers.map(reviewer => (
                                        <tr key={reviewer.id} className="hover:bg-secondary-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                                                        {reviewer.user.name?.[0] || reviewer.user.email[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-secondary-900">{reviewer.user.name || 'Unnamed Researcher'}</div>
                                                        <div className="text-xs flex items-center gap-1"><Mail size={12} /> {reviewer.user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {reviewer.specialization.map((spec: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-secondary-100 text-[10px] font-bold text-secondary-600 rounded">
                                                            {spec}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-secondary-900">{reviewer.completedReviews} / {reviewer.totalReviews}</span>
                                                    <span className="text-[10px] uppercase text-secondary-400 font-black">Success Rate</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => toggleReviewerStatus(reviewer.id, reviewer.isActive)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${reviewer.isActive
                                                        ? 'bg-success-100 text-success-700 hover:bg-success-200'
                                                        : 'bg-secondary-100 text-secondary-400 hover:bg-secondary-200'
                                                        }`}
                                                >
                                                    {reviewer.isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => removeReviewer(reviewer.id)}
                                                        className="p-2 text-secondary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                        title="Remove Reviewer"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add Reviewer Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-secondary-900">Add New Reviewer</h3>
                                    <p className="text-secondary-500">Search and recruit an expert to the pool.</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary-100 rounded-full">
                                    <XCircle className="text-secondary-300" />
                                </button>
                            </div>

                            <form onSubmit={handleAddReviewer} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Select User</label>
                                    <select
                                        className="input h-12"
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose a user...</option>
                                        {availableUsers.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Expertise / Specialization</label>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            className="input h-11"
                                            placeholder="e.g. AI, Quantum Physics..."
                                            value={specialization}
                                            onChange={(e) => setSpecialization(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSpecialization();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={addSpecialization}
                                            className="btn btn-secondary px-4 h-11"
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {specializations.map((spec, i) => (
                                            <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold flex items-center gap-2">
                                                {spec}
                                                <button type="button" onClick={() => removeSpecialization(spec)} className="hover:text-primary-900">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Brief Bio / Credentials</label>
                                    <textarea
                                        className="input min-h-[100px] py-3 h-auto"
                                        placeholder="Enter reviewer's professional background..."
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !selectedUser}
                                        className="btn btn-primary flex-1 h-12"
                                    >
                                        {isSubmitting ? 'Adding...' : 'Add as Reviewer'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="btn btn-secondary px-8 h-12"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

