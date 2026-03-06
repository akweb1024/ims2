'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import {
    CRMPageShell,
    CRMTable,
    CRMTableLoading,
    CRMTableEmpty,
    CRMPagination,
    CRMBadge,
} from '@/components/crm/CRMPageShell';
import { 
    MessageSquare, Send, Mail, Phone, MessageCircle, 
    Users, CheckCircle, Clock, ArrowRight, User,
    Building2, Activity, Calendar, History, TrendingUp,
    Zap, Search, Filter, ShieldCheck, AlertCircle
} from 'lucide-react';

function ChannelIcon({ channel }: { channel: string }) {
    const chan = channel?.toUpperCase();
    if (chan === 'EMAIL') return <Mail size={18} className="text-blue-500" />;
    if (chan === 'PHONE') return <Phone size={18} className="text-emerald-500" />;
    if (chan === 'WHATSAPP') return <MessageCircle size={18} className="text-green-500" />;
    if (chan === 'MEETING') return <Users size={18} className="text-purple-500" />;
    return <MessageSquare size={18} className="text-secondary-400" />;
}

export default function CommunicationsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/communications?page=${page}&limit=${pagination.limit}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.pagination) {
                    setLogs(data.data);
                    setPagination(data.pagination);
                } else {
                    setLogs(data.data || data);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
        fetchLogs();
    }, [fetchLogs]);

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Engagement Intelligence"
                subtitle="High-fidelity audit trail of cross-channel customer interactions and correspondence."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Communications History' }]}
                icon={<History className="w-5 h-5" />}
                actions={
                    ['SUPER_ADMIN', 'MANAGER'].includes(userRole) && (
                        <Link href="/dashboard/communications/bulk" className="btn btn-primary py-2 px-6 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl shadow-primary-200 group grow-0">
                            <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            Initiate Broadcast
                        </Link>
                    )
                }
            >
                <div className="crm-card overflow-hidden">
                    {/* Header Matrix */}
                    <div className="bg-secondary-50/50 p-6 border-b border-secondary-100 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-100 flex-shrink-0">
                                   <Activity size={16} />
                              </div>
                              <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-500 leading-none mb-1">Activity Stream</span>
                                   <span className="text-xs font-bold text-secondary-900">Global Interaction Matrix</span>
                              </div>
                         </div>
                         <div className="flex items-center gap-4">
                              <div className="hidden md:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-secondary-400">
                                   <div className="flex items-center gap-1.5 border-r border-secondary-200 pr-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Live Feed Sync</span>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-secondary-300" />
                                        <span>Audit Level 4</span>
                                   </div>
                              </div>
                         </div>
                    </div>

                    <div className="divide-y divide-secondary-100/60">
                        {loading ? (
                            <div className="p-8 space-y-8">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="flex gap-6 animate-pulse">
                                        <div className="w-14 h-14 bg-secondary-100 rounded-2xl shrink-0" />
                                        <div className="flex-1 space-y-4 py-1">
                                            <div className="flex gap-4">
                                                <div className="h-5 bg-secondary-100 rounded-lg w-1/4" />
                                                <div className="h-5 bg-secondary-100 rounded-lg w-16" />
                                            </div>
                                            <div className="h-4 bg-secondary-100 rounded-lg w-1/2" />
                                            <div className="flex gap-10 pt-2">
                                                <div className="h-3 bg-secondary-100 rounded-lg w-24" />
                                                <div className="h-3 bg-secondary-100 rounded-lg w-24" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-32 text-center bg-white">
                                <div className="w-24 h-24 bg-secondary-50 text-secondary-200 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-12 group-hover:rotate-0 transition-transform duration-700 border border-secondary-100 shadow-inner">
                                    <MessageSquare size={48} strokeWidth={1} />
                                </div>
                                <h3 className="font-black text-secondary-900 text-sm uppercase tracking-[0.3em] mb-2">No active signal threads</h3>
                                <p className="text-secondary-400 text-[11px] font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">System is operational. Interaction intelligence will populate as data vectors are received.</p>
                            </div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="p-8 md:p-10 hover:bg-secondary-50 transition-all group relative border-l-4 border-transparent hover:border-primary-500 overflow-hidden">
                                     {/* Background Decor */}
                                     <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                                          <Zap size={160} className="text-primary-500" />
                                     </div>

                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
                                        {/* Left: icon + content */}
                                        <div className="flex items-start gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-[1.2rem] bg-white border border-secondary-200 flex items-center justify-center shadow-xl shadow-secondary-100 group-hover:shadow-primary-100 group-hover:scale-105 group-hover:border-primary-200 transition-all duration-500 shrink-0">
                                                <ChannelIcon channel={log.channel} />
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <span className="font-black text-secondary-950 text-lg tracking-tight leading-none group-hover:text-primary-700 transition-colors uppercase italic">{log.subject}</span>
                                                    <CRMBadge variant="secondary" className="text-[9px] font-black uppercase tracking-[0.2em] bg-white border border-secondary-200 text-secondary-500">
                                                        {log.channel} PROTOCOL
                                                    </CRMBadge>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-2 bg-secondary-100/40 p-1 pr-3 rounded-full border border-secondary-100/50">
                                                         <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-[9px] font-black shadow-lg">
                                                              {log.customerProfile.name.charAt(0)}
                                                         </div>
                                                         <Link
                                                            href={`/dashboard/customers/${log.customerProfileId}`}
                                                            className="font-black text-secondary-900 hover:text-primary-600 transition-colors uppercase text-[10px] tracking-widest"
                                                        >
                                                            {log.customerProfile.name}
                                                        </Link>
                                                    </div>
                                                    
                                                    {log.customerProfile.institution ? (
                                                        <Link href={`/dashboard/institutions/${log.customerProfile.institution.id}`} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/50 border border-indigo-100 rounded-full text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
                                                            <Building2 size={10} />
                                                            {log.customerProfile.institution.name}
                                                        </Link>
                                                    ) : log.customerProfile.organizationName && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-secondary-100/50 border border-secondary-200/50 rounded-full text-[10px] font-bold text-secondary-600 uppercase tracking-tight">
                                                             <Zap size={10} className="text-secondary-400" />
                                                             {log.customerProfile.organizationName}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {log.notes && (
                                                    <div className="relative mt-4">
                                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-200 rounded-full opacity-40 group-hover:opacity-100 transition-opacity" />
                                                         <p className="text-secondary-700 text-xs font-medium leading-[1.8] max-w-3xl line-clamp-3 bg-secondary-50/50 p-4 rounded-r-2xl border border-secondary-100/50 italic pl-6">
                                                            &quot;{log.notes}&quot;
                                                         </p>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center gap-6 mt-6 pt-2">
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-secondary-400">
                                                        <User size={12} className="text-primary-500/40" />
                                                        <span>Identity: {log.user.name || log.user.role}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-secondary-400">
                                                        <Calendar size={12} className="text-primary-500/40" />
                                                        <FormattedDate date={log.date} />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-secondary-400">
                                                        <Clock size={12} className="text-primary-500/40" />
                                                         {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                    {log.outcome && (
                                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                                                            <CheckCircle size={12} className="text-emerald-500" />
                                                            <span>Terminal Outcome: {log.outcome}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Milestone Actions */}
                                        <div className="shrink-0 md:text-right flex flex-col items-end gap-4 self-center md:self-stretch justify-between py-2 border-l border-secondary-100/50 pl-8">
                                            {log.nextFollowUpDate ? (
                                                <div className="flex flex-col items-end gap-3">
                                                    <div className={`group/milestone flex flex-col items-end gap-1.5 p-4 py-3 rounded-2xl border-2 transition-all duration-500 min-w-[160px] ${log.isFollowUpCompleted ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-amber-50/50 border-amber-200/50 shadow-lg shadow-amber-100/20'}`}>
                                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 flex items-center gap-1.5 ${log.isFollowUpCompleted ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`}>
                                                            {log.isFollowUpCompleted ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                            {log.isFollowUpCompleted ? 'Milestone Resolved' : 'Impending Phase'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                             <Calendar size={14} className={log.isFollowUpCompleted ? 'text-emerald-400' : 'text-amber-400'} />
                                                             <span className={`text-xs font-black tabular-nums transition-colors ${log.isFollowUpCompleted ? 'text-secondary-400' : 'text-secondary-900 group-hover/milestone:text-amber-700'}`}>
                                                                  <FormattedDate date={log.nextFollowUpDate} />
                                                             </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {!log.isFollowUpCompleted && ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'].includes(userRole) && (
                                                        <Link
                                                            href={`/dashboard/customers/${log.customerProfileId}?followUpId=${log.id}#communication-form`}
                                                            className="flex items-center justify-center gap-3 bg-white text-primary-600 border border-primary-200 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-xl hover:shadow-primary-100 hover:bg-primary-600 hover:text-white hover:-translate-y-1 transition-all duration-300 w-full"
                                                        >
                                                            Respond Protocol <ArrowRight size={14} />
                                                        </Link>
                                                    )}
                                                </div>
                                            ) : (
                                                 <div className="opacity-20 flex flex-col items-end gap-1 select-none grayscale">
                                                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary-300">Closed Loop</span>
                                                      <TrendingUp size={20} className="text-secondary-300" />
                                                 </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination Matrix */}
                    {!loading && logs.length > 0 && (
                        <div className="p-8 border-t border-secondary-100/50 bg-secondary-50/20">
                            <CRMPagination
                                page={pagination.page}
                                totalPages={pagination.totalPages}
                                total={pagination.total}
                                limit={pagination.limit}
                                onPageChange={p => fetchLogs(p)}
                                entityName="signal logs"
                            />
                        </div>
                    )}
                </div>
            </CRMPageShell>
        </DashboardLayout>
    );
}
