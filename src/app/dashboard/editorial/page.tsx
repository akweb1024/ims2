'use client';

export default function EditorialPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-secondary-900">Editorial Workflow</h1>
            <div className="card-premium p-10 text-center">
                <div className="text-6xl mb-4">✍️</div>
                <h2 className="text-xl font-bold text-secondary-900">Journal Management System</h2>
                <p className="text-secondary-500 mt-2">Manage article submissions, peer reviews, and issue publication.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <button className="btn btn-primary">Submit Article</button>
                    <button className="btn btn-secondary">Review Queue</button>
                </div>
            </div>
        </div>
    );
}
