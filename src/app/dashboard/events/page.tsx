'use client';

export default function EventsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-secondary-900">Conference Management</h1>
            <div className="card-premium p-10 text-center">
                <div className="text-6xl mb-4">🎤</div>
                <h2 className="text-xl font-bold text-secondary-900">Events & Conferences</h2>
                <p className="text-secondary-500 mt-2">Manage conference tickets, registrations, and paper submissions.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <button className="btn btn-primary">Create Event</button>
                    <button className="btn btn-secondary">View Registrations</button>
                </div>
            </div>
        </div>
    );
}
