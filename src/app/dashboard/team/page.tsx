'use client';

import { useState, useEffect } from 'react';
import FormattedDate from '@/components/common/FormattedDate';
import { useTeam } from '@/hooks/useHR';

export default function TeamPage() {
    const { data: team = [], isLoading: loading } = useTeam();
    const [userRole, setUserRole] = useState('CUSTOMER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
    }, []);

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Our Team</h1>
                    <p className="text-secondary-600">Overview of staff performance and current workload</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="card-premium h-48 animate-pulse bg-secondary-50"></div>
                        ))
                    ) : team.map(member => (
                        <div key={member.id} className="card-premium relative group hover:border-primary-300 transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-secondary-900 text-white flex items-center justify-center text-xl font-black">
                                    {member.email.charAt(0).toUpperCase()}
                                </div>
                                <span className={`badge ${member.role === 'SUPER_ADMIN' ? 'badge-primary' :
                                    member.role === 'MANAGER' ? 'badge-success' : 'badge-secondary'
                                    }`}>
                                    {member.role.replace('_', ' ')}
                                </span>
                            </div>

                            <h3 className="font-bold text-secondary-900 truncate">{member.email}</h3>
                            <p className="text-xs text-secondary-400 mb-6 flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${member.isActive ? 'bg-success-500' : 'bg-secondary-300'}`}></span>
                                Last active: <span className="ml-1 italic"><FormattedDate date={member.lastLogin || member.createdAt} /></span>
                            </p>

                            <div className="grid grid-cols-2 gap-4 border-t border-secondary-100 pt-6 mt-auto">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-secondary-900">{member._count.assignedSubscriptions}</p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-400 tracking-widest leading-tight">Accounts<br />Managed</p>
                                </div>
                                <div className="text-center border-l border-secondary-100">
                                    <p className="text-2xl font-black text-warning-600">{member._count.tasks}</p>
                                    <p className="text-[10px] uppercase font-bold text-secondary-400 tracking-widest leading-tight">Pending<br />Tasks</p>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-1 px-3 bg-secondary-50 text-[10px] font-black uppercase text-secondary-600 rounded-lg border border-secondary-200 hover:bg-white tracking-widest">
                                    Performance
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
