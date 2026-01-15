'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { BookOpen, Award, Clock, TrendingUp, Play, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function MyLearningPage() {
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'certificates'>('active');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchMyLearning();
    }, []);

    const fetchMyLearning = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/my-learning', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const learningData = await res.json();
                setData(learningData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (loading) return <div className="p-8 text-center">Loading your learning journey...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">My Learning</h1>
                    <p className="text-secondary-500">Track your progress and continue learning</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-t-4 border-primary-500">
                        <div className="flex items-center justify-between mb-2">
                            <BookOpen className="text-primary-600" size={24} />
                            <span className="text-3xl font-black text-secondary-900">
                                {data?.statistics.activeCourses || 0}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-secondary-500">Active Courses</p>
                    </div>

                    <div className="card-premium p-6 border-t-4 border-success-500">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="text-success-600" size={24} />
                            <span className="text-3xl font-black text-secondary-900">
                                {data?.statistics.completedCourses || 0}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-secondary-500">Completed</p>
                    </div>

                    <div className="card-premium p-6 border-t-4 border-warning-500">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="text-warning-600" size={24} />
                            <span className="text-3xl font-black text-secondary-900">
                                {formatTime(data?.statistics.totalTimeSpent || 0)}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-secondary-500">Time Spent</p>
                    </div>

                    <div className="card-premium p-6 border-t-4 border-purple-500">
                        <div className="flex items-center justify-between mb-2">
                            <Award className="text-purple-600" size={24} />
                            <span className="text-3xl font-black text-secondary-900">
                                {data?.statistics.certificatesEarned || 0}
                            </span>
                        </div>
                        <p className="text-sm font-bold text-secondary-500">Certificates</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-secondary-200">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'active'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        Active Courses ({data?.enrollments.active.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'completed'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        Completed ({data?.enrollments.completed.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('certificates')}
                        className={`px-6 py-3 font-bold transition-colors ${activeTab === 'certificates'
                            ? 'text-primary-600 border-b-2 border-primary-600'
                            : 'text-secondary-500 hover:text-secondary-900'
                            }`}
                    >
                        Certificates ({data?.certificates.length || 0})
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'active' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.enrollments.active.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-secondary-200">
                                <BookOpen size={64} className="mx-auto text-secondary-300 mb-4" />
                                <h3 className="text-xl font-bold text-secondary-900 mb-2">No Active Courses</h3>
                                <p className="text-secondary-500 mb-6">Browse available courses and start learning!</p>
                                <Link href="/dashboard/courses" className="btn btn-primary">
                                    Browse Courses
                                </Link>
                            </div>
                        ) : (
                            data?.enrollments.active.map((enrollment: any) => (
                                <Link
                                    key={enrollment.id}
                                    href={`/dashboard/learn/${enrollment.course.id}`}
                                    className="card-premium group hover:border-primary-200 transition-all"
                                >
                                    <div className="h-40 bg-secondary-100 rounded-t-2xl relative overflow-hidden">
                                        {enrollment.course.thumbnailUrl ? (
                                            <Image
                                                src={enrollment.course.thumbnailUrl}
                                                alt={enrollment.course.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                                                🎓
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                                <Play size={24} className="text-primary-600 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-bold text-lg text-secondary-900 line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                                            {enrollment.course.title}
                                        </h3>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-xs font-bold text-secondary-500 mb-1">
                                                <span>Progress</span>
                                                <span>{Math.round(enrollment.progress)}%</span>
                                            </div>
                                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                                                    style={{ width: `${enrollment.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs text-secondary-400">
                                            <span>
                                                {enrollment.lastAccessedAt
                                                    ? `Last accessed ${new Date(enrollment.lastAccessedAt).toLocaleDateString()}`
                                                    : 'Not started yet'}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'completed' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.enrollments.completed.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-secondary-200">
                                <CheckCircle size={64} className="mx-auto text-secondary-300 mb-4" />
                                <h3 className="text-xl font-bold text-secondary-900 mb-2">No Completed Courses Yet</h3>
                                <p className="text-secondary-500">Complete your first course to see it here!</p>
                            </div>
                        ) : (
                            data?.enrollments.completed.map((enrollment: any) => (
                                <div key={enrollment.id} className="card-premium">
                                    <div className="h-40 bg-secondary-100 rounded-t-2xl relative overflow-hidden">
                                        {enrollment.course.thumbnailUrl ? (
                                            <Image
                                                src={enrollment.course.thumbnailUrl}
                                                alt={enrollment.course.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
                                                🎓
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-700">
                                                COMPLETED
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="font-bold text-lg text-secondary-900 line-clamp-2 mb-4">
                                            {enrollment.course.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-secondary-500">
                                            <CheckCircle size={16} className="text-success-600" />
                                            <span>Completed on {new Date(enrollment.completedAt).toLocaleDateString()}</span>
                                        </div>
                                        {enrollment.certificateUrl && (
                                            <a
                                                href={enrollment.certificateUrl}
                                                target="_blank"
                                                className="btn btn-sm btn-primary w-full mt-4"
                                            >
                                                <Award size={14} /> View Certificate
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'certificates' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.certificates.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-secondary-200">
                                <Award size={64} className="mx-auto text-secondary-300 mb-4" />
                                <h3 className="text-xl font-bold text-secondary-900 mb-2">No Certificates Yet</h3>
                                <p className="text-secondary-500">Complete courses to earn certificates!</p>
                            </div>
                        ) : (
                            data?.certificates.map((cert: any) => (
                                <div key={cert.id} className="card-premium p-6 border-t-4 border-warning-500">
                                    <Award size={48} className="text-warning-600 mb-4" />
                                    <h3 className="font-bold text-lg text-secondary-900 mb-2">
                                        {cert.enrollment.course.title}
                                    </h3>
                                    <p className="text-sm text-secondary-500 mb-4">
                                        Issued on {new Date(cert.issuedAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-xs text-secondary-400 mb-4">
                                        Verification Code: <span className="font-mono font-bold">{cert.verificationCode}</span>
                                    </p>
                                    {cert.certificateUrl && (
                                        <a
                                            href={cert.certificateUrl}
                                            target="_blank"
                                            className="btn btn-sm btn-primary w-full"
                                        >
                                            Download Certificate
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
