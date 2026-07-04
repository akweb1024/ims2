'use client';

import { useState, useEffect } from 'react';

export default function EventsPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setEvents(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsCreating(false);
                fetchEvents();
            } else {
                alert('Failed to create event');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const canCreate = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    if (loading) return <div className="p-8 text-center text-secondary-500">Loading events...</div>;

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Conference Management</h1>
                        <p className="text-secondary-500">Upcoming events and exhibitions</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <span>+</span> New Event
                        </button>
                    )}
                </div>

                {/* Create Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl">
                            <h3 className="text-2xl font-bold mb-6">Create New Event</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="label">Event Title</label>
                                    <input name="title" className="input" required placeholder="e.g. Annual Tech Symposium" />
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea name="description" className="input h-24" required placeholder="Short summary..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Start Date</label>
                                        <input name="startDate" type="date" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">End Date</label>
                                        <input name="endDate" type="date" className="input" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Venue</label>
                                    <input name="venue" className="input" placeholder="e.g. Virtual, or City Convention Center" />
                                </div>
                                <div>
                                    <label className="label">Organizer</label>
                                    <input name="organizer" className="input" placeholder="e.g. STM Events Team" />
                                </div>
                                <div className="flex gap-2 pt-6">
                                    <button type="submit" className="btn btn-primary flex-1">Create Event</button>
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Event List - Timeline View */}
                <div className="space-y-4">
                    {events.map(event => (
                        <div key={event.id} className="card-premium p-6 flex flex-col md:flex-row gap-6 hover:shadow-premium-lg transition-all group">
                            <div className="w-full md:w-48 bg-secondary-100 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                                <span className="text-4xl animate-bounce-subtle">📅</span>
                                <span className="font-bold text-secondary-900 mt-2">
                                    {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mt-1">{new Date(event.startDate).getFullYear()}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors">
                                        {event.title}
                                    </h3>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${new Date(event.endDate) < new Date() ? 'bg-secondary-200 text-secondary-500' : 'bg-success-100 text-success-700'}`}>
                                        {new Date(event.endDate) < new Date() ? 'Past' : 'Upcoming'}
                                    </span>
                                </div>
                                <p className="text-sm text-secondary-500 mb-4 line-clamp-2">{event.description}</p>
                                <div className="flex flex-wrap gap-4 text-xs font-bold text-secondary-400 uppercase tracking-widest">
                                    <span>📍 {event.venue || 'Virtual'}</span>
                                    <span>👤 Org: {event.organizer}</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-secondary-50 flex gap-6 text-[10px] font-black text-secondary-600 uppercase tracking-[0.1em]">
                                    <span className="flex items-center gap-1.5"><span className="text-base">🎟️</span> {event._count?.registrations || 0} Registered</span>
                                    <span className="flex items-center gap-1.5"><span className="text-base">📄</span> {event._count?.papers || 0} Submissions</span>
                                </div>
                            </div>
                            <div className="flex flex-col justify-center gap-2 min-w-[140px]">
                                <button className="btn btn-secondary text-xs uppercase font-black">View Details</button>
                                <button className="btn btn-primary text-xs uppercase font-black">Register / Manage</button>
                            </div>
                        </div>
                    ))}
                </div>

                {events.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-secondary-200">
                        <div className="text-6xl mb-4 opacity-30 animate-pulse">🎤</div>
                        <h3 className="text-xl font-bold text-secondary-900">No Events Scheduled</h3>
                        <p className="text-secondary-500 mt-2">Create an event to start accepting registrations.</p>
                    </div>
                )}
            </div>
        </>
    );
}
