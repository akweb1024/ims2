'use client';

import { useState, useEffect } from 'react';
import { useEmployees, useKPIs, useKPIMutations, useHRInsights, usePerformanceReviews, usePerformanceReviewMutation } from '@/hooks/useHR';
import PerformanceReviewModal from './PerformanceReviewModal';
import {
    TrendingUp, Target, Award, AlertCircle,
    Plus, Search, Filter, MoreVertical,
    CheckCircle2, Clock, BarChart3, BrainCircuit,
    ArrowUpRight, ArrowDownRight
} from 'lucide-react';

export default function PerformanceAnalytics() {
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const { data: employees } = useEmployees();
    const { data: kpis, isLoading: kpisLoading } = useKPIs(selectedEmployee || undefined);
    const { save: saveKPI, remove: removeKPI } = useKPIMutations();
    const { data: aiInsights } = useHRInsights('productivity');

    // Performance Reviews
    const { data: reviews, isLoading: reviewsLoading } = usePerformanceReviews(selectedEmployee || undefined);
    const reviewMutation = usePerformanceReviewMutation();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'kpi' | 'reviews'>('kpi');
    const [feedback360, setFeedback360] = useState<any>(null);

    // Fetch 360 Feedback on employee hit
    useEffect(() => {
        if (!selectedEmployee) return;
        fetch(`/api/hr/feedback?employeeId=${selectedEmployee}`)
            .then(res => res.json())
            .then(data => setFeedback360(data))
            .catch(console.error);
    }, [selectedEmployee]);

    const [showKPIModal, setShowKPIModal] = useState(false);
    const [newKPI, setNewKPI] = useState({
        title: '',
        target: '',
        unit: '',
        period: 'JAN-2024',
        category: 'GENERAL'
    });

    const handleSaveKPI = async () => {
        if (!selectedEmployee) return;
        try {
            await saveKPI.mutateAsync({
                ...newKPI,
                employeeId: selectedEmployee
            });
            setShowKPIModal(false);
            setNewKPI({ title: '', target: '', unit: '', period: 'JAN-2024', category: 'GENERAL' });
        } catch (err) {
            alert('Failed to save KPI');
        }
    };

    const handleSaveReview = async (data: any) => {
        if (!selectedEmployee) return;
        try {
            await reviewMutation.mutateAsync({
                employeeId: selectedEmployee,
                ...data
            });
            setShowReviewModal(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save review');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* AI Strategic Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-premium p-8 bg-secondary-900 border-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-500/20 rounded-lg">
                                <BrainCircuit className="text-primary-400" size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-widest text-sm">AI Performance Engine</h3>
                        </div>
                        <div className="space-y-4">
                            {aiInsights?.summaries?.map((s: string, idx: number) => (
                                <div key={idx} className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl border-l-4 border-l-primary-500">
                                    <div className="text-primary-400 font-bold shrink-0">0{idx + 1}</div>
                                    <p className="text-secondary-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-black">$1</b>') }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card-premium p-8 border-t-4 border-warning-500">
                    <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <AlertCircle size={14} className="text-warning-500" /> Critical Attention Areas
                    </h3>
                    <div className="space-y-4">
                        {aiInsights?.warnings?.map((w: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-2xl bg-warning-50 border border-warning-100">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-secondary-900 text-sm">{w.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${w.severity === 'critical' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'}`}>
                                        {w.severity}
                                    </span>
                                </div>
                                <p className="text-[11px] text-secondary-620 leading-tight">{w.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Employee Selector */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card-premium p-6 sticky top-24">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="w-full pl-12 pr-4 py-3 bg-secondary-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                            {employees?.map((emp: any) => (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp.id)}
                                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${selectedEmployee === emp.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'hover:bg-secondary-50 text-secondary-600'}`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${selectedEmployee === emp.id ? 'bg-white/20' : 'bg-secondary-100'}`}>
                                        {(emp.user?.name || emp.user?.email)[0].toUpperCase()}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <div className="font-bold text-sm truncate">{emp.user?.name || emp.user?.email}</div>
                                        <div className={`text-[10px] uppercase font-black truncate opacity-70`}>{emp.designation || 'Staff'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* KPI Workspace */}
                <div className="lg:col-span-3 space-y-8">
                    {!selectedEmployee ? (
                        <div className="py-40 text-center card-premium border-dashed border-4 border-secondary-100 bg-secondary-50/20">
                            <Target size={64} className="mx-auto text-secondary-200 mb-6" />
                            <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Select an employee to manage KPIs</h3>
                            <p className="text-secondary-500 font-medium mt-2">Track objective milestones and performance metrics.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Performance Management</h3>
                                    <p className="text-secondary-500 font-medium">Manage KPIs and Conduct Reviews</p>
                                </div>
                                <div className="flex bg-secondary-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setActiveTab('kpi')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'kpi' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-900'}`}
                                    >
                                        KPI Board
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('reviews')}
                                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'reviews' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-900'}`}
                                    >
                                        Reviews ({reviews?.length || 0})
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'kpi' && (
                                <div className="space-y-6">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowKPIModal(true)}
                                            className="btn bg-secondary-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl"
                                        >
                                            <Plus size={16} /> Define New KPI
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {kpisLoading ? (
                                            <div className="col-span-full py-20 text-center font-bold text-secondary-400">Loading indicators...</div>
                                        ) : kpis?.map((kpi: any) => {
                                            const percentage = (kpi.current / kpi.target) * 100;
                                            return (
                                                <div key={kpi.id} className="card-premium p-8 relative group">
                                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => removeKPI.mutate(kpi.id)} className="p-2 text-danger-400 hover:text-danger-600 transition-colors">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                                            <BarChart3 size={20} />
                                                        </div>
                                                        <h4 className="font-black text-secondary-900 text-lg">{kpi.title}</h4>
                                                    </div>

                                                    <div className="flex justify-between items-end mb-2">
                                                        <div className="text-3xl font-black text-secondary-900">
                                                            {kpi.current.toLocaleString()} <span className="text-xs text-secondary-400 uppercase font-black">{kpi.unit}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`flex items-center gap-1 font-black text-sm ${percentage >= 100 ? 'text-success-600' : 'text-primary-600'}`}>
                                                                {percentage.toFixed(0)}% <TrendingUp size={14} />
                                                            </div>
                                                            <div className="text-[10px] font-bold text-secondary-400 uppercase">of {kpi.target.toLocaleString()} {kpi.unit}</div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-3 bg-secondary-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${percentage >= 100 ? 'bg-success-500' : 'bg-primary-500'}`}
                                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="mt-6 pt-6 border-t border-secondary-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                        <div className="flex items-center gap-2 text-secondary-400">
                                                            <Filter size={12} /> {kpi.category}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-secondary-400">
                                                            <Clock size={12} /> {kpi.period}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {kpis?.length === 0 && (
                                            <div className="col-span-full py-20 text-center card-premium border-dashed border-2 border-secondary-100">
                                                <p className="font-bold text-secondary-400">No KPIs defined for this period.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'reviews' && (
                                <div className="space-y-6">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowReviewModal(true)}
                                            className="btn bg-warning-500 text-white px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-warning-600 transition-all shadow-xl"
                                        >
                                            <Plus size={16} /> New Review
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {reviewsLoading ? (
                                            <div className="text-center py-10 text-secondary-400 font-bold italic">Loading reviews...</div>
                                        ) : reviews?.length === 0 ? (
                                            <div className="text-center py-20 card-premium border-dashed border-2 border-secondary-100">
                                                <p className="font-bold text-secondary-400">No performance reviews recorded.</p>
                                            </div>
                                        ) : reviews?.map((review: any) => (
                                            <div key={review.id} className="card-premium p-6 hover:shadow-lg transition-all border border-secondary-100">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center font-bold text-xs text-secondary-600">
                                                                {(review.reviewer?.name || 'U')[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-secondary-900 text-sm">{review.reviewer?.name || 'Unknown'}</p>
                                                                <p className="text-[10px] text-secondary-400 uppercase tracking-wide">{new Date(review.date).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <span key={star} className={`text-lg ${star <= review.rating ? 'text-warning-500' : 'text-secondary-100'}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-secondary-600 text-sm leading-relaxed bg-secondary-50/50 p-4 rounded-xl border border-secondary-50 italic">
                                                    &ldquo;{review.feedback}&rdquo;
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 360-Degree Feedback Integration */}
                                    {feedback360 && (
                                        <div className="mt-8 pt-8 border-t border-secondary-100/50">
                                            <h4 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                                <BrainCircuit size={18} className="text-primary-500" />
                                                360° Anonymous & Peer Intel
                                            </h4>
                                            
                                            {feedback360.peerReviews?.length > 0 && (
                                                <div className="mb-6">
                                                    <h5 className="text-[10px] uppercase font-black tracking-widest text-secondary-400 mb-2">Peer Reviews</h5>
                                                    <div className="space-y-3">
                                                    {feedback360.peerReviews.map((peer: any) => (
                                                        <div key={peer.id} className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex gap-4">
                                                             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-primary-600 shadow-sm shrink-0">
                                                                {(peer.peer?.name || 'P')[0]}
                                                            </div>
                                                            <div>
                                                                <div className="flex gap-1 mb-1 text-primary-500 text-sm">
                                                                     {[1, 2, 3, 4, 5].map(s => <span key={s} className={s <= peer.rating ? 'opacity-100' : 'opacity-30'}>★</span>)}
                                                                </div>
                                                                <p className="text-secondary-700 text-sm italic">&ldquo;{peer.feedback}&rdquo;</p>
                                                                <p className="text-[10px] font-bold text-secondary-400 mt-2 uppercase">{peer.peer?.name || 'Unknown Peer'} • {new Date(peer.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    </div>
                                                </div>
                                            )}

                                            {feedback360.anonymousFeedback?.length > 0 && (
                                                <div>
                                                    <h5 className="text-[10px] uppercase font-black tracking-widest text-secondary-400 mb-2">Anonymous Drops</h5>
                                                    <div className="space-y-3">
                                                    {feedback360.anonymousFeedback.map((anon: any) => (
                                                        <div key={anon.id} className="p-4 bg-secondary-100 rounded-xl flex gap-4 border border-secondary-200">
                                                            <div className="text-xl">🕵️‍♀️</div>
                                                            <div>
                                                                 <p className="text-secondary-800 text-sm italic font-medium leading-relaxed">&ldquo;{anon.feedback}&rdquo;</p>
                                                                 <p className="text-[10px] font-black text-secondary-400 mt-2 uppercase">{anon.category} • {new Date(anon.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {(!feedback360.peerReviews?.length && !feedback360.anonymousFeedback?.length) && (
                                                 <div className="text-center p-6 bg-secondary-50 rounded-2xl border border-secondary-100/50">
                                                      <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">No 360 Feedback Recorded Yet.</p>
                                                 </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create KPI Modal */}
            {
                showKPIModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                                <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">Define Strategic KPI</h3>
                                <button onClick={() => setShowKPIModal(false)} className="text-secondary-400 hover:text-secondary-900">×</button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">KPI Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g. Sales Targeted, Support Tickets..."
                                        value={newKPI.title}
                                        onChange={(e) => setNewKPI({ ...newKPI, title: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Target Value</label>
                                        <input
                                            type="number"
                                            className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                            placeholder="10000"
                                            value={newKPI.target}
                                            onChange={(e) => setNewKPI({ ...newKPI, target: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Unit</label>
                                        <input
                                            type="text"
                                            className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                            placeholder="INR, Units, %"
                                            value={newKPI.unit}
                                            onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Category</label>
                                        <select
                                            className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                            value={newKPI.category}
                                            onChange={(e) => setNewKPI({ ...newKPI, category: e.target.value })}
                                        >
                                            <option value="GENERAL">General</option>
                                            <option value="SALES">Sales</option>
                                            <option value="SUPPORT">Support</option>
                                            <option value="TECHNICAL">Technical</option>
                                            <option value="QUALITY">Quality</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Period</label>
                                        <input
                                            type="text"
                                            className="w-full bg-secondary-50 border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-primary-500"
                                            placeholder="JAN-2024"
                                            value={newKPI.period}
                                            onChange={(e) => setNewKPI({ ...newKPI, period: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveKPI}
                                    className="w-full btn bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary-100 transition-all mt-4"
                                >
                                    Activate Performance Metric
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <PerformanceReviewModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSave={handleSaveReview}
            />
        </div >
    );
}
