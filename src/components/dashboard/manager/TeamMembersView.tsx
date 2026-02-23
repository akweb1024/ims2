'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTeam, useUpdateEmployee } from '@/hooks/useHR';
import { Search, Grid, List, Mail, Calendar, Edit2, X, Check } from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';
import Employee360Modal from '@/components/dashboard/Employee360Modal';

const TeamMembersView: React.FC = () => {
    const { data: team = [], isLoading: loading, refetch } = useTeam();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [editingBalance, setEditingBalance] = useState<string | null>(null);
    const [newAdjustment, setNewAdjustment] = useState<number>(0);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);

    const { mutate: updateEmployee } = useUpdateEmployee();

    const filteredTeam = useMemo(() => {
        return team.filter(member =>
            member.name?.toLowerCase().includes(search.toLowerCase()) ||
            member.email?.toLowerCase().includes(search.toLowerCase()) ||
            member.designation?.toLowerCase().includes(search.toLowerCase())
        );
    }, [team, search]);

    const calculateBalance = (member: any) => {
        const profile = member.employeeProfile;
        if (!profile) return 0;

        const initial = profile.initialLeaveBalance || 0;
        const adjustment = profile.manualLeaveAdjustment || 0;

        // Accrual Logic (Simplified 1.5 per month from Jan)
        // const currentMonth = new Date().getMonth() + 1;
        // const accrued = currentMonth * 1.5;

        // Smart Accrual (Checking Joining Date)
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        let accrued = 0;
        if (profile.dateOfJoining) {
            const joinDate = new Date(profile.dateOfJoining);
            if (joinDate.getFullYear() === currentYear) {
                accrued = Math.max(0, (currentMonth - joinDate.getMonth())) * 1.5;
            } else if (joinDate.getFullYear() < currentYear) {
                accrued = currentMonth * 1.5;
            }
        } else {
            accrued = currentMonth * 1.5;
        }

        // Taken
        const taken = profile.leaveRequests?.reduce((acc: number, req: any) => {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
            return acc + diff;
        }, 0) || 0;

        return (initial + accrued - taken + adjustment).toFixed(1);
    };

    const handleUpdateBalance = async (memberId: string, profileId: string) => {
        if (!profileId) return;
        updateEmployee({ id: profileId, manualLeaveAdjustment: newAdjustment }, {
            onSuccess: () => {
                setEditingBalance(null);
                refetch();
            }
        });
    };

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
                        <div key={member.id} className="card-premium group hover:border-primary-300 transition-all duration-500 hover:shadow-2xl hover:shadow-primary-100/20 bg-white p-8 overflow-hidden relative flex flex-col">
                            {/* Accent line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between mb-6">
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

                            <div className="space-y-1 mb-6">
                                <Link href={`/dashboard/hr-management/employees/${member.employeeProfile?.id || '#'}`} className="hover:underline">
                                    <h3 className="text-xl font-black text-secondary-900 leading-none">{member.name || (member.email ? member.email.split('@')[0] : 'User')}</h3>
                                </Link>
                                <p className="text-sm font-bold text-primary-600/80">{member.designation || 'Specialist'}</p>
                            </div>

                            <div className="space-y-3 py-4 border-y border-secondary-50 mb-6 flex-grow">
                                <div className="flex items-center gap-3 text-secondary-500 group-hover:text-secondary-900 transition-colors">
                                    <Mail size={14} className="text-secondary-400" />
                                    <span className="text-xs font-bold truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-secondary-500 group-hover:text-secondary-900 transition-colors">
                                        <Calendar size={14} className="text-secondary-400" />
                                        <span className="text-xs font-medium">Joined: <FormattedDate date={member.createdAt} /></span>
                                    </div>
                                </div>

                                {/* Leave Balance Section */}
                                <div className="mt-4 p-3 bg-secondary-50 rounded-xl flex items-center justify-between group/balance">
                                    <div>
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Leave Balance</p>
                                        <p className="text-lg font-black text-secondary-900">{calculateBalance(member)} Days</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingBalance(member.id);
                                            setNewAdjustment(member.employeeProfile?.manualLeaveAdjustment || 0);
                                        }}
                                        className="p-2 hover:bg-white rounded-lg text-secondary-400 hover:text-primary-600 transition-all opacity-0 group-hover/balance:opacity-100"
                                        title="Adjust Balance"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Adjustment Mode */}
                            {editingBalance === member.id && (
                                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                                    <h4 className="font-bold text-secondary-900 mb-4">Manual Adjustment</h4>
                                    <input
                                        type="number"
                                        className="input-premium w-32 text-center text-xl font-black mb-4"
                                        value={newAdjustment}
                                        onChange={(e) => setNewAdjustment(parseFloat(e.target.value))}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingBalance(null)}
                                            className="px-4 py-2 rounded-xl bg-secondary-100 text-secondary-600 font-bold text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleUpdateBalance(member.id, member.employeeProfile?.id)}
                                            className="px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs shadow-lg shadow-primary-200"
                                        >
                                            Save
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-secondary-400 mt-4 text-center max-w-[200px]">
                                        Positive adds to balance.<br />Negative deducts from balance.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-auto pt-4">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-secondary-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-secondary-400" title="Performance">
                                        {member._count?.tasks || 0}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary-400" title="Assigned">
                                        {member._count?.assignedSubscriptions || 0}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewingEmployeeId(member.id)}
                                    className="btn btn-secondary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all"
                                >
                                    View Detail
                                </button>
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
                                <th className="px-8 py-6 text-center">Leave Bal</th>
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
                                                <Link href={`/dashboard/hr-management/employees/${member.employeeProfile?.id || '#'}`} className="hover:underline">
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
                                    <td className="px-8 py-5 text-center">
                                        {/* Grid editing logic repeated here or simplified? Simplified for now */}
                                        <div className="flex items-center justify-center gap-2 group/listbal">
                                            <span className="font-black text-secondary-900">{calculateBalance(member)}</span>
                                            <button
                                                onClick={() => {
                                                    setEditingBalance(member.id);
                                                    setNewAdjustment(member.employeeProfile?.manualLeaveAdjustment || 0);
                                                }}
                                                className="p-1 hover:bg-secondary-100 rounded text-secondary-400 hover:text-primary-600 opacity-0 group-hover/listbal:opacity-100 transition-opacity"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                        {editingBalance === member.id && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setEditingBalance(null)}>
                                                <div className="bg-white p-6 rounded-2xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                                                    <h4 className="font-bold text-secondary-900 mb-4">Adjust Leave Balance</h4>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="text-sm font-medium">New Adjustment:</span>
                                                        <input
                                                            type="number"
                                                            className="input-premium w-24"
                                                            value={newAdjustment}
                                                            onChange={e => setNewAdjustment(parseFloat(e.target.value))}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingBalance(null)} className="btn btn-ghost text-xs">Cancel</button>
                                                        <button onClick={() => handleUpdateBalance(member.id, member.employeeProfile?.id)} className="btn btn-primary text-xs">Save Change</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => setViewingEmployeeId(member.id)}
                                            className="btn btn-secondary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all"
                                        >
                                            View Detail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {viewingEmployeeId && (
                <Employee360Modal
                    employeeId={viewingEmployeeId}
                    onClose={() => setViewingEmployeeId(null)}
                    viewAs="manager"
                />
            )}
        </div>
    );
};

export default TeamMembersView;
