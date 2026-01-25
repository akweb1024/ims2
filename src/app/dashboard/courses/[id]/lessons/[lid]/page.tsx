'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function LessonPlayerPage() {
    const { id: courseId, lid: lessonId } = useParams();
    const router = useRouter();
    const [lesson, setLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');

    const fetchLesson = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/lessons/${lessonId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setLesson(await res.json());
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [lessonId]);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchLesson();
    }, [fetchLesson]);

    const handleComplete = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/lessons/${lessonId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchLesson();
                // Find next lesson
                const allLessons = lesson.module.course.modules.flatMap((m: any) => m.lessons);
                const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
                if (currentIndex < allLessons.length - 1) {
                    const nextLesson = allLessons[currentIndex + 1];
                    router.push(`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`);
                }
            }
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="p-8 text-center">Loading lesson...</div>;
    if (!lesson) return <div className="p-8 text-center text-danger-500">Lesson not found or access denied.</div>;

    const course = lesson.module.course;
    const isCompleted = lesson.progress?.[0]?.isCompleted;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)]">
                {/* Main Content Area */}
                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                    <div className="flex items-center gap-4 text-xs font-bold text-secondary-400 uppercase tracking-widest">
                        <Link href={`/dashboard/courses/${courseId}`} className="hover:text-primary-600 transition-colors">Courses</Link>
                        <span>/</span>
                        <span className="text-secondary-900">{course.title}</span>
                    </div>

                    <h1 className="text-3xl font-black text-secondary-900">{lesson.title}</h1>

                    <div className="bg-white rounded-3xl border border-secondary-200 overflow-hidden shadow-premium">
                        {lesson.type === 'VIDEO' && lesson.videoUrl ? (
                            <div className="aspect-video bg-black flex items-center justify-center">
                                <p className="text-white opacity-50 italic">Video Player Placeholder: {lesson.videoUrl}</p>
                            </div>
                        ) : (
                            <div className="p-10 prose prose-secondary max-w-none min-h-[400px]">
                                {lesson.content ? (
                                    <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                                ) : (
                                    <div className="text-secondary-400 italic">No content available for this lesson.</div>
                                )}
                            </div>
                        )}

                        <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-between items-center">
                            <button
                                onClick={() => router.back()}
                                className="text-sm font-bold text-secondary-500 hover:text-secondary-900 flex items-center gap-2"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={handleComplete}
                                className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} px-8 flex items-center gap-2`}
                            >
                                {isCompleted ? '✓ Completed' : 'Mark as Done & Continue →'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <div className="w-full lg:w-80 bg-white rounded-3xl border border-secondary-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-secondary-100 bg-secondary-50">
                        <h3 className="font-bold text-secondary-900 uppercase tracking-widest text-xs">Course Content</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-secondary-100">
                        {course.modules.map((m: any) => (
                            <div key={m.id} className="p-2">
                                <div className="p-3 text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em]">{m.title}</div>
                                <div className="space-y-1">
                                    {m.lessons.map((l: any) => (
                                        <Link
                                            key={l.id}
                                            href={`/dashboard/courses/${courseId}/lessons/${l.id}`}
                                            className={`block p-3 rounded-xl text-sm font-medium transition-all ${l.id === lessonId ? 'bg-primary-50 text-primary-700 shadow-sm border border-primary-100' : 'text-secondary-600 hover:bg-secondary-50'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="truncate">{l.title}</span>
                                                {/* In a real app we'd fetch progress for all lessons, for now we simplified */}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
