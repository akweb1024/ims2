'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
    CRMPageShell, 
    CRMStatCard, 
    CRMModal, 
    CRMBadge 
} from '@/components/crm/CRMPageShell';
import { 
    Megaphone, Mail, Users, Plus, Clock, PlayCircle, 
    CheckCircle2, ArrowRight, Calendar, Layout, Search,
    Filter, MoreHorizontal, Activity, Zap, Target,
    Layers, ChevronRight, BarChart3, ShieldCheck
} from 'lucide-react';
import FormattedDate from '@/components/common/FormattedDate';

export default function CRMCampaignsPage() {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [audiences, setAudiences] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/crm/campaigns').then(r => r.json()),
            fetch('/api/crm/templates').then(r => r.json()),
            fetch('/api/crm/audiences').then(r => r.json())
        ]).then(([cData, tData, aData]) => {
            if (!cData.error) setCampaigns(cData);
            if (!tData.error) setTemplates(tData);
            if (!aData.error) setAudiences(aData);
        }).finally(() => setLoading(false));
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                     ...data,
                     status: 'SCHEDULED' // auto schedule on creation
                })
            });

            if (res.ok) {
                const newCampaign = await res.json();
                setCampaigns([newCampaign, ...campaigns]);
                setIsCreating(false);
            } else {
                alert('Failed to launch campaign sequence.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <DashboardLayout>
            <CRMPageShell
                title="Automations & Sequences"
                subtitle="Design, target, and launch automated drip campaigns and high-impact marketing sequences."
                breadcrumb={[
                    { label: 'CRM', href: '/dashboard/crm' },
                    { label: 'Automation Matrix' }
                ]}
                icon={<Megaphone className="w-5 h-5" />}
                actions={
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                        Establish Sequence
                    </button>
                }
            >
                {/* Visual Intelligence Matrix (Stats) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CRMStatCard
                        label="Active Sequences"
                        value={campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'SCHEDULED').length}
                        icon={<Activity className="w-5 h-5" />}
                        accent="bg-primary-950 text-white shadow-primary-100"
                        trend={{ value: 'Real-time', label: 'monitoring', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Targeted Universes"
                        value={audiences.length}
                        icon={<Users className="w-5 h-5" />}
                        accent="bg-indigo-900 text-white shadow-indigo-100"
                        trend={{ value: 'Segments', label: 'locked', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Design Blueprints"
                        value={templates.length}
                        icon={<Layout className="w-5 h-5" />}
                        accent="bg-secondary-900 text-white shadow-secondary-100"
                        trend={{ value: 'Templates', label: 'verified', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Operational Cycles"
                        value={campaigns.length}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        accent="bg-emerald-900 text-white shadow-emerald-100"
                        trend={{ value: 'Success', label: 'rate optimized', isPositive: true }}
                    />
                </div>

                <div className="space-y-8 mt-10">
                    <div className="flex items-center justify-between border-b border-secondary-100 pb-6">
                        <div className="flex items-center gap-4">
                             <div className="w-2 h-7 bg-primary-600 rounded-full" />
                             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-secondary-950 italic">Operational Topology</h3>
                        </div>
                        <div className="flex items-center gap-3 bg-secondary-100/50 p-1.5 rounded-2xl border border-secondary-200/50">
                             <button className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white shadow-xl text-primary-600 ring-1 ring-secondary-100 transition-all">Matrix Grid</button>
                             <button className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-secondary-400 hover:text-secondary-900 transition-all">Linear Feed</button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-80 bg-secondary-50/50 rounded-[2.5rem] border border-secondary-100 animate-pulse" />
                            ))}
                        </div>
                    ) : campaigns.length === 0 ? (
                         <div className="py-40 text-center border-2 border-dashed border-secondary-200 rounded-[4rem] bg-secondary-50/20 shadow-inner group">
                             <div className="w-28 h-28 bg-white text-secondary-200 rounded-[3rem] shadow-xl shadow-secondary-100 border border-secondary-100 flex items-center justify-center mx-auto mb-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                 <Megaphone size={48} strokeWidth={1} />
                             </div>
                             <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">Zero Sequence Activity</h3>
                             <p className="text-secondary-400 text-[11px] font-black uppercase tracking-[0.3em] mt-3 max-w-sm mx-auto leading-relaxed">Automation matrix is clear. Initialize your first marketing framework to begin node propagation.</p>
                             <button onClick={() => setIsCreating(true)} className="mt-12 px-12 py-4 bg-primary-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all hover:-translate-y-1">Initialize Framework</button>
                         </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
                             {campaigns.map(campaign => (
                                 <div key={campaign.id} className="group crm-card p-0 overflow-hidden flex flex-col transition-all duration-700 hover:shadow-2xl hover:shadow-primary-100/50 hover:-translate-y-2 border-transparent hover:border-primary-100">
                                      {/* Gradient Header */}
                                      <div className={`h-2 w-full ${campaign.status === 'ACTIVE' ? 'bg-primary-600 animate-pulse' : 'bg-secondary-200'}`} />
                                      
                                      <div className="p-8 pb-4 relative z-10 flex-1">
                                          <div className="flex justify-between items-start mb-8">
                                              <div className="flex flex-col min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                       <div className={`w-1.5 h-1.5 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-primary-500 animate-pulse' : 'bg-secondary-300'}`} />
                                                       <h4 className="font-black text-secondary-950 leading-none text-lg group-hover:text-primary-600 transition-colors uppercase tracking-tight italic truncate">{campaign.name}</h4>
                                                  </div>
                                                  <span className="text-[9px] text-secondary-400 font-black uppercase tracking-[0.3em] mt-2 block opacity-40">SEQUENCE ARCHIVE ID: {campaign.id.substring(0, 8)}</span>
                                              </div>
                                              <CRMBadge 
                                                  variant={campaign.status === 'ACTIVE' ? 'primary' : campaign.status === 'DRAFT' ? 'secondary' : 'info'} 
                                                  className="text-[9px] font-black uppercase tracking-widest bg-secondary-50 border-none shadow-sm"
                                                  dot
                                              >
                                                  {campaign.status}
                                              </CRMBadge>
                                          </div>
                                          
                                          <div className="space-y-4">
                                              <div className="flex items-center gap-5 group/item p-3.5 bg-secondary-50/50 rounded-2xl border border-secondary-100/50 hover:bg-white hover:border-primary-100 hover:shadow-sm transition-all cursor-default">
                                                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-inner border border-secondary-100 group-hover/item:border-primary-200 transition-colors">
                                                      <Layout size={18} className="text-secondary-400 group-hover/item:text-primary-600 transition-colors" />
                                                  </div>
                                                  <div className="flex flex-col min-w-0">
                                                      <span className="text-[8px] uppercase font-black tracking-[0.3em] text-secondary-400 leading-none mb-1.5">Design Blueprint</span>
                                                      <span className="font-black text-secondary-900 text-[11px] truncate uppercase tracking-tight">{campaign.template?.name || 'Manual Architecture'}</span>
                                                  </div>
                                              </div>
                                              
                                              <div className="flex items-center gap-5 group/item p-3.5 bg-secondary-50/50 rounded-2xl border border-secondary-100/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all cursor-default">
                                                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-inner border border-secondary-100 group-hover/item:border-indigo-200 transition-colors">
                                                      <Users size={18} className="text-secondary-400 group-hover/item:text-indigo-600 transition-colors" />
                                                  </div>
                                                  <div className="flex flex-col min-w-0">
                                                      <span className="text-[8px] uppercase font-black tracking-[0.3em] text-secondary-400 leading-none mb-1.5">Target segment</span>
                                                      <span className="font-black text-secondary-900 text-[11px] truncate uppercase tracking-tight">{campaign.audience?.name || 'Unmapped Universe'}</span>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="bg-secondary-50/80 px-8 py-6 flex items-center justify-between border-t border-secondary-100/40 mt-4 group-hover:bg-white transition-colors duration-500">
                                           <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-secondary-300 uppercase tracking-widest leading-none mb-1">Initialization</span>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                                                    <Calendar size={13} className="text-secondary-200" />
                                                    <FormattedDate date={campaign.createdAt} />
                                                </div>
                                           </div>
                                           <button className="flex items-center gap-3 bg-secondary-950 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-secondary-100 hover:bg-black transition-all hover:gap-4 group/btn">
                                               Deep Report <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                           </button>
                                      </div>
                                 </div>
                             ))}
                         </div>
                    )}
                </div>

                {/* Automation architect Modal */}
                <CRMModal
                    open={isCreating}
                    onClose={() => setIsCreating(false)}
                    title="Sequence Architecture"
                    subtitle="Configure the multi-phasic targeting and timing protocols for your automated marketing sequence"
                >
                    <form onSubmit={handleCreate} className="space-y-8 py-4">
                        <div className="bg-secondary-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                             <div className="absolute -right-4 -bottom-4 opacity-5 blur-sm">
                                  <Zap size={140} className="text-white" />
                             </div>
                             <div className="relative z-10 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-400 pl-1">Sequence Designation</label>
                                <div className="relative group">
                                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 group-focus-within:text-white transition-colors">
                                          <ShieldCheck size={20} />
                                     </div>
                                     <input 
                                         name="name" 
                                         className="input h-14 pl-12 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-tight focus:bg-white/10 focus:ring-primary-500/20" 
                                         placeholder="EX: Q4 ACQUISITION SEQUENCE..." 
                                         required 
                                     />
                                </div>
                             </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Universe Target Segment</label>
                                    <div className="relative group">
                                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors pointer-events-none">
                                              <Target size={18} />
                                         </div>
                                         <select name="audienceId" className="input h-14 pl-12 bg-secondary-50 border-secondary-100 font-black text-[11px] uppercase tracking-tight focus:bg-white focus:shadow-xl transition-all cursor-pointer" required title="Audience">
                                             <option value="" className="italic">Select Targeted Segment…</option>
                                             {audiences.map(a => <option key={a.id} value={a.id} className="text-secondary-900">{a.name.toUpperCase()}</option>)}
                                         </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Blueprint Architecture</label>
                                    <div className="relative group">
                                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors pointer-events-none">
                                              <Layers size={18} />
                                         </div>
                                         <select name="templateId" className="input h-14 pl-12 bg-secondary-50 border-secondary-100 font-black text-[11px] uppercase tracking-tight focus:bg-white focus:shadow-xl transition-all cursor-pointer" required title="Template">
                                             <option value="" className="italic">Select Blueprint Architecture…</option>
                                             {templates.map(t => <option key={t.id} value={t.id} className="text-secondary-900">{t.name.toUpperCase()} [{t.subject.toUpperCase()}]</option>)}
                                         </select>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Initiation Timestamp</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors pointer-events-none" size={18} />
                                        <input type="date" name="startDate" className="input h-14 pl-12 bg-secondary-50 border-secondary-100 font-black text-xs focus:bg-white focus:shadow-xl transition-all" required title="Start Date" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Termination Sequence (Optional)</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors pointer-events-none" size={18} />
                                        <input type="date" name="endDate" className="input h-14 pl-12 bg-secondary-50 border-secondary-100 font-black text-xs focus:bg-white focus:shadow-xl transition-all" title="End Date" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-secondary-100/50">
                            <button 
                                type="button" 
                                onClick={() => setIsCreating(false)} 
                                className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
                            >
                                Abandon
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 bg-primary-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                                Activate Framework <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </form>
                </CRMModal>
            </CRMPageShell>
        </DashboardLayout>
    );
}
