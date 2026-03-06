'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Link from 'next/link';
import { 
    CRMPageShell, 
    CRMModal, 
    CRMBadge,
    CRMStatCard 
} from '@/components/crm/CRMPageShell';
import { 
    Calendar, CheckCircle2, Clock, AlertCircle, ArrowRight, 
    MessageSquare, Phone, Mail, Users, Trash2, Edit3, 
    MoreHorizontal, Filter, Search, CheckSquare,
    Zap, Target, Activity, ChevronRight, Building2,
    User as UserIcon, MessageCircle, ShieldCheck, Layers
} from 'lucide-react';

export default function FollowUpsPage() {
    const [data, setData] = useState<{ missed: any[], today: any[], upcoming: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('EXECUTIVE');
    const [editingItem, setEditingItem] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUserRole(JSON.parse(userData).role);
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/dashboard/follow-ups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogActivity = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setActionLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const token = localStorage.getItem('token');

            await fetch(`/api/communications/${editingItem.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome: formData.get('oldOutcome'), nextFollowUpDate: null }),
            });

            await fetch('/api/communications', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: editingItem.customerProfile.id,
                    type: 'CALL',
                    channel: formData.get('newChannel'),
                    subject: formData.get('newSubject'),
                    notes: formData.get('newNotes'),
                    nextFollowUpDate: formData.get('newNextDate') || null,
                }),
            });

            setEditingItem(null);
            fetchData();
        } catch (error) {
            console.error('Activity Log error:', error);
            alert('Error logging activity');
        } finally {
            setActionLoading(false);
        }
    };

    const ChannelIcon = ({ channel }: { channel: string }) => {
        const chan = channel?.toUpperCase();
        if (chan === 'EMAIL') return <Mail size={14} />;
        if (chan === 'PHONE') return <Phone size={14} />;
        if (chan === 'WHATSAPP') return <MessageCircle size={14} />;
        if (chan === 'MEETING') return <Users size={14} />;
        return <MessageSquare size={14} />;
    };

    // ── Follow-up card ────────────────────────────────────────────────────────
    const FollowUpCard = ({ item, isMissed = false }: { item: any; isMissed?: boolean }) => (
        <div className={`group crm-card p-0 overflow-hidden relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isMissed ? 'hover:shadow-danger-100 border-l-4 border-danger-500' : 'hover:shadow-primary-100 border-l-4 border-primary-500'}`}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${isMissed ? 'bg-danger-500 animate-pulse' : 'bg-primary-500'}`} />
                             <h4 className="font-black text-secondary-950 text-[11px] uppercase tracking-wider group-hover:text-primary-700 transition-colors leading-tight line-clamp-1">{item.subject}</h4>
                        </div>
                        <span className="text-[9px] text-secondary-400 font-black uppercase tracking-[0.2em] ml-3.5 italic">Protocol: {item.channel} Intelligence</span>
                    </div>
                </div>

                {item.notes && (
                    <div className="relative mb-5 ml-3.5">
                         <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-secondary-200 group-hover:bg-primary-300 transition-colors rounded-full" />
                         <p className="text-[10px] text-secondary-600 font-medium leading-relaxed pl-3 italic line-clamp-2">
                            &quot;{item.notes}&quot;
                         </p>
                    </div>
                )}

                <div className="flex items-center justify-between mt-auto bg-secondary-50/50 p-3 rounded-2xl border border-secondary-100/50">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white border border-secondary-200 flex items-center justify-center shadow-sm shrink-0 group-hover:rotate-12 transition-transform">
                             <UserIcon size={14} className="text-secondary-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-tight text-secondary-900 truncate">{item.customerProfile.name}</span>
                            <div className="flex items-center gap-1 text-[8px] font-black text-secondary-400 uppercase tracking-widest truncate">
                                 <Building2 size={10} className="shrink-0 opacity-40" />
                                 <span className="truncate">{item.customerProfile.organizationName || 'Individual Target'}</span>
                            </div>
                        </div>
                    </div>
                    <Link
                        href={`/dashboard/customers/${item.customerProfile.id}?tab=communication`}
                        className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm border border-primary-100 hover:bg-primary-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 shrink-0"
                    >
                        <ChevronRight size={16} />
                    </Link>
                </div>
            </div>

            <div className={`px-6 py-4 border-t border-secondary-100 flex items-center justify-between ${isMissed ? 'bg-danger-50/20' : 'bg-primary-50/20'}`}>
                <div className="flex flex-col">
                     <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isMissed ? 'text-danger-500' : 'text-primary-500'}`}>
                          {isMissed ? 'Overdue Deadline' : 'Phase Execution'}
                     </span>
                     <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary-700">
                          <Clock size={12} className="opacity-40" />
                          <FormattedDate date={item.nextFollowUpDate} />
                     </div>
                </div>
                <button
                    onClick={() => setEditingItem(item)}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-secondary-900 shadow-sm border border-secondary-200 hover:border-primary-500 hover:text-primary-700 transition-all hover:bg-primary-50 group-hover:shadow-lg"
                >
                    Log Pulse <CheckSquare size={13} className="text-primary-500" />
                </button>
            </div>
        </div>
    );

    // ── Column header ─────────────────────────────────────────────────────────
    const ColumnHeader = ({
        label, count, accent, icon,
    }: { label: string; count: number; accent: string; icon: React.ReactNode }) => (
        <div className={`flex items-center justify-between p-5 rounded-[1.5rem] border-2 ${accent} mb-8 shadow-xl relative overflow-hidden group`}>
            {/* Background Decor */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 {icon}
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="p-2.5 bg-white/40 backdrop-blur-md rounded-xl shadow-inner border border-white/20">
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60 leading-none mb-1">Queue Segment</span>
                    <h3 className="font-black text-xs uppercase tracking-[0.15em] shrink-0">
                        {label}
                    </h3>
                </div>
            </div>
            <div className="relative z-10 bg-white/30 backdrop-blur-md px-4 py-1.5 rounded-2xl font-black text-sm shadow-inner ring-1 ring-black/5 min-w-[3rem] text-center">
                {count}
            </div>
        </div>
    );

    return (
        <DashboardLayout userRole={userRole}>
            <CRMPageShell
                title="Follow-up Matrix"
                subtitle="Integrated orchestration of scheduled customer interactions, pending task cycles, and engagement milestones."
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Operational Follow-ups' }]}
                icon={<Calendar className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-5 bg-primary-900 p-2 pr-6 rounded-[2rem] shadow-2xl shadow-primary-200 ring-4 ring-primary-50">
                        <div className="w-12 h-12 bg-white/10 text-white rounded-[1.2rem] flex items-center justify-center backdrop-blur-md border border-white/10">
                             <Zap size={20} className="animate-pulse text-primary-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-primary-300 uppercase tracking-[0.2em] leading-none mb-1">Live Queue</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white leading-none tabular-nums">{data?.today.length || 0}</span>
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active today</span>
                            </div>
                        </div>
                    </div>
                }
            >
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-8 p-2">
                                <div className="h-20 bg-secondary-100 rounded-[1.5rem] animate-pulse" />
                                {[1, 2, 3].map(j => (
                                    <div key={j} className="h-56 bg-secondary-50/50 rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : !data ? (
                     <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-secondary-100 shadow-inner">
                         <div className="w-20 h-20 bg-secondary-50 text-secondary-200 rounded-[2.2rem] flex items-center justify-center mx-auto mb-6">
                              <AlertCircle size={40} className="animate-bounce" />
                         </div>
                         <h3 className="font-black text-secondary-900 text-sm uppercase tracking-[0.3em] mb-2">Sync Synchronization Failure</h3>
                         <p className="text-secondary-400 text-[11px] font-bold uppercase tracking-widest">Unable to establish connection with the follow-up data matrix.</p>
                         <button onClick={fetchData} className="mt-8 px-8 py-3 bg-secondary-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Re-initiate Protocol</button>
                     </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-32">
                        {/* Overdue */}
                        <div className="bg-danger-50/10 p-4 rounded-[2.5rem] border border-danger-100/30 group/col relative overflow-hidden">
                            {/* Visual Backstop */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-danger-500/20" />
                            
                            <ColumnHeader
                                label="Overdue Horizon"
                                count={data.missed.length}
                                accent="bg-danger-900 text-white border-danger-900 shadow-danger-200"
                                icon={<AlertCircle size={22} />}
                            />
                            <div className="space-y-6 px-1">
                                {data.missed.map(item => <FollowUpCard key={item.id} item={item} isMissed />)}
                                {data.missed.length === 0 && (
                                    <div className="py-24 text-center group-hover/col:scale-105 transition-transform duration-700">
                                        <div className="w-20 h-20 bg-white shadow-xl shadow-success-100 text-success-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-success-50">
                                            <CheckCircle2 size={40} strokeWidth={1.5} />
                                        </div>
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-success-700 mb-1">Queue Purified</h4>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-secondary-300">All milestones currently aligned</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Today */}
                        <div className="bg-primary-50/10 p-4 rounded-[2.5rem] border border-primary-100/30 group/col relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary-500/20" />

                            <ColumnHeader
                                label="Live Execution"
                                count={data.today.length}
                                accent="bg-primary-600 text-white border-primary-600 shadow-primary-200"
                                icon={<Zap size={22} />}
                            />
                            <div className="space-y-6 px-1">
                                {data.today.map(item => <FollowUpCard key={item.id} item={item} />)}
                                {data.today.length === 0 && (
                                    <div className="py-24 text-center opacity-40">
                                        <div className="w-20 h-20 bg-secondary-100 text-secondary-300 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                         &quot;Success is not final; failure is not fatal: It is the courage to continue that counts.&quot;
                                </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-500">No signals for today</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming */}
                        <div className="bg-secondary-50/10 p-4 rounded-[2.5rem] border border-secondary-100/30 group/col relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-secondary-500/10" />

                            <ColumnHeader
                                label="Pipeline Sequences"
                                count={data.upcoming.length}
                                accent="bg-secondary-900 text-white border-secondary-900 shadow-secondary-200"
                                icon={<Target size={22} />}
                            />
                            <div className="space-y-6 px-1">
                                {data.upcoming.map(item => <FollowUpCard key={item.id} item={item} />)}
                                {data.upcoming.length === 0 && (
                                    <div className="py-24 text-center opacity-30">
                                         <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Future horizon is clear</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CRMPageShell>

            {/* Log Pulse Logic Modal */}
            <CRMModal
                open={!!editingItem}
                onClose={() => setEditingItem(null)}
                title="Log Operational Signal"
                subtitle="Terminate the current interaction cycle and establish parameters for the next deployment phase."
            >
                {editingItem && (
                    <form onSubmit={handleLogActivity} className="space-y-8">
                        {/* Source Summary Matrix */}
                        <div className="bg-secondary-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-primary-100">
                             <div className="absolute -right-4 -bottom-4 opacity-10 blur-sm pointer-events-none">
                                 <Zap size={140} />
                             </div>
                             <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                     <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                          <Target size={20} className="text-primary-400" />
                                     </div>
                                     <div className="flex flex-col">
                                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary-400 leading-none">Termination Node</span>
                                          <h4 className="font-black text-lg tracking-tight uppercase italic">{editingItem.subject}</h4>
                                     </div>
                                </div>
                                <div className="relative py-4 my-2 border-y border-white/10">
                                     <p className="text-xs font-medium leading-relaxed italic opacity-80 text-primary-50">&quot;{editingItem.notes}&quot;</p>
                                </div>
                                
                                <div className="mt-8">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-300 mb-3 block px-1">Evaluation Outcome</label>
                                    <div className="relative group">
                                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 group-focus-within:text-white transition-colors">
                                              <ShieldCheck size={18} />
                                         </div>
                                         <select 
                                             name="oldOutcome" 
                                             className="input bg-white/5 border-white/10 text-white font-black text-xs p-4 pl-12 focus:bg-white/10 focus:ring-primary-500/20 cursor-pointer" 
                                             required
                                             title="Outcome"
                                         >
                                             <option value="" className="text-secondary-900">Select Terminal State…</option>
                                             <option value="Completed" className="text-secondary-900">Protocol: Successful Resolution</option>
                                             <option value="No Answer" className="text-secondary-900">Protocol: Signal Inertia (No Response)</option>
                                             <option value="Rescheduled" className="text-secondary-900">Protocol: Tactical Reschedule</option>
                                             <option value="Client Not Interested" className="text-secondary-900">Protocol: Lead Termination</option>
                                             <option value="Sale Closed" className="text-secondary-900">Protocol: Commercial Conversion</option>
                                         </select>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Propagation Parameters */}
                        <div className="space-y-6 pt-2">
                             <div className="flex items-center gap-3 px-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-900">Next Signal Parameters</span>
                             </div>
                             
                             <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">Signal Designation (Subject)</label>
                                 <input
                                     name="newSubject"
                                     className="input font-bold text-xs p-4 bg-secondary-50 border-secondary-100 hover:bg-white focus:bg-white transition-all"
                                     defaultValue={`Follow-up: ${editingItem.subject}`}
                                     required
                                 />
                             </div>

                             <div className="grid grid-cols-2 gap-5">
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">Signal Mode (Channel)</label>
                                     <div className="relative group">
                                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                               <Layers size={18} />
                                          </div>
                                          <select name="newChannel" className="input font-bold text-xs p-4 pl-12 bg-secondary-50 hover:bg-white focus:bg-white cursor-pointer" title="Channel">
                                              <option value="Phone">Mode: Telephonic</option>
                                              <option value="Email">Mode: Electronic</option>
                                              <option value="WhatsApp">Mode: Direct Grid</option>
                                              <option value="Meeting">Mode: Physical Sync</option>
                                          </select>
                                     </div>
                                 </div>
                                 <div className="space-y-2">
                                     <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">Reactivation Phase</label>
                                     <div className="relative group">
                                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-500 transition-colors">
                                               <Calendar size={18} />
                                          </div>
                                          <input type="date" name="newNextDate" className="input font-bold text-xs p-4 pl-12 bg-secondary-50 hover:bg-white focus:bg-white" />
                                     </div>
                                 </div>
                             </div>

                             <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 px-1">Operational Intel (Notes)</label>
                                 <textarea
                                     name="newNotes"
                                     className="input min-h-[120px] p-5 font-medium text-xs leading-relaxed bg-secondary-50 hover:bg-white focus:bg-white resize-none shadow-inner"
                                     placeholder="Quantify the intelligence gathered and detail the deployment strategy for this next vector..."
                                     required
                                 />
                             </div>
                        </div>

                        <div className="flex gap-4 pt-6 border-t border-secondary-100/50">
                            <button
                                type="button"
                                onClick={() => setEditingItem(null)}
                                className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
                            >
                                Abandon
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="flex-1 bg-primary-600 text-white px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-3 group"
                            >
                                {actionLoading ? 'Synchronizing...' : (
                                    <>Log & Propagate <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </CRMModal>
        </DashboardLayout>
    );
}
