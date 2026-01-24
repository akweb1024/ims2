'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { Users, BookOpen, Layers, Save, Trash2, Plus, Edit2, X, Check, Target } from 'lucide-react';
import WoSReadinessAudit from '@/components/journals/WoSReadinessAudit';

export default function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [userRole, setUserRole] = useState<string>('CUSTOMER');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Overview Data
    const [formData, setFormData] = useState({
        name: '', issnPrint: '', issnOnline: '', frequency: 'Monthly',
        formatAvailable: 'Print,Online,Hybrid', subjectCategory: '',
        priceINR: '', priceUSD: '', isActive: true
    });
    const [savingOverview, setSavingOverview] = useState(false);

    // Board Data
    const [boardMembers, setBoardMembers] = useState<any[]>([]);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [memberForm, setMemberForm] = useState({
        name: '', email: '', designation: '', affiliation: '', bio: '', userId: ''
    });

    // Volumes Data
    const [volumes, setVolumes] = useState<any[]>([]);
    const [showVolumeModal, setShowVolumeModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState<string | null>(null); // Volume ID
    const [volumeForm, setVolumeForm] = useState({ volumeNumber: '', year: new Date().getFullYear().toString() });
    const [issueForm, setIssueForm] = useState({ issueNumber: '', month: '', title: '' });

    // Indexing Data
    const [trackings, setTrackings] = useState<any[]>([]);
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    // Hardcoded for demo/simplicity - In real app, fetch from /api/master/indexing
    const [availableIndexings] = useState([
        { id: 'wos-123', name: 'Web of Science (WoS)', code: 'WOS' },
        { id: 'scopus-456', name: 'Scopus', code: 'SCOPUS' }
    ]);

    const fetchJournal = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    name: data.name, issnPrint: data.issnPrint || '', issnOnline: data.issnOnline || '',
                    frequency: data.frequency, formatAvailable: data.formatAvailable, subjectCategory: data.subjectCategory || '',
                    priceINR: data.priceINR.toString(), priceUSD: data.priceUSD.toString(), isActive: data.isActive
                });
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    }, [id]);

    const fetchBoard = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/editorial-board`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setBoardMembers(await res.json());
        } catch (err) { console.error(err); }
    }, [id]);

    const fetchVolumes = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/volumes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setVolumes(await res.json());
        } catch (err) { console.error(err); }
    }, [id]);

    const fetchTrackings = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/indexing`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setTrackings(await res.json());
        } catch (err) { console.error(err); }
    }, [id]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchJournal();
        fetchBoard();
        fetchVolumes();
        fetchTrackings();
    }, [id, fetchJournal, fetchBoard, fetchVolumes, fetchTrackings]);

    // --- INDEXING HANDLERS ---
    const handleAddTracking = async (indexingId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/indexing`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ indexingId, status: 'PLANNED' })
            });
            if (res.ok) {
                fetchTrackings();
                setShowTrackingModal(false);
            }
        } catch (error) { console.error(error); }
    };

    // --- OVERVIEW HANDLERS ---
    const handleOverviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingOverview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) alert('Journal updated successfully');
            else alert('Failed to update journal');
        } catch (error) { alert('Network error'); } finally { setSavingOverview(false); }
    };

    // --- BOARD HANDLERS ---
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/editorial-board`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(memberForm)
            });
            if (res.ok) {
                setShowMemberModal(false);
                setMemberForm({ name: '', email: '', designation: '', affiliation: '', bio: '', userId: '' });
                fetchBoard();
            } else alert('Failed to add member');
        } catch (error) { console.error(error); }
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!confirm('Remove this member?')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/journals/${id}/editorial-board/${memberId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchBoard();
        } catch (error) { console.error(error); }
    };

    // --- VOLUMES HANDLERS ---
    const handleAddVolume = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/volumes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(volumeForm)
            });
            if (res.ok) {
                setShowVolumeModal(false);
                fetchVolumes();
            } else alert('Failed to add volume');
        } catch (error) { console.error(error); }
    };

    const handleAddIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showIssueModal) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${id}/volumes/${showIssueModal}/issues`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(issueForm)
            });
            if (res.ok) {
                setShowIssueModal(null);
                setIssueForm({ issueNumber: '', month: '', title: '' });
                fetchVolumes();
            } else alert('Failed to add issue');
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/dashboard/journals" className="p-2 hover:bg-secondary-100 rounded-full text-secondary-600 transition-colors">
                        <Users className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Edit Journal</h1>
                        <p className="text-secondary-500">{formData.name}</p>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-secondary-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                    >
                        <BookOpen size={18} /> Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('board')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'board' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                    >
                        <Users size={18} /> Editorial Board
                    </button>
                    <button
                        onClick={() => setActiveTab('volumes')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'volumes' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                    >
                        <Layers size={18} /> Volumes & Issues
                    </button>
                    <button
                        onClick={() => setActiveTab('indexing')}
                        className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'indexing' ? 'border-primary-500 text-primary-600' : 'border-transparent text-secondary-400'}`}
                    >
                        <Target size={18} /> Indexing & Audit
                    </button>
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <form onSubmit={handleOverviewSubmit} className="card-premium p-8 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="col-span-2"><label className="label">Journal Name</label><input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                        <div><label className="label">ISSN (Print)</label><input className="input" value={formData.issnPrint} onChange={e => setFormData({ ...formData, issnPrint: e.target.value })} /></div>
                        <div><label className="label">ISSN (Online)</label><input className="input" value={formData.issnOnline} onChange={e => setFormData({ ...formData, issnOnline: e.target.value })} /></div>
                        <div><label className="label">Frequency</label><select className="input" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}><option>Monthly</option><option>Quarterly</option><option>Annual</option></select></div>
                        <div><label className="label">Price (INR)</label><input type="number" className="input" value={formData.priceINR} onChange={e => setFormData({ ...formData, priceINR: e.target.value })} /></div>
                        <div className="col-span-2 pt-4"><button type="submit" className="btn btn-primary w-full" disabled={savingOverview}>{savingOverview ? 'Saving...' : 'Save Changes'}</button></div>
                    </form>
                )}

                {/* BOARD TAB */}
                {activeTab === 'board' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-xl border border-secondary-200">
                            <div>
                                <h3 className="font-bold text-lg text-secondary-900">Board Members</h3>
                                <p className="text-secondary-500 text-sm">Manage editors and reviewers for this journal.</p>
                            </div>
                            <button onClick={() => setShowMemberModal(true)} className="btn btn-primary flex items-center gap-2"><Plus size={18} /> Add Member</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {boardMembers.map(member => (
                                <div key={member.id} className="card-premium p-4 flex gap-4 items-start group">
                                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-black text-primary-600 text-xl border-2 border-white shadow-sm">
                                        {member.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-secondary-900">{member.name}</h4>
                                        <p className="text-primary-600 text-xs font-bold uppercase mb-1">{member.designation}</p>
                                        <p className="text-secondary-500 text-xs">{member.email}</p>
                                        <p className="text-secondary-400 text-xs mt-1 italic">{member.affiliation}</p>
                                    </div>
                                    <button onClick={() => handleDeleteMember(member.id)} className="text-secondary-300 hover:text-danger-500 p-2"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            {boardMembers.length === 0 && <div className="col-span-2 p-8 text-center text-secondary-400 italic bg-white rounded-xl border border-dashed border-secondary-300">No board members yet.</div>}
                        </div>
                    </div>
                )}

                {/* VOLUMES TAB */}
                {activeTab === 'volumes' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-xl border border-secondary-200">
                            <div>
                                <h3 className="font-bold text-lg text-secondary-900">Volumes & Issues</h3>
                                <p className="text-secondary-500 text-sm">Organize content structure.</p>
                            </div>
                            <button onClick={() => setShowVolumeModal(true)} className="btn btn-secondary flex items-center gap-2"><Plus size={18} /> New Volume</button>
                        </div>
                        <div className="space-y-4">
                            {volumes.map(vol => (
                                <div key={vol.id} className="card-premium p-0 overflow-hidden border border-secondary-200">
                                    <div className="bg-secondary-50 p-4 flex justify-between items-center border-b border-secondary-100">
                                        <div>
                                            <h4 className="font-black text-secondary-900 text-lg">Volume {vol.volumeNumber}</h4>
                                            <p className="text-secondary-500 text-xs font-bold">Year: {vol.year}</p>
                                        </div>
                                        <button onClick={() => setShowIssueModal(vol.id)} className="text-primary-600 hover:text-primary-700 text-xs font-bold bg-white px-3 py-1.5 rounded-lg shadow-sm border border-secondary-100">
                                            + Add Issue
                                        </button>
                                    </div>
                                    <div className="divide-y divide-secondary-100">
                                        {vol.issues.map((issue: any) => (
                                            <div key={issue.id} className="p-4 flex justify-between items-center hover:bg-secondary-50/50">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center font-bold text-secondary-500 text-sm">
                                                        #{issue.issueNumber}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900">Issue {issue.issueNumber} ({issue.month})</p>
                                                        <p className="text-xs text-secondary-400">{issue.title || 'No Title'} • {issue._count.articles} Articles</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${issue.status === 'PUBLISHED' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>{issue.status}</span>
                                            </div>
                                        ))}
                                        {vol.issues.length === 0 && <div className="p-4 text-center text-secondary-400 text-xs italic">No issues created.</div>}
                                    </div>
                                </div>
                            ))}
                            {volumes.length === 0 && <div className="p-12 text-center text-secondary-400 italic bg-white rounded-xl border border-dashed border-secondary-300">No volumes found.</div>}
                        </div>
                    </div>
                )}

                {/* INDEXING TAB */}
                {activeTab === 'indexing' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center bg-secondary-50 p-4 rounded-xl border border-secondary-200">
                            <div>
                                <h3 className="font-bold text-lg text-secondary-900">Indexing Applications</h3>
                                <p className="text-secondary-500 text-sm">Manage applications to Web of Science, Scopus, etc.</p>
                            </div>
                            <button onClick={() => setShowTrackingModal(true)} className="btn btn-primary flex items-center gap-2"><Plus size={18} /> Apply for Indexing</button>
                        </div>

                        {trackings.length === 0 ? (
                            <div className="p-12 text-center text-secondary-400 italic bg-white rounded-xl border border-dashed border-secondary-300">
                                No indexing applications started. Click &quot;Apply&quot; to begin.
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {trackings.map((t: any) => (
                                    <div key={t.id} className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xl font-bold text-secondary-900 border-b-2 border-primary-500 inline-block pb-1">
                                                {availableIndexings.find(i => i.id === t.indexingId)?.name || 'Indexing Application'}
                                            </h4>
                                            <span className={`badge ${t.status === 'INDEXED' ? 'badge-success' : t.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                                                Status: {t.status}
                                            </span>
                                        </div>

                                        {/* Render WoS Audit if applicable */}
                                        {/* In real app, check indexing code. Assuming first one is WoS for demo */}
                                        <WoSReadinessAudit
                                            journalId={id as string}
                                            indexingId={t.indexingId}
                                            initialData={t.auditData as any}
                                            initialScore={t.auditScore || 0}
                                            onUpdate={fetchTrackings}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* TRACKING MODAL */}
            {showTrackingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">Select Indexing Service</h3>
                        <div className="space-y-2">
                            {availableIndexings.map(idx => (
                                <button
                                    key={idx.id}
                                    onClick={() => handleAddTracking(idx.id)}
                                    className="w-full p-4 text-left border border-secondary-200 rounded-xl hover:bg-primary-50 hover:border-primary-500 transition-colors font-bold text-secondary-900"
                                >
                                    {idx.name}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowTrackingModal(false)} className="btn btn-secondary w-full mt-4">Cancel</button>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showMemberModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleAddMember} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">Add Board Member</h3>
                        <div className="space-y-4">
                            <input className="input" placeholder="Name" required value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} />
                            <input className="input" placeholder="Email" required value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} />
                            <input className="input" placeholder="Designation (e.g. Editor)" required value={memberForm.designation} onChange={e => setMemberForm({ ...memberForm, designation: e.target.value })} />
                            <input className="input" placeholder="Affiliation" value={memberForm.affiliation} onChange={e => setMemberForm({ ...memberForm, affiliation: e.target.value })} />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button type="submit" className="btn btn-primary flex-1">Add</button>
                            <button type="button" onClick={() => setShowMemberModal(false)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {showVolumeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleAddVolume} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">New Volume</h3>
                        <div className="space-y-4">
                            <input type="number" className="input" placeholder="Volume Number" required value={volumeForm.volumeNumber} onChange={e => setVolumeForm({ ...volumeForm, volumeNumber: e.target.value })} />
                            <input type="number" className="input" placeholder="Year" required value={volumeForm.year} onChange={e => setVolumeForm({ ...volumeForm, year: e.target.value })} />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button type="submit" className="btn btn-primary flex-1">Create</button>
                            <button type="button" onClick={() => setShowVolumeModal(false)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleAddIssue} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">New Issue</h3>
                        <div className="space-y-4">
                            <input type="number" className="input" placeholder="Issue Number" required value={issueForm.issueNumber} onChange={e => setIssueForm({ ...issueForm, issueNumber: e.target.value })} />
                            <select className="input" required value={issueForm.month} onChange={e => setIssueForm({ ...issueForm, month: e.target.value })}>
                                <option value="">Select Month</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                            </select>
                            <input className="input" placeholder="Title (Optional)" value={issueForm.title} onChange={e => setIssueForm({ ...issueForm, title: e.target.value })} />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button type="submit" className="btn btn-primary flex-1">Create</button>
                            <button type="button" onClick={() => setShowIssueModal(null)} className="btn btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </DashboardLayout>
    );
}
