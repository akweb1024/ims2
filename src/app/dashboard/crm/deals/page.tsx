'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormattedDate from '@/components/common/FormattedDate';
import CRMClientLayout from '../CRMClientLayout';
import {
    CRMPageShell,
    CRMModal,
    CRMStatCard
} from '@/components/crm/CRMPageShell';
import { 
    Briefcase, Plus, TrendingUp, User, 
    Calendar, CheckCircle2, History, IndianRupee,
    ArrowRight, MoreHorizontal, Activity, Layers, Target,
    Sparkles, ShieldCheck, Zap, ChevronRight, Archive,
    Clock
} from 'lucide-react';

// Stages definition with improved aesthetics
const STAGES = [
    { id: 'DISCOVERY', label: 'Discovery Phase', color: 'border-primary-100/50 bg-primary-100/5', accent: 'text-primary-600', probability: '20%' },
    { id: 'PROPOSAL', label: 'Proposal Stage', color: 'border-indigo-100/50 bg-indigo-100/5', accent: 'text-indigo-600', probability: '50%' },
    { id: 'NEGOTIATION', label: 'Negotiation Matrix', color: 'border-purple-100/50 bg-purple-100/5', accent: 'text-purple-600', probability: '80%' },
    { id: 'CLOSED_WON', label: 'Target Acquired', color: 'border-emerald-100/50 bg-emerald-100/5', accent: 'text-emerald-600', probability: '100%' },
    { id: 'CLOSED_LOST', label: 'Lost Opportunity', color: 'border-rose-100/50 bg-rose-100/5', accent: 'text-rose-600', probability: '0%' }
];

