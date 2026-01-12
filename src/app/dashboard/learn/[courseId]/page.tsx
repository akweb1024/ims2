'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ChevronLeft, ChevronRight, CheckCircle, Circle, Lock,
    BookOpen, Clock, Award, Menu, X, FileText, Video
} from 'lucide-react';

export default function CoursePlayerPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<any>(null);
    const [progress, setProgress] = useState<any>(null);
    const [currentLesson, setCurrentLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [videoProgress, setVideoProgress] = useState(0);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchCourseData();
    }, [courseId]);

    const fetchCourseData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch course progress
            const progressRes = await fetch(`/api/progress/courses/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (progressRes.ok) {
                const progressData = await progressRes.json();
                setProgress(progressData);
                setCourse(progressData.course);

                // Find first incomplete lesson or first lesson
                const firstIncomplete = findFirstIncompleteLesson(progressData);
                if (firstIncomplete) {
                    loadLesson(firstIncomplete.id);
                }
            } else {
                // Not enrolled, redirect to course detail
                router.push(`/dashboard/courses/${courseId}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const findFirstIncompleteLesson = (progressData: any) => {
        for (const module of progressData.course?.modules || []) {
            for (const lesson of module.lessons || []) {
                const lessonProgress = progressData.progress.lessonsProgress.find(
                    (p: any) => p.lesson.id === lesson.id
                );
                if (!lessonProgress || !lessonProgress.isCompleted) {
                    return lesson;
                }
            }
        }
        // All complete, return first lesson
        return progressData.course?.modules[0]?.lessons[0];
    };

    const loadLesson = async (lessonId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/lessons/${lessonId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const lesson = await res.json();
                setCurrentLesson(lesson);

                // Load progress for this lesson
                const progressRes = await fetch(`/api/progress/lessons/${lessonId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (progressRes.ok) {
                    const lessonProgress = await progressRes.json();
                    setVideoProgress(lessonProgress.lastPosition || 0);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const markLessonComplete = async () => {
        if (!currentLesson) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/progress/lessons/${currentLesson.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isCompleted: true,
                    lastPosition: 0
                })
            });

            // Refresh progress
            fetchCourseData();
        } catch (error) {
            console.error(error);
        }
    };

    const saveProgress = async (position: number) => {
        if (!currentLesson) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/progress/lessons/${currentLesson.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lastPosition: position,
                    timeSpent: 10 // Increment by 10 seconds
                })
            });
        } catch (error) {
            console.error(error);
        }
    };

    const getNextLesson = () => {
        if (!course || !currentLesson) return null;

        let foundCurrent = false;
        for (const module of course.modules) {
            for (const lesson of module.lessons) {
                if (foundCurrent) return lesson;
                if (lesson.id === currentLesson.id) foundCurrent = true;
            }
        }
        return null;
    };

    const getPreviousLesson = () => {
        if (!course || !currentLesson) return null;

        let previousLesson = null;
        for (const module of course.modules) {
            for (const lesson of module.lessons) {
                if (lesson.id === currentLesson.id) return previousLesson;
                previousLesson = lesson;
            }
        }
        return null;
    };

    const isLessonCompleted = (lessonId: string) => {
        return progress?.progress.lessonsProgress.some(
            (p: any) => p.lesson.id === lessonId && p.isCompleted
        );
    };

    if (loading) return <div className="p-8 text-center">Loading course...</div>;
    if (!course) return <div className="p-8 text-center">Course not found</div>;

    const nextLesson = getNextLesson();
    const previousLesson = getPreviousLesson();

    return (
        <DashboardLayout userRole={userRole}>
            <div className="flex gap-6 h-[calc(100vh-8rem)]">
                {/* Sidebar - Course Content */}
                <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
                    <div className="card-premium p-6 h-full overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="font-bold text-lg text-secondary-900 line-clamp-2">{course.title}</h2>
                                <p className="text-sm text-secondary-500 mt-1">
                                    {Math.round(progress?.progress.percentage || 0)}% Complete
                                </p>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="text-secondary-400 hover:text-secondary-900 lg:hidden"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                                    style={{ width: `${progress?.progress.percentage || 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-secondary-400 mt-2">
                                {progress?.progress.completedLessons || 0} of {progress?.progress.totalLessons || 0} lessons completed
                            </p>
                        </div>

                        {/* Module List */}
                        <div className="space-y-4">
                            {course.modules.map((module: any, moduleIdx: number) => (
                                <div key={module.id} className="space-y-2">
                                    <h3 className="font-bold text-sm text-secondary-900 uppercase tracking-wide">
                                        Module {moduleIdx + 1}: {module.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {module.lessons.map((lesson: any, lessonIdx: number) => {
                                            const completed = isLessonCompleted(lesson.id);
                                            const isCurrent = currentLesson?.id === lesson.id;

                                            return (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => loadLesson(lesson.id)}
                                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${isCurrent
                                                            ? 'bg-primary-50 border-2 border-primary-500'
                                                            : 'bg-white border border-secondary-100 hover:border-primary-200'
                                                        }`}
                                                >
                                                    {completed ? (
                                                        <CheckCircle size={18} className="text-success-600 flex-shrink-0" />
                                                    ) : (
                                                        <Circle size={18} className="text-secondary-300 flex-shrink-0" />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium line-clamp-2 ${isCurrent ? 'text-primary-700' : 'text-secondary-900'
                                                            }`}>
                                                            {lessonIdx + 1}. {lesson.title}
                                                        </p>
                                                        <div className="flex gap-2 text-xs text-secondary-400 mt-1">
                                                            {lesson.type === 'VIDEO' ? (
                                                                <Video size={12} />
                                                            ) : (
                                                                <FileText size={12} />
                                                            )}
                                                            <span>{lesson.type}</span>
                                                            {lesson.duration && <span>• {lesson.duration} min</span>}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col">
                    {/* Toggle Sidebar Button */}
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="btn btn-secondary mb-4 w-fit"
                        >
                            <Menu size={16} /> Show Course Content
                        </button>
                    )}

                    {/* Lesson Content */}
                    <div className="card-premium flex-1 overflow-y-auto">
                        {currentLesson ? (
                            <div className="p-8">
                                <div className="mb-6">
                                    <h1 className="text-3xl font-black text-secondary-900 mb-2">
                                        {currentLesson.title}
                                    </h1>
                                    {currentLesson.description && (
                                        <p className="text-secondary-600">{currentLesson.description}</p>
                                    )}
                                </div>

                                {/* Video Player */}
                                {currentLesson.type === 'VIDEO' && currentLesson.contentUrl && (
                                    <div className="mb-6 rounded-2xl overflow-hidden bg-black">
                                        <video
                                            controls
                                            className="w-full"
                                            src={currentLesson.contentUrl}
                                            onTimeUpdate={(e) => {
                                                const video = e.target as HTMLVideoElement;
                                                if (Math.floor(video.currentTime) % 10 === 0) {
                                                    saveProgress(Math.floor(video.currentTime));
                                                }
                                            }}
                                            onEnded={markLessonComplete}
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                )}

                                {/* Text Content */}
                                {currentLesson.textContent && (
                                    <div className="prose max-w-none mb-6">
                                        <div className="bg-secondary-50 rounded-2xl p-6">
                                            <pre className="whitespace-pre-wrap font-sans text-secondary-900">
                                                {currentLesson.textContent}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Document Link */}
                                {currentLesson.type === 'DOCUMENT' && currentLesson.contentUrl && (
                                    <div className="mb-6">
                                        <a
                                            href={currentLesson.contentUrl}
                                            target="_blank"
                                            className="btn btn-primary"
                                        >
                                            <FileText size={16} /> Open Document
                                        </a>
                                    </div>
                                )}

                                {/* Mark Complete Button */}
                                {!isLessonCompleted(currentLesson.id) && (
                                    <button
                                        onClick={markLessonComplete}
                                        className="btn btn-success w-full"
                                    >
                                        <CheckCircle size={16} /> Mark as Complete
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-secondary-500">
                                Select a lesson to start learning
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="flex justify-between items-center mt-4 p-4 bg-white rounded-2xl border border-secondary-200">
                        <button
                            onClick={() => previousLesson && loadLesson(previousLesson.id)}
                            disabled={!previousLesson}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>

                        <div className="text-center">
                            <p className="text-sm font-bold text-secondary-900">
                                {Math.round(progress?.progress.percentage || 0)}% Complete
                            </p>
                            <p className="text-xs text-secondary-500">
                                {progress?.progress.completedLessons || 0} / {progress?.progress.totalLessons || 0} lessons
                            </p>
                        </div>

                        <button
                            onClick={() => nextLesson && loadLesson(nextLesson.id)}
                            disabled={!nextLesson}
                            className="btn btn-primary disabled:opacity-50"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
