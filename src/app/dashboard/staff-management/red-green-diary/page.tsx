'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, CheckCircle, AlertOctagon, Trash2, Calendar, User, Search, Loader2 } from 'lucide-react';

interface DiaryEntry {
    id: string;
    userId: string;
    type: 'RED' | 'GREEN';
    title: string;
    description: string;
    date: string;
    createdAt: string;
    user: { id: string; name: string; email: string };
    recordedBy: { id: string; name: string };
}

interface Staff {
    id: string;
    name: string;
    email: string;
}

export default function RedGreenDiaryPage() {
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [users, setUsers] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'RED' | 'GREEN'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        userId: '',
        type: 'GREEN',
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [entriesRes, usersRes] = await Promise.all([
                fetch('/api/staff-management/red-green-diary'),
                fetch('/api/users?limit=1000')
            ]);
            
            if (entriesRes.ok) {
                setEntries(await entriesRes.json());
            }

            if (usersRes.ok) {
                const userData = await usersRes.json();
                setUsers(Array.isArray(userData) ? userData : (userData.data || []));
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/staff-management/red-green-diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({ userId: '', type: 'GREEN', title: '', description: '', date: new Date().toISOString().split('T')[0] });
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create entry');
            }
        } catch (error) {
            console.error('Failed to submit:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this diary entry?')) return;
        try {
            const res = await fetch(`/api/staff-management/red-green-diary/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const filteredEntries = entries.filter(e => {
        if (activeTab !== 'ALL' && e.type !== activeTab) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            return e.title.toLowerCase().includes(q) || 
                   e.description.toLowerCase().includes(q) || 
                   e.user?.name?.toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                <AlertOctagon className="h-5 w-5" />
                            </span>
                            Red & Green Diary
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Confidential tracking of staff achievements and concerns</p>
                    </div>
                    
                    <button 
                        onClick={() => setShowModal(true)} 
                        className="btn btn-primary shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-0.5"
                    >
                        <Plus className="h-4 w-4" /> New Entry
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <button onClick={() => setActiveTab('ALL')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'ALL' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                            All Entries
                        </button>
                        <button onClick={() => setActiveTab('GREEN')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'GREEN' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'}`}>
                            <CheckCircle className="h-4 w-4" /> Green (Praise)
                        </button>
                        <button onClick={() => setActiveTab('RED')} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'RED' ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'}`}>
                            <AlertOctagon className="h-4 w-4" /> Red (Concern)
                        </button>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search employee or notes..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 transition-all dark:text-white"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl flex flex-col items-center justify-center py-20 text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                            <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No entries found</h3>
                        <p className="text-gray-500 mt-1 max-w-sm">There are no diary records matching your current filter in the system.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEntries.map(entry => (
                            <div key={entry.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border transition-all hover:shadow-xl ${entry.type === 'GREEN' ? 'border-green-100 hover:border-green-300 dark:border-green-900/30' : 'border-red-100 hover:border-red-300 dark:border-red-900/30'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2.5 rounded-xl ${entry.type === 'GREEN' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                                        {entry.type === 'GREEN' ? <CheckCircle className="h-5 w-5" /> : <AlertOctagon className="h-5 w-5" />}
                                    </div>
                                    <button onClick={() => handleDelete(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete entry">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1" title={entry.title}>{entry.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 line-clamp-3" title={entry.description}>{entry.description}</p>
                                
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        <div className="flex items-center gap-1.5" title={entry.user?.email}>
                                            <User className="h-3.5 w-3.5" /> {entry.user?.name || 'Unknown Staff'}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" /> {new Date(entry.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 pb-0">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Record Diary Entry</h2>
                                <p className="text-sm text-gray-500 mt-1">Add confidential notes for staff behavior, praise, or alerts.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${formData.type === 'GREEN' ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                        <input type="radio" name="type" value="GREEN" className="sr-only" checked={formData.type === 'GREEN'} onChange={() => setFormData({...formData, type: 'GREEN'})} />
                                        <div className={`p-2 rounded-full ${formData.type === 'GREEN' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700'}`}>
                                            <CheckCircle className="h-6 w-6" />
                                        </div>
                                        <span className={`font-bold ${formData.type === 'GREEN' ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}`}>Green (Praise)</span>
                                    </label>
                                    <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${formData.type === 'RED' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                        <input type="radio" name="type" value="RED" className="sr-only" checked={formData.type === 'RED'} onChange={() => setFormData({...formData, type: 'RED'})} />
                                        <div className={`p-2 rounded-full ${formData.type === 'RED' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700'}`}>
                                            <AlertOctagon className="h-6 w-6" />
                                        </div>
                                        <span className={`font-bold ${formData.type === 'RED' ? 'text-red-700 dark:text-red-400' : 'text-gray-500'}`}>Red (Concern)</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Employee</label>
                                    <select 
                                        required
                                        value={formData.userId}
                                        onChange={e => setFormData({...formData, userId: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                                    >
                                        <option value="">-- Select Employee --</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Date of Incident / Praise</label>
                                    <input 
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Summary / Title</label>
                                    <input 
                                        type="text"
                                        required
                                        placeholder="Brief title"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Detailed Notes</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        placeholder="Provide context and details here..."
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 resize-none dark:text-white"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className={`flex-1 flex items-center justify-center font-bold px-4 py-2.5 text-white rounded-xl transition-colors ${formData.type === 'RED' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'} ${submitting ? 'opacity-70 cursor-not-allowed' : 'shadow-lg'}`}
                                    >
                                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Entry'}
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
