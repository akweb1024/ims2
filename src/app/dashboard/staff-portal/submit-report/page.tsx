'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Briefcase, Send, CheckCircle, Award, Settings, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubmitReportPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [savedReport, setSavedReport] = useState(false);

    // Form State - Simplified to narrative only
    const [commonData, setCommonData] = useState({
        title: '',
        content: '',
        hoursSpent: 0,
        date: new Date().toISOString().split('T')[0],
        selfRating: 5,
        meetingsText: ''
    });

    const [prodActivity, setProdActivity] = useState<any>(null);

    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
    const [scaledTaskValues, setScaledTaskValues] = useState<Record<string, number>>({});
    const [currentPoints, setCurrentPoints] = useState(0);

    // Auto-calculated metrics from tasks
    const [derivedMetrics, setDerivedMetrics] = useState({
        revenue: 0,
        calls: 0,
        emails: 0,
        whatsapp: 0,
        invoices: 0,
        tasksCount: 0
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);

            // Fetch Profile & Tasks
            fetch('/api/hr/profile/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(profile => {
                    if (profile) {
                        const depId = profile.department?.id || (u.departmentId);
                        const desId = profile.designationId;

                        const q = new URLSearchParams();
                        if (depId) q.append('departmentId', depId);
                        if (desId) q.append('designationId', desId);

                        fetch(`/api/hr/tasks?${q.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } })
                            .then(res => res.json())
                            .then(tasks => {
                                if (Array.isArray(tasks)) setAvailableTasks(tasks);
                            })
                            .catch(err => console.error("Error fetching tasks", err));
                    }
                });

            // Fetch today's attendance to calculate hours
            fetch('/api/hr/attendance', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    const today = new Date().toISOString().split('T')[0];
                    const record = data.find((a: any) => a.date.startsWith(today));
                    if (record && record.checkIn) {
                        const checkIn = new Date(record.checkIn);
                        const checkOut = record.checkOut ? new Date(record.checkOut) : new Date();
                        const diffMs = checkOut.getTime() - checkIn.getTime();
                        const hours = Math.round((diffMs / (1000 * 60 * 60)) * 2) / 2;
                        setCommonData(prev => ({ ...prev, hoursSpent: hours }));
                    }
                })
                .catch(err => console.error("Error fetching attendance", err));

            // Fetch production activity
            fetch('/api/production/my-activity', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    if (data.totalActions > 0) setProdActivity(data);
                })
                .catch(err => console.error("Error fetching activity", err));
        }
    }, []);

    // Calculate points and derive metrics from tasks
    useEffect(() => {
        let points = 0;
        let revenue = 0;
        let calls = 0;
        let emails = 0;
        let whatsapp = 0;
        let invoices = 0;

        availableTasks.forEach(t => {
            if (completedTaskIds.includes(t.id)) {
                // Calculate points
                if (t.calculationType === 'SCALED') {
                    const quantity = scaledTaskValues[t.id] || 0;
                    if (t.minThreshold && quantity < t.minThreshold) return;

                    const effQuantity = (t.maxThreshold && quantity > t.maxThreshold) ? t.maxThreshold : quantity;
                    points += effQuantity * (t.pointsPerUnit || 0);

                    // Derive metrics based on task title/description keywords
                    const titleLower = t.title.toLowerCase();
                    if (titleLower.includes('revenue') || titleLower.includes('sales')) {
                        revenue += quantity;
                    }
                    if (titleLower.includes('call')) {
                        calls += quantity;
                    }
                    if (titleLower.includes('email') || titleLower.includes('mail')) {
                        emails += quantity;
                    }
                    if (titleLower.includes('whatsapp') || titleLower.includes('chat')) {
                        whatsapp += quantity;
                    }
                    if (titleLower.includes('invoice')) {
                        invoices += quantity;
                    }
                } else {
                    points += t.points;
                }
            }
        });

        setCurrentPoints(Math.floor(points));
        setDerivedMetrics({
            revenue,
            calls,
            emails,
            whatsapp,
            invoices,
            tasksCount: completedTaskIds.length
        });
    }, [completedTaskIds, availableTasks, scaledTaskValues]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');

            const payload = {
                ...commonData,
                category: 'TASK_BASED',
                userRole: user?.role,
                revenueGenerated: derivedMetrics.revenue,
                tasksCompleted: derivedMetrics.tasksCount,
                completedTaskIds,
                taskQuantities: scaledTaskValues,
                chatsHandled: derivedMetrics.whatsapp,
                followUpsCompleted: derivedMetrics.calls,
                metrics: {
                    derived: derivedMetrics,
                    meetingsText: commonData.meetingsText
                }
            };

            const res = await fetch('/api/hr/work-reports', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSavedReport(true);
                setTimeout(() => router.push('/dashboard/staff-portal'), 2000);
            } else {
                alert('Failed to submit report');
            }
        } catch (error) {
            console.error(error);
            alert('Error submitting report');
        } finally {
            setLoading(false);
        }
    };

    if (savedReport) {
        return (
            <DashboardLayout userRole={user?.role}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="w-24 h-24 bg-success-100 text-success-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle size={48} />
                    </div>
                    <h1 className="text-3xl font-black text-secondary-900 mb-2">Report Submitted!</h1>
                    <p className="text-secondary-500">Your work report has been logged successfully.</p>
                    {currentPoints > 0 && (
                        <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <p className="text-sm font-bold text-primary-800">🎉 Points Submitted (Pending Approval)</p>
                            <p className="text-4xl font-black text-primary-600">+{currentPoints}</p>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Submit Work Report</h1>
                        <p className="text-secondary-500">Track your daily impact through task completion</p>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-lg">
                        <span className="text-xs font-bold uppercase tracking-wider block">Today's Score</span>
                        <div className="text-3xl font-black">{currentPoints} <span className="text-sm">pts</span></div>
                    </div>
                </div>

                {/* Auto-Calculated Metrics Display */}
                {derivedMetrics.tasksCount > 0 && (
                    <div className="card-premium p-6 bg-gradient-to-br from-primary-50 to-indigo-50 border-t-4 border-indigo-500">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-indigo-600" size={24} />
                            <h3 className="font-bold text-lg text-secondary-900">Auto-Calculated Metrics</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {derivedMetrics.revenue > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Revenue</p>
                                    <p className="text-2xl font-black text-success-600">₹{derivedMetrics.revenue.toLocaleString()}</p>
                                </div>
                            )}
                            {derivedMetrics.calls > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Calls</p>
                                    <p className="text-2xl font-black text-primary-600">{derivedMetrics.calls}</p>
                                </div>
                            )}
                            {derivedMetrics.emails > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Emails</p>
                                    <p className="text-2xl font-black text-indigo-600">{derivedMetrics.emails}</p>
                                </div>
                            )}
                            {derivedMetrics.invoices > 0 && (
                                <div className="bg-white/80 p-4 rounded-xl text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase">Invoices</p>
                                    <p className="text-2xl font-black text-warning-600">{derivedMetrics.invoices}</p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-indigo-600 mt-4 italic text-center">✨ Metrics automatically calculated from your task checklist</p>
                    </div>
                )}

                {/* Gamified Task Checklist */}
                {availableTasks.length > 0 && (
                    <div className="card-premium p-6 border-t-4 border-indigo-500">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-secondary-900">
                                <Award size={24} className="text-indigo-600" />
                                Daily Task Checklist
                            </h3>
                            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Completed</span>
                                <div className="text-2xl font-black text-indigo-700">{completedTaskIds.length}/{availableTasks.length}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={(e) => {
                                        if ((e.target as HTMLElement).tagName === 'INPUT') return;

                                        if (completedTaskIds.includes(task.id)) {
                                            setCompletedTaskIds(prev => prev.filter(id => id !== task.id));
                                        } else {
                                            setCompletedTaskIds(prev => [...prev, task.id]);
                                        }
                                    }}
                                    className={`
                                        group relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                                        ${completedTaskIds.includes(task.id)
                                            ? 'bg-indigo-50/50 border-indigo-500 shadow-md'
                                            : 'bg-white border-secondary-100 hover:border-indigo-200 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className={`
                                            w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${completedTaskIds.includes(task.id)
                                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                                : 'border-secondary-300 group-hover:border-indigo-400'
                                            }
                                        `}>
                                            {completedTaskIds.includes(task.id) && <CheckCircle size={14} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-bold text-sm leading-tight mb-1 ${completedTaskIds.includes(task.id) ? 'text-indigo-900' : 'text-secondary-700'}`}>
                                                    {task.title}
                                                </h4>
                                                {task.calculationType === 'SCALED' ? (
                                                    <span className="badge bg-purple-100 text-purple-700 text-[10px] font-black">
                                                        {task.pointsPerUnit} pts/unit
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-indigo-100 text-indigo-700 text-[10px] font-black">{task.points} pts</span>
                                                )}
                                            </div>
                                            {task.description && <p className="text-xs text-secondary-500 leading-relaxed mb-2">{task.description}</p>}

                                            {task.calculationType === 'SCALED' && (
                                                <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="number"
                                                        className="input py-1 h-8 text-sm w-24"
                                                        placeholder="Qty"
                                                        min="0"
                                                        value={scaledTaskValues[task.id] || ''}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setScaledTaskValues(prev => ({ ...prev, [task.id]: val }));

                                                            if (val > 0 && !completedTaskIds.includes(task.id)) {
                                                                setCompletedTaskIds(prev => [...prev, task.id]);
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs text-secondary-400">
                                                        {task.minThreshold > 1 ? `(Min: ${task.minThreshold})` : 'units'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content - Left Col */}
                    <div className="md:col-span-2 space-y-6">

                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <Briefcase size={20} className="text-primary-600" />
                                Work Summary
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="label">Focus Title</label>
                                    <input required className="input" placeholder="e.g. Client Outreach & Follow-ups"
                                        value={commonData.title} onChange={e => setCommonData({ ...commonData, title: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Date</label>
                                        <input type="date" required className="input"
                                            value={commonData.date} onChange={e => setCommonData({ ...commonData, date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Hours Spent</label>
                                        <input type="number" step="0.5" required className="input"
                                            value={commonData.hoursSpent} onChange={e => setCommonData({ ...commonData, hoursSpent: parseFloat(e.target.value) })} />
                                    </div>
                                </div>

                                {prodActivity && (
                                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 animate-in fade-in slide-in-from-bottom duration-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-black text-primary-700 uppercase tracking-wider flex items-center gap-2">
                                                <Settings size={14} className="animate-spin-slow" />
                                                Synced Publication Work
                                            </h4>
                                            <span className="badge badge-primary">{prodActivity.totalActions} Actions</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/50 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Manuscripts</p>
                                                <p className="text-lg font-black text-primary-600">{prodActivity.articles}</p>
                                            </div>
                                            <div className="bg-white/50 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Issues</p>
                                                <p className="text-lg font-black text-primary-600">{prodActivity.issues}</p>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-primary-400 mt-2 italic text-center">These activities will be automatically appended to your report summary.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="label">Detailed Content</label>
                                    <textarea required rows={5} className="input" placeholder="Describe your activities..."
                                        value={commonData.content} onChange={e => setCommonData({ ...commonData, content: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Meetings Section */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <Users size={20} className="text-indigo-600" />
                                Key Meetings (Optional)
                            </h3>
                            <textarea className="input" rows={3} placeholder='e.g., Meeting with Client X at 10AM (Result: Deal Closed)'
                                value={commonData.meetingsText} onChange={e => setCommonData({ ...commonData, meetingsText: e.target.value })} />
                            <p className="text-[10px] text-secondary-400 mt-1">Format: Time, With Whom, Result</p>
                        </div>
                    </div>

                    {/* Right Col - Self Rating & Submit */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 border-t-4 border-warning-500">
                            <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">
                                <Award size={16} className="text-warning-600" />
                                Self Rating
                            </h3>
                            <div className="space-y-3">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    className="w-full"
                                    value={commonData.selfRating}
                                    onChange={e => setCommonData({ ...commonData, selfRating: parseInt(e.target.value) })}
                                />
                                <div className="flex justify-between text-xs font-bold text-secondary-400">
                                    <span>Poor</span>
                                    <span className="text-2xl text-warning-600">{commonData.selfRating}/10</span>
                                    <span>Excellent</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-lg font-black shadow-xl hover:shadow-primary-200 transition-all">
                            {loading ? 'Submitting...' : 'Submit Report'} <Send size={18} className="inline ml-2" />
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
