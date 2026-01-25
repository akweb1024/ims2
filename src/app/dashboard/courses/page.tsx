'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function CoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/courses?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCourses(await res.json());
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
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const newCourse = await res.json();
                setIsCreating(false);
                fetchCourses();
            } else {
                alert('Failed to create course');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const canCreate = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

    if (loading) return <div className="p-8 text-center text-secondary-500">Loading courses...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Learning Management System</h1>
                        <p className="text-secondary-500">Browse and manage your courses</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <span>+</span> New Course
                        </button>
                    )}
                </div>

                {/* Create Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                            <h3 className="text-xl font-bold mb-4">Create New Course</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="label">Course Title</label>
                                    <input name="title" className="input" required placeholder="e.g. Advanced Publishing Ethics" />
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea name="description" className="input h-24" required placeholder="Short summary..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Price</label>
                                        <input name="price" type="number" step="0.01" className="input" defaultValue="0" />
                                    </div>
                                    <div>
                                        <label className="label">Currency</label>
                                        <select name="currency" className="input">
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Thumbnail URL</label>
                                    <input name="thumbnailUrl" className="input" placeholder="https://..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Mentor (User ID)</label>
                                        <input name="mentorId" className="input" placeholder="User ID" />
                                    </div>
                                    <div>
                                        <label className="label">Mentor Reward</label>
                                        <input name="mentorReward" type="number" className="input" defaultValue="0" />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">Create Draft</button>
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <Link href={`/dashboard/courses/${course.id}`} key={course.id} className="card-premium group hover:border-primary-200 transition-all">
                            <div className="h-40 bg-secondary-100 rounded-t-2xl relative overflow-hidden">
                                {course.thumbnailUrl ? (
                                    <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🎓</div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${course.isPublished ? 'bg-success-100 text-success-700' : 'bg-secondary-200 text-secondary-600'}`}>
                                        {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-lg text-secondary-900 line-clamp-1 mb-2 group-hover:text-primary-600 transition-colors">
                                    {course.title}
                                </h3>
                                <p className="text-sm text-secondary-500 line-clamp-2 mb-4 h-10">
                                    {course.description}
                                </p>

                                <div className="flex justify-between items-center text-xs font-medium text-secondary-400 border-t border-secondary-50 pt-4">
                                    <div className="flex gap-4">
                                        <span>📚 {course._count?.modules || 0} Modules</span>
                                        <span>👥 {course._count?.enrollments || 0} Students</span>
                                    </div>
                                    <span className="text-secondary-900 font-bold">
                                        {course.price === 0 ? 'Free' : `${course.currency} ${course.price}`}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {courses.length === 0 && !loading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-secondary-200">
                        <div className="text-6xl mb-4 opacity-30">📚</div>
                        <h3 className="text-xl font-bold text-secondary-900">No Courses Yet</h3>
                        <p className="text-secondary-500">Get started by creating your first course.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