export default function DealsPage() {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [leads, setLeads] = useState<any[]>([]);
    const [createLoading, setCreateLoading] = useState(false);

    const [newDeal, setNewDeal] = useState({
        title: '', value: 0, customerId: '', stage: 'DISCOVERY', notes: '', expectedCloseDate: ''
    });

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/crm/deals');
            if (res.ok) {
                const data = await res.json();
                setDeals(data);
            }
        } catch (error) {
            console.error('Failed to fetch deals', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLeadsForSelect = async () => {
        try {
            const res = await fetch('/api/crm/leads?limit=100');
            if (res.ok) {
                const data = await res.json();
                setLeads(data.data);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchDeals(); fetchLeadsForSelect();
    }, [fetchDeals]);

    const handleCreateDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const res = await fetch('/api/crm/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDeal)
            });

            if (res.ok) {
                setShowCreateModal(false);
                setNewDeal({ title: '', value: 0, customerId: '', stage: 'DISCOVERY', notes: '', expectedCloseDate: '' });
                fetchDeals();
            }
        } catch (error) {
            console.error('Error creating deal', error);
        } finally {
            setCreateLoading(false);
        }
    };

    const getStageTotal = (stageId: string) => {
        return deals
            .filter(d => d.stage === stageId)
            .reduce((sum, d) => sum + (d.value || 0), 0);
    };

    const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="Deal Pipeline Architecture"
                subtitle="Visualize and orchestrate the lifecycle of ongoing opportunities and historical conversion matrices."
                icon={<Briefcase className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Deals Pipeline' }]}
                actions={
                    <div className="flex items-center gap-3">
                         <div className="hidden lg:flex items-center gap-3 bg-secondary-950 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                             <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Pipeline Sync</span>
                             </div>
                             <div className="h-4 w-px bg-white/10" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400 opacity-60">Status: Nominal</span>
                         </div>
                         <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                            Initialize Opportunity
                        </button>
                    </div>
                }
            >
                {/* Visual Intelligence Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CRMStatCard
                        label="Pipeline Volume"
                        value={`₹${totalPipelineValue.toLocaleString()}`}
                        icon={<TrendingUp size={22} />}
                        accent="bg-indigo-900 text-white shadow-indigo-100"
                        trend={{ value: 'Real-time', label: 'valuation', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Active Opportunities"
                        value={deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage)).length}
                        icon={<Activity size={22} />}
                        accent="bg-primary-950 text-white shadow-primary-100"
                        trend={{ value: 'Protocol', label: 'In-flow', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Conversion Nodes"
                        value={deals.filter(d => d.stage === 'CLOSED_WON').length}
                        icon={<ShieldCheck size={22} />}
                        accent="bg-emerald-900 text-white shadow-emerald-100"
                        trend={{ value: 'Target', label: 'Acquired', isPositive: true }}
                    />
                    <CRMStatCard
                        label="Matrix Density"
                        value={STAGES.length}
                        icon={<Layers size={22} />}
                        accent="bg-secondary-900 text-white shadow-secondary-100"
                        trend={{ value: 'Sectors', label: 'mapped', isPositive: true }}
                    />
                </div>

                {/* Operations bar */}
                <div className="mt-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-secondary-100 pb-8">
                     <div className="flex flex-wrap gap-2.5">
                         {STAGES.map(stage => (
                             <div key={stage.id} className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-secondary-200 bg-white shadow-sm">
                                  <div className={`w-2 h-2 rounded-full ${stage.accent.replace('text', 'bg')}`} />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-secondary-900">{stage.label}</span>
                                  <span className="h-4 w-px bg-secondary-100" />
                                  <span className="text-[9px] font-black text-primary-600">{deals.filter(d => d.stage === stage.id).length}</span>
                             </div>
                         ))}
                     </div>

                     <div className="flex items-center gap-3">
                          <div className="flex bg-secondary-100 p-1 rounded-xl">
                               <button className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white shadow-sm text-primary-600">Pipeline View</button>
                               <button className="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-secondary-400 hover:text-secondary-600 transition-all">Matrix List</button>
                          </div>
                          <button className="p-3 bg-secondary-100 text-secondary-500 rounded-xl hover:bg-secondary-200 transition-all">
                               <Archive size={18} />
                          </button>
                     </div>
                </div>

                {/* Board Matrix */}
                <div className="mt-8 flex gap-8 h-[calc(100vh-320px)] min-w-full overflow-x-auto pb-10 custom-scrollbar group/matrix">
                    {STAGES.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.id);
                        const totalValue = getStageTotal(stage.id);
                        
                        return (
                            <div key={stage.id} className={`flex-1 min-w-[340px] max-w-[420px] flex flex-col rounded-[3rem] border-2 ${stage.color.replace('50/20', '50/40')} shadow-xl shadow-transparent hover:shadow-secondary-100/30 transition-all duration-700 group/column`}>
                                {/* Column Header */}
                                <div className="p-8 border-b border-secondary-100/50 bg-white/40 backdrop-blur-md rounded-t-[2.8rem] flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${stage.accent.replace('text', 'bg')} shadow-[0_0_10px_currentColor] animate-pulse`} />
                                            <h3 className={`font-black text-[11px] uppercase tracking-[0.25em] italic ${stage.accent}`}>{stage.label}</h3>
                                        </div>
                                        <div className="bg-white/80 w-10 h-10 flex items-center justify-center rounded-2xl text-[11px] font-black text-secondary-950 border border-secondary-100 shadow-sm">
                                            {stageDeals.length}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                         <div className="flex flex-col">
                                              <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest mb-1 pl-0.5">Projected Yield</span>
                                              <div className="text-lg font-black text-secondary-950 flex items-center italic">
                                                  <IndianRupee size={16} className="opacity-30 mr-1" />
                                                  {totalValue.toLocaleString()}
                                              </div>
                                         </div>
                                         <div className="bg-secondary-950 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest group-hover/column:bg-primary-600 transition-colors">
                                             {stage.probability} Prob. Matrix
                                         </div>
                                    </div>
                                </div>

                                {/* Items Container */}
                                <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-secondary-50/20">
                                    {stageDeals.map(deal => (
                                        <Link
                                            key={deal.id}
                                            href={`/dashboard/crm/deals/${deal.id}`}
                                            className="block bg-white p-6 rounded-[2rem] shadow-sm border border-secondary-100 hover:shadow-2xl hover:shadow-primary-100/50 hover:border-primary-100 hover:translate-y-[-6px] transition-all duration-500 cursor-pointer group/card relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/card:opacity-10 transition-all duration-700 group-hover/card:scale-125 group-hover/card:-rotate-12">
                                                 <Target size={60} className={stage.accent} />
                                            </div>
                                            
                                            <div className="flex flex-col gap-1.5 mb-5 relative z-10">
                                                <div className="flex items-center justify-between mb-1">
                                                     <div className="text-[9px] font-black uppercase tracking-widest text-primary-500 flex items-center gap-1.5 bg-primary-50 px-2 py-0.5 rounded-md">
                                                         <Activity size={10} /> Deal ID: #{deal.id.slice(-4).toUpperCase()}
                                                     </div>
                                                     <div className="text-[8px] font-black text-secondary-300 uppercase tracking-widest">
                                                          {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true })}
                                                     </div>
                                                </div>
                                                <h4 className="font-black text-secondary-950 text-[13px] tracking-tight group-hover/card:text-primary-600 transition-colors uppercase leading-tight italic">
                                                    {deal.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <div className="w-5 h-5 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover/card:bg-primary-50 group-hover/card:text-primary-500 transition-colors">
                                                          <Briefcase size={12} />
                                                     </div>
                                                     <span className="text-[10px] text-secondary-400 font-black uppercase tracking-wider truncate max-w-[200px]">{deal.customer?.organizationName || deal.customer?.name}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-end pt-5 border-t border-secondary-50 relative z-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[8px] font-black text-secondary-300 uppercase tracking-widest pl-0.5">Target Milestone</span>
                                                    <div className="text-[10px] font-black text-secondary-900 flex items-center gap-1.5 italic">
                                                        <Calendar size={12} className="text-secondary-300" />
                                                        <FormattedDate date={deal.expectedCloseDate} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[8px] font-black text-secondary-300 uppercase tracking-widest mb-1 pr-0.5">Value Matrix</span>
                                                    <div className="text-base font-black text-indigo-700 leading-none flex items-center italic">
                                                        <IndianRupee size={14} className="opacity-30 mr-0.5" />
                                                        {deal.value?.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    
                                    {stageDeals.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center py-20 text-center select-none opacity-20 group-hover/column:opacity-40 transition-all duration-1000">
                                            <div className="w-20 h-20 bg-secondary-100/50 rounded-[2rem] flex items-center justify-center mb-6 border border-secondary-200/50">
                                                 <Layers size={40} strokeWidth={1} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary-500 italic">No Active Signal</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Create Deal Modal */}
                <CRMModal
                    open={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    title="Initialize Opportunity Node"
                    subtitle="Register a fresh potential deal into the tactical operational pipeline matrix."
                >
                    <form onSubmit={handleCreateDeal} className="space-y-8 py-2">
                        <div className="bg-secondary-950 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                             <div className="absolute -right-4 -bottom-4 opacity-5 blur-sm rotate-12">
                                  <Briefcase size={140} className="text-white" />
                             </div>
                             <div className="space-y-2 relative z-10">
                                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-400 pl-1">Deal Designation (Title)</label>
                                  <input
                                      type="text" required
                                      className="input h-14 bg-white/5 border-white/10 text-white font-black text-sm uppercase tracking-tight focus:bg-white/10"
                                      value={newDeal.title}
                                      onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                                      placeholder="e.g. Q4 STRATEGIC LICENSE EXPANSION"
                                  />
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Target Identity Node</label>
                                <select
                                    required
                                    className="input h-14 bg-secondary-50 border-secondary-100 font-black text-xs uppercase tracking-widest italic pr-10"
                                    value={newDeal.customerId}
                                    onChange={(e) => setNewDeal({ ...newDeal, customerId: e.target.value })}
                                >
                                    <option value="">Select Target Context</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name.toUpperCase()} {l.organizationName ? `[${l.organizationName.toUpperCase()}]` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Financial Valuation (₹)</label>
                                <div className="relative group">
                                     <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                                         <IndianRupee size={18} />
                                     </div>
                                     <input
                                        type="number" required
                                        className="input pl-14 h-14 bg-secondary-50 border-secondary-100 font-black text-sm text-indigo-700"
                                        value={newDeal.value}
                                        onChange={(e) => setNewDeal({ ...newDeal, value: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Operational Stage</label>
                                <select
                                    className="input h-14 bg-secondary-50 border-secondary-100 font-black text-xs uppercase tracking-widest italic pr-10"
                                    value={newDeal.stage}
                                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                                >
                                    {STAGES.map(s => (
                                        <option key={s.id} value={s.id}>{s.label.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Target Milestone (Close Date)</label>
                                <div className="relative group">
                                     <div className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                                         <Calendar size={18} />
                                     </div>
                                     <input
                                         type="date"
                                         className="input pl-14 h-14 bg-secondary-50 border-secondary-100 font-black text-sm"
                                         value={newDeal.expectedCloseDate}
                                         onChange={(e) => setNewDeal({ ...newDeal, expectedCloseDate: e.target.value })}
                                     />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 px-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 pl-1">Deal Context (Metadata)</label>
                            <textarea
                                className="input font-medium text-xs p-5 min-h-[120px] resize-none bg-secondary-50 border-secondary-100 italic"
                                placeholder="Detail any strategic intelligence gathered regarding this opportunity..."
                                value={newDeal.notes}
                                onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-4 pt-10 border-t border-secondary-100/50">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-4 rounded-2xl border-2 border-secondary-200 text-[10px] font-black uppercase tracking-[0.2em] text-secondary-400 hover:bg-secondary-50 transition-all font-mono"
                            >
                                Terminate
                            </button>
                            <button
                                type="submit"
                                disabled={createLoading}
                                className="flex-1 bg-primary-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95 group/btn"
                            >
                                {createLoading ? 'Synchronizing...' : (
                                    <>
                                        Propagate Opportunity <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </CRMModal>
            </CRMPageShell>
        </CRMClientLayout>
    );
}

import { formatDistanceToNow } from 'date-fns';
