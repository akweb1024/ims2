'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTeam } from '@/hooks/useHR';
import { Search, Grid, List, Mail, Phone, Calendar, Award } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

const TeamMembersView: React.FC = () => {
    const { data: team = [], isLoading: loading } = useTeam();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');

    const filteredTeam = useMemo(() => {
        return team.filter(member =>
            member.name?.toLowerCase().includes(search.toLowerCase()) ||
            member.email?.toLowerCase().includes(search.toLowerCase()) ||
            member.designation?.toLowerCase().includes(search.toLowerCase())
        );
    }, [team, search]);

    if (loading) {
        return <div className="p-20 text-center text-secondary-400 font-bold animate-pulse">Syncing team directory...</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Our Team</h2>
                    <p className="text-secondary-500 font-medium">Managing {filteredTeam.length} active team members</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-secondary-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find someone..."
                            className="input pl-10 h-10 w-64 border-none bg-transparent focus:ring-0 text-sm font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-6 w-px bg-secondary-100 mx-1"></div>
                    <div className="flex gap-1 p-1 bg-secondary-50 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-primary-600' : 'text-secondary-400'}`}
                        >
                            <Grid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-primary-600' : 'text-secondary-400'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTeam.map((member) => (
                        <div key={member.id} className="card-premium group hover:border-primary-300 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-100/20 bg-white p-8 overflow-hidden relative">
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between mb-8">
                                <div className="w-16 h-16 rounded-3xl bg-secondary-900 text-white flex items-center justify-center text-2xl font-black shadow-xl group-hover:scale-110 transition-transform duration-500 ring-4 ring-secondary-50">
                                    {member.name?.[0]?.toUpperCase() || member.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${member.role === 'MANAGER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                        member.role === 'SUPER_ADMIN' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                                            'bg-secondary-50 text-secondary-600 border border-secondary-100'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${member.isActive ? 'bg-success-500' : 'bg-secondary-300'}`}></div>
                                        {member.role.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 mb-8">
                                <Link href={`/dashboard/hr-management/employees/${member.id}`} className="hover:underline">
                                    <h3 className="text-xl font-black text-secondary-900 leading-none">{member.name || (member.email ? member.email.split('@')[0] : 'User')}</h3>
                                </Link>
                                <p className="text-sm font-bold text-primary-600/80">{member.designation || 'Specialist'}</p>
                            </div>

                            <div className="space-y-3 py-6 border-y border-secondary-50 mb-8">
                                <div className="flex items-center gap-3 text-secondary-500 group-hover:text-secondary-900 transition-colors">
                                    <Mail size={14} className="text-secondary-400" />
                                    <span className="text-xs font-bold truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-secondary-500 group-hover:text-secondary-900 transition-colors">
                                    <Calendar size={14} className="text-secondary-400" />
                                    <span className="text-xs font-medium">Joined: <FormattedDate date={member.createdAt} /></span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-secondary-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-secondary-400" title="Performance">
                                        {member._count?.tasks || 0}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary-400" title="Assigned">
                                        {member._count?.assignedSubscriptions || 0}
                                    </div>
                                </div>

                                <Link
                                    href={`/dashboard/hr-management/employees/${member.id}`}
                                    className="btn btn-secondary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all"
                                >
                                    View Stats
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card-premium overflow-hidden border border-secondary-100 bg-white">
                    <table className="table w-full">
                        <thead className="bg-secondary-50/50">
                            <tr className="text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em] border-b border-secondary-100">
                                <th className="px-8 py-6 text-left">Member</th>
                                <th className="px-8 py-6 text-left">Role & Status</th>
                                <th className="px-8 py-6 text-center">Workload</th>
                                <th className="px-8 py-6 text-right">Activity</th>
                                <th className="px-8 py-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {filteredTeam.map(member => (
                                <tr key={member.id} className="hover:bg-secondary-50/30 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-secondary-900 text-white flex items-center justify-center font-black">
                                                {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <Link href={`/dashboard/hr-management/employees/${member.id}`} className="hover:underline">
                                                    <p className="font-bold text-secondary-900">{member.name || (member.email ? member.email.split('@')[0] : 'User')}</p>
                                                </Link>
                                                <p className="text-[10px] text-secondary-400 font-medium">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-black text-secondary-700">{member.role.replace('_', ' ')}</span>
                                            <span className={`text-[10px] font-bold ${member.isActive ? 'text-emerald-500' : 'text-secondary-300'}`}>
                                                {member.isActive ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex justify-center gap-4">
                                            <div className="text-center">
                                                <p className="text-sm font-black text-secondary-900">{member._count?.tasks || 0}</p>
                                                <p className="text-[9px] uppercase font-bold text-secondary-400 tracking-wider">Tasks</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-black text-primary-600">{member._count?.assignedSubscriptions || 0}</p>
                                                <p className="text-[9px] uppercase font-bold text-secondary-400 tracking-wider">Clients</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <p className="text-xs font-bold text-secondary-900 italic">
                                            <FormattedDate date={member.lastLogin || member.createdAt} />
                                        </p>
                                        <p className="text-[10px] uppercase font-black text-secondary-400 tracking-wider mt-0.5">Last Pulse</p>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2 hover:bg-white border border-transparent hover:border-secondary-200 rounded-xl text-secondary-400 hover:text-secondary-900 transition-all">
                                            <Award size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TeamMembersView;
