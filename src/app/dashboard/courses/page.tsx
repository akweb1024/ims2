'use client';

export default function CoursesPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-secondary-900">Learning Management System</h1>
            <div className="card-premium p-10 text-center">
                <div className="text-6xl mb-4">🎓</div>
                <h2 className="text-xl font-bold text-secondary-900">Courses & Certification</h2>
                <p className="text-secondary-500 mt-2">Manage courses, student enrollments, and progress tracking.</p>
                <div className="mt-8 flex justify-center gap-4">
                    <button className="btn btn-primary">Create Course</button>
                    <button className="btn btn-secondary">My Learning</button>
                </div>
            </div>
        </div>
    );
}
