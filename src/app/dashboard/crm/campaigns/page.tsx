'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Megaphone, Mail, Users, Filter, Plus, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';

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
        const data = Object.fromEntries(new FormData(form));

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
                alert('Failed to launch campaign.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 text-secondary-500 font-bold">Loading CRM Matrix...</div>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                            <Megaphone className="text-primary-500" size={32} /> Automations & Sequences
                        </h1>
                        <p className="text-secondary-500 mt-1">Design, target, and launch automated drip campaigns.</p>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="btn bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 shadow-lg shadow-primary-200">
                        <Plus size={20} /> Create Campaign
                    </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-dashboard p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 bg-white/10 rounded-full w-32 h-32 group-hover:scale-150 transition-transform duration-700" />
                        <h3 className="text-white/80 text-[10px] font-black uppercase tracking-widest relative z-10 mb-2">Active Sequences</h3>
                        <div className="flex items-center gap-3 relative z-10">
                            <PlayCircle size={32} className="opacity-80" />
                            <span className="text-4xl font-black">{campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'SCHEDULED').length}</span>
                        </div>
                    </div>
                    
                    <div className="card-dashboard p-6 relative overflow-hidden group border border-secondary-100">
                        <h3 className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Targeted Audiences</h3>
                        <div className="flex items-center gap-3 relative z-10">
                            <Users size={32} className="text-secondary-300" />
                            <span className="text-4xl font-black text-secondary-900">{audiences.length}</span>
                        </div>
                    </div>

                    <div className="card-dashboard p-6 relative overflow-hidden group border border-secondary-100">
                        <h3 className="text-secondary-400 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">Email Templates</h3>
                        <div className="flex items-center gap-3 relative z-10">
                            <Mail size={32} className="text-secondary-300" />
                            <span className="text-4xl font-black text-secondary-900">{templates.length}</span>
                        </div>
                    </div>
                </div>

                {isCreating && (
                    <div className="fixed inset-0 z-50 bg-secondary-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                            <div className="p-8 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                                <h3 className="text-xl font-black text-secondary-900 tracking-tight">Configure Automations</h3>
                                <button onClick={() => setIsCreating(false)} className="text-secondary-400 hover:text-danger-500 transition-colors">✕</button>
                            </div>
                            <form onSubmit={handleCreate} className="p-8 space-y-6 bg-white">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Internal Campaign Name</label>
                                    <input name="name" className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500" placeholder="Q4 Lead Generation Drip" required />
                                </div>
                                <div className="space-y-4">
                                     <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Sequence Targets</label>
                                     <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <p className="text-xs font-bold text-secondary-900 mb-2">Target Audience</p>
                                              <select name="audienceId" className="w-full bg-secondary-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" required>
                                                  <option value="">Select Audience List...</option>
                                                  {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                              </select>
                                          </div>
                                          <div>
                                              <p className="text-xs font-bold text-secondary-900 mb-2">Base Template</p>
                                              <select name="templateId" className="w-full bg-secondary-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" required>
                                                  <option value="">Select HTML Template...</option>
                                                  {templates.map(t => <option key={t.id} value={t.id}>{t.name} (Sub: {t.subject})</option>)}
                                              </select>
                                          </div>
                                     </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                         <p className="text-xs font-bold text-secondary-900 mb-2">Start Date</p>
                                         <input type="date" name="startDate" className="w-full bg-secondary-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" required />
                                    </div>
                                    <div>
                                         <p className="text-xs font-bold text-secondary-900 mb-2">End Date (Optional)</p>
                                         <input type="date" name="endDate" className="w-full bg-secondary-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500" />
                                    </div>
                                </div>
                                
                                <div className="pt-6">
                                    <button type="submit" className="w-full btn bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary-200">
                                        Activate Automation
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Automation Timelines Grid */}
                <div className="space-y-4 mt-8">
                     <h3 className="text-lg font-black text-secondary-900 tracking-tight">Active Masterlines</h3>
                     {campaigns.length === 0 ? (
                         <div className="p-16 text-center border-2 border-dashed border-secondary-200 rounded-3xl bg-secondary-50/50">
                             <Megaphone className="mx-auto text-secondary-300 mb-4" size={48} />
                             <p className="text-secondary-500 font-bold">No active marketing sequences mapped for this tenant.</p>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {campaigns.map(campaign => (
                                 <div key={campaign.id} className="card-dashboard p-6 border border-secondary-100 hover:border-primary-200 transition-all hover:shadow-xl hover:-translate-y-1">
                                      <div className="flex justify-between items-start mb-4">
                                          <h4 className="font-bold text-secondary-900 leading-tight">{campaign.name}</h4>
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                              campaign.status === 'ACTIVE' ? 'bg-success-100 text-success-700' :
                                              campaign.status === 'DRAFT' ? 'bg-secondary-100 text-secondary-600' :
                                              'bg-primary-100 text-primary-700'
                                          }`}>
                                              {campaign.status}
                                          </span>
                                      </div>
                                      
                                      <div className="space-y-3 mt-6">
                                          <div className="flex items-center gap-3 text-sm">
                                              <div className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center shrink-0">
                                                  <Mail size={14} className="text-secondary-500" />
                                              </div>
                                              <div className="overflow-hidden">
                                                  <p className="text-[10px] uppercase font-black tracking-widest text-secondary-400">Template Engaged</p>
                                                  <p className="font-medium text-secondary-900 truncate">{campaign.template?.name || 'Manual HTML'}</p>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-3 text-sm">
                                              <div className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center shrink-0">
                                                  <Users size={14} className="text-secondary-500" />
                                              </div>
                                              <div>
                                                  <p className="text-[10px] uppercase font-black tracking-widest text-secondary-400">Target Audience</p>
                                                  <p className="font-medium text-secondary-900">{campaign.audience?.name || 'All Customers'}</p>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="mt-6 pt-6 border-t border-secondary-50 flex items-center justify-between">
                                           <div className="flex items-center gap-2 text-xs font-bold text-secondary-500">
                                               <Clock size={14} />
                                               {new Date(campaign.createdAt).toLocaleDateString()}
                                           </div>
                                           <button className="text-primary-600 hover:text-primary-700 text-xs font-black uppercase tracking-widest">
                                               View Report →
                                           </button>
                                      </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>

            </div>
        </DashboardLayout>
    );
}
