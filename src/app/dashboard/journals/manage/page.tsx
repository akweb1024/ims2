'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Journal {
    id: string;
    name: string;
    issnPrint?: string;
    issnOnline?: string;
    journalManagerId?: string;
    journalManager?: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    domain?: {
        name: string;
    };
    publisher?: {
        name: string;
    };
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function JournalManagementPage() {
    const [loading, setLoading] = useState(true);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
    const [selectedManager, setSelectedManager] = useState('');

    useEffect(() => {
        fetchJournals();
        fetchUsers();
    }, []);

    const fetchJournals = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/journals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setJournals(data);
            }
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users?roles=JOURNAL_MANAGER,EDITOR_IN_CHIEF,ADMIN,SUPER_ADMIN', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Ensure data is an array
                setUsers(Array.isArray(data) ? data : []);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const handleAssignManager = async () => {
        if (!selectedJournal || !selectedManager) {
            alert('Please select a manager');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${selectedJournal.id}/manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ managerId: selectedManager })
            });

            if (res.ok) {
                alert('Manager assigned successfully!');
                setShowAssignModal(false);
                setSelectedJournal(null);
                setSelectedManager('');
                fetchJournals();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error assigning manager:', error);
            alert('Failed to assign manager');
        }
    };

    const handleRemoveManager = async (journalId: string) => {
        if (!confirm('Are you sure you want to remove this manager?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/journals/${journalId}/manager`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('Manager removed successfully!');
                fetchJournals();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing manager:', error);
            alert('Failed to remove manager');
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">📚 Journal Management</h1>
                        <p className="text-secondary-600">Assign and manage journal managers</p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-bold text-secondary-900">{journals.length}</p>
                        <p className="text-sm text-secondary-500">Total Journals</p>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">With Manager</span>
                            <span className="text-3xl">✅</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">
                            {journals.filter(j => j.journalManagerId).length}
                        </p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Without Manager</span>
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">
                            {journals.filter(j => !j.journalManagerId).length}
                        </p>
                    </div>

                    <div className="card-premium p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-secondary-500 text-sm font-bold uppercase">Available Managers</span>
                            <span className="text-3xl">👥</span>
                        </div>
                        <p className="text-4xl font-bold text-secondary-900">{users.length}</p>
                    </div>
                </div>

                {/* Journals List */}
                <div className="card-premium p-6">
                    <h2 className="text-2xl font-bold text-secondary-900 mb-6">All Journals</h2>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {journals.map((journal) => (
                                <div key={journal.id} className="border border-secondary-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-secondary-900 mb-2">
                                                {journal.name}
                                            </h3>
                                            <div className="flex flex-wrap gap-4 text-sm text-secondary-500 mb-4">
                                                {journal.issnPrint && (
                                                    <span>ISSN Print: {journal.issnPrint}</span>
                                                )}
                                                {journal.issnOnline && (
                                                    <span>ISSN Online: {journal.issnOnline}</span>
                                                )}
                                                {journal.domain && (
                                                    <span>Domain: {journal.domain.name}</span>
                                                )}
                                                {journal.publisher && (
                                                    <span>Publisher: {journal.publisher.name}</span>
                                                )}
                                            </div>

                                            {/* Manager Info */}
                                            {journal.journalManager ? (
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-green-900">
                                                                ✅ Manager Assigned
                                                            </p>
                                                            <p className="text-green-700 font-medium">
                                                                {journal.journalManager.name || journal.journalManager.email}
                                                            </p>
                                                            <p className="text-sm text-green-600">
                                                                {journal.journalManager.email} • {journal.journalManager.role}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveManager(journal.id)}
                                                            className="btn btn-secondary text-sm"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold text-amber-900">
                                                                ⚠️ No Manager Assigned
                                                            </p>
                                                            <p className="text-amber-600 text-sm">
                                                                This journal needs a manager
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedJournal(journal);
                                                                setShowAssignModal(true);
                                                            }}
                                                            className="btn btn-primary"
                                                        >
                                                            Assign Manager
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assign Manager Modal */}
                {showAssignModal && selectedJournal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6">
                                <h2 className="text-2xl font-bold text-white">Assign Journal Manager</h2>
                                <p className="text-primary-100">{selectedJournal.name}</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="label">Journal</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={selectedJournal.name}
                                        disabled
                                    />
                                </div>

                                <div>
                                    <label className="label">Select Manager</label>
                                    <select
                                        className="input"
                                        value={selectedManager}
                                        onChange={(e) => setSelectedManager(e.target.value)}
                                    >
                                        <option value="">-- Select a manager --</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                                {user.name || user.email} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-sm text-secondary-500 mt-2">
                                        Only users with JOURNAL_MANAGER, EDITOR_IN_CHIEF, ADMIN, or SUPER_ADMIN roles can be assigned
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-bold text-blue-900 mb-2">ℹ️ Important Notes:</p>
                                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                                        <li>Each journal can have only ONE manager</li>
                                        <li>A manager can manage MULTIPLE journals</li>
                                        <li>The manager will have full control over this journal</li>
                                        <li>They can assign reviewers, manage submissions, and make decisions</li>
                                    </ul>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleAssignManager}
                                        disabled={!selectedManager}
                                        className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Assign Manager
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowAssignModal(false);
                                            setSelectedJournal(null);
                                            setSelectedManager('');
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
