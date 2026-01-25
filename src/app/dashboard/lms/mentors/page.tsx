
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Search, User, Mail, Award, BookOpen, Briefcase } from 'lucide-react';

export default function MentorsPage() {
    const [mentors, setMentors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMentors();
    }, []);

    const fetchMentors = async () => {
        try {
            // Reusing existing user API with role filter or strict search
            // Ideally we should have a dedicated /api/lms/mentors endpoint
            // For now, let's fetch users and filter client-side or use existing user search
            const res = await fetch('/api/users?role=all'); // Assuming this exists or works
            if (res.ok) {
                const responseData = await res.json();
                setMentors(responseData.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMentors = mentors.filter(m =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Mentors</h1>
                        <p className="text-secondary-500">View and manage LMS mentors</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-3 text-secondary-400" size={20} />
                    <input
                        className="input pl-10"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMentors.slice(0, 50).map(mentor => (
                        <div key={mentor.id} className="card-dashboard p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-600 text-xl">
                                {mentor.name?.[0] || mentor.email[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-secondary-900">{mentor.name || 'Unnamed'}</h3>
                                <div className="flex items-center gap-2 text-sm text-secondary-500 mb-2">
                                    <Mail size={14} />
                                    <span>{mentor.email}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="badge bg-secondary-100 text-secondary-600 text-xs">
                                        ID: {mentor.id}
                                    </span>
                                    <span className="badge bg-primary-50 text-primary-600 text-xs uppercase">
                                        {mentor.role}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
