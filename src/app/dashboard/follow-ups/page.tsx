'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';

export default function FollowUpsPage() {
    const [data, setData] = useState<{ missed: any[], today: any[], upcoming: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('SALES_EXECUTIVE');

    const [editingItem, setEditingItem] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/dashboard/follow-ups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);

        const oldLogPayload = {
            outcome: formData.get('oldOutcome'),
            nextFollowUpDate: null // Clear date to mark as "Done"
        };

        const newLogPayload = {
            customerId: editingItem.customerProfile.id,
            type: 'CALL', // Default or derived
            channel: formData.get('newChannel'),
            subject: formData.get('newSubject'),
            notes: formData.get('newNotes'),
            nextFollowUpDate: formData.get('newNextDate') || null
        };

        try {
            const token = localStorage.getItem('token');

            // 1. Update Old Log (Mark as Done)
            const resUpdate = await fetch(`/api/communications/${editingItem.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(oldLogPayload)
            });

            if (!resUpdate.ok) throw new Error('Failed to close old task');

            // 2. Create New Log
            const resCreate = await fetch('/api/communications', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newLogPayload)
            });

            if (!resCreate.ok) throw new Error('Failed to create new log');

            setEditingItem(null);
            fetchData(); // Refresh list

        } catch (error) {
            console.error('Activity Log error:', error);
            alert('Error logging activity');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) return null;

    const FollowUpCard = ({ item, isMissed = false }: { item: any, isMissed?: boolean }) => (
        <div className={`card-premium p-4 border-l-4 ${isMissed ? 'border-danger-500' : 'border-primary-500'} hover:shadow-md transition-all`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-secondary-900 line-clamp-1">{item.subject}</h4>
                <Link href={`/dashboard/customers/${item.customerProfile.id}?tab=communication`} className="text-xs text-primary-600 hover:underline">
                    View →
                </Link>
            </div>
            <p className="text-sm text-secondary-600 mb-2 line-clamp-2">{item.notes}</p>

            <div className="flex items-center justify-between mt-3 text-xs">
                <div className="flex items-center text-secondary-500">
                    <span className="font-bold mr-1">{item.customerProfile.name}</span>
                    <span className="hidden sm:inline">({item.customerProfile.organizationName || 'N/A'})</span>
                </div>
                <div className={`font-bold ${isMissed ? 'text-danger-600' : 'text-primary-600'}`}>
                    Due: <FormattedDate date={item.nextFollowUpDate} />
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-secondary-100 flex justify-between items-center bg-secondary-50 -mx-4 -mb-4 px-4 py-2">
                <div className="flex space-x-2">
                    <span className="badge badge-secondary text-[10px] uppercase">{item.channel}</span>
                </div>
                <button
                    onClick={() => setEditingItem(item)}
                    className="btn btn-primary py-1 px-3 text-xs"
                >
                    Log Activity
                </button>
            </div>
        </div>
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Follow-up Tasks</h1>
                        <p className="text-secondary-500">Manage your scheduled customer interactions</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">{data.today.length}</div>
                        <div className="text-xs text-secondary-500 uppercase font-bold">Due Today</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Missed */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-danger-50 p-3 rounded-lg border border-danger-100">
                            <h3 className="font-bold text-danger-900 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Overdue ({data.missed.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {data.missed.map(item => <FollowUpCard key={item.id} item={item} isMissed={true} />)}
                            {data.missed.length === 0 && <p className="text-center text-secondary-400 text-sm py-8">No overdue tasks 🎉</p>}
                        </div>
                    </div>

                    {/* Today */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-primary-50 p-3 rounded-lg border border-primary-100">
                            <h3 className="font-bold text-primary-900 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Due Today ({data.today.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {data.today.map(item => <FollowUpCard key={item.id} item={item} />)}
                            {data.today.length === 0 && <p className="text-center text-secondary-400 text-sm py-8">No tasks for today 😴</p>}
                        </div>
                    </div>

                    {/* Upcoming */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-secondary-50 p-3 rounded-lg border border-secondary-100">
                            <h3 className="font-bold text-secondary-900 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                Upcoming ({data.upcoming.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {data.upcoming.map(item => <FollowUpCard key={item.id} item={item} />)}
                            {data.upcoming.length === 0 && <p className="text-center text-secondary-400 text-sm py-8">No upcoming tasks</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Log Activity Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold text-secondary-900 mb-2">Log Follow-up Activity</h3>
                        <p className="text-sm text-secondary-500 mb-6">Record your interaction and schedule the next step.</p>

                        <form onSubmit={handleLogActivity} className="space-y-6">
                            {/* Previous Task Section */}
                            <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100">
                                <h4 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-3">Closing Previous Task</h4>
                                <div className="mb-2">
                                    <p className="text-sm font-bold text-secondary-900">{editingItem.subject}</p>
                                    <p className="text-xs text-secondary-500 italic">&quot;{editingItem.notes}&quot;</p>
                                </div>
                                <div>
                                    <label className="label">Outcome of this task</label>
                                    <select name="oldOutcome" className="input" required>
                                        <option value="">Select Outcome...</option>
                                        <option value="Completed">Task Completed</option>
                                        <option value="No Answer">No Answer / Left Message</option>
                                        <option value="Rescheduled">Rescheduled</option>
                                        <option value="Client Not Interested">Client Not Interested</option>
                                        <option value="Sale Closed">Sale Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* New Interaction Section */}
                            <div>
                                <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-3 border-b border-primary-100 pb-1">New Interaction Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Subject</label>
                                        <input
                                            name="newSubject"
                                            className="input"
                                            defaultValue={`Follow-up: ${editingItem.subject}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Channel</label>
                                        <select name="newChannel" className="input">
                                            <option value="Phone">Phone</option>
                                            <option value="Email">Email</option>
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="Meeting">Meeting</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Next Follow-up (Optional)</label>
                                        <input type="date" name="newNextDate" className="input" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Notes / Discussion Points</label>
                                        <textarea name="newNotes" className="input h-24" placeholder="What happened during this interaction?" required></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="btn btn-primary px-8"
                                >
                                    {actionLoading ? 'Logging...' : 'Save & Continue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
