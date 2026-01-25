
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { BarChart, Users, Mail, DollarSign, BookOpen, Briefcase, Video } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function LMSDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [mentors, setMentors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/lms/analytics');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setMentors(data.mentors);
            }
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8">Loading LMS Dashboard...</div>;

    const chartData = [
        { name: 'Jan', Courses: 12000, Workshops: 5000 },
        { name: 'Feb', Courses: 19000, Workshops: 10000 },
        { name: 'Mar', Courses: 3000, Workshops: 15000 },
        { name: 'Apr', Courses: 5000, Workshops: 10000 },
        { name: 'May', Courses: 2000, Workshops: 20000 },
        { name: 'Jun', Courses: 3000, Workshops: 25000 },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">LMS Overview</h1>
                        <p className="text-secondary-500">Manage Courses, Workshops, and Internships</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/dashboard/courses" className="btn btn-secondary flex gap-2">
                            <BookOpen size={18} /> Courses
                        </Link>
                        <Link href="/dashboard/lms/workshops" className="btn btn-secondary flex gap-2">
                            <Video size={18} /> Workshops
                        </Link>
                        <Link href="/dashboard/lms/internships" className="btn btn-secondary flex gap-2">
                            <Briefcase size={18} /> Internships
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-dashboard p-6 bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white/80 text-sm font-medium">Total Revenue</p>
                                <h3 className="text-3xl font-bold mt-1">₹{(stats?.total?.revenue || 0).toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg">
                                <DollarSign size={24} className="text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="card-dashboard p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-medium">Active Students</p>
                                <h3 className="text-3xl font-bold text-secondary-900 mt-1">1,245</h3>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users size={24} className="text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="card-dashboard p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-medium">Emails Sent</p>
                                <h3 className="text-3xl font-bold text-secondary-900 mt-1">{stats?.total?.emailCount || 0}</h3>
                            </div>
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Mail size={24} className="text-orange-600" />
                            </div>
                        </div>
                    </div>

                    <div className="card-dashboard p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-medium">Mentor Payouts</p>
                                <h3 className="text-3xl font-bold text-secondary-900 mt-1">₹{(stats?.total?.mentorPayouts || 0).toLocaleString()}</h3>
                            </div>
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign size={24} className="text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts & Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 card-dashboard p-6">
                        <h3 className="font-bold text-lg mb-4">Revenue Trends</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Courses" stroke="#8b5cf6" />
                                    <Line type="monotone" dataKey="Workshops" stroke="#ec4899" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card-dashboard p-6">
                        <h3 className="font-bold text-lg mb-4">Top Mentors</h3>
                        <div className="space-y-4">
                            {mentors.map((mentor, i) => (
                                <div key={mentor.id} className="flex items-center gap-4 p-3 hover:bg-secondary-50 rounded-xl transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-secondary-900">{mentor.name}</h4>
                                        <p className="text-xs text-secondary-500">
                                            {mentor._count.mentoredCourses} Courses, {mentor._count.mentoredWorkshops} Workshops
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {mentors.length === 0 && <p className="text-secondary-500">No data available</p>}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
