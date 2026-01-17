'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Briefcase, Send, DollarSign, Mail, Phone, FileText, CheckCircle, Video, Award, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubmitReportPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [savedReport, setSavedReport] = useState(false);

    // Form State
    const [template, setTemplate] = useState('GENERAL');
    const [commonData, setCommonData] = useState({
        title: '',
        content: '',
        hoursSpent: 0,
        date: new Date().toISOString().split('T')[0],
        selfRating: 5
    });

    // Dynamic Metrics State
    const [metrics, setMetrics] = useState<any>({
        revenue: {},
        communication: { mails: 0, calls: 0, whatsapp: 0 },
        finance: { invoice: 0, proforma: 0 },
        sales: { copiesSold: 0 },
        content: { posters: 0, videos: 0, mails: 0, courses: 0, workshops: 0 },
        distribution: { recordingShare: 0, programShare: 0, certificateShare: 0 },
        formatting: { paperFormatting: 0, correctionCount: 0 }
    });

    const [prodActivity, setProdActivity] = useState<any>(null);

    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
    const [scaledTaskValues, setScaledTaskValues] = useState<Record<string, number>>({});
    const [currentPoints, setCurrentPoints] = useState(0);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);

            // Auto-select template based on role
            if (u.role === 'EXECUTIVE') setTemplate('SALES');
            else if (u.role === 'EDITOR') setTemplate('PUBLICATION');
            else if (u.role === 'HR_MANAGER') setTemplate('GENERAL');
            else if (u.department?.name?.toLowerCase().includes('publication')) setTemplate('PUBLICATION');
            else setTemplate('GENERAL');

            // Fetch Profile & Tasks
            fetch('/api/hr/profile/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(profile => {
                    if (profile) {
                        const query = new URLSearchParams({
                            departmentId: profile.department?.id || 'ALL',
                            designationId: profile.designation?.id || 'ALL'
                        });
                        // Fallback to fetch all active tasks if specific filters miss? Or just try specific first.
                        // Let's rely on api to handle 'ALL' or specific IDs.
                        // Actually the API expects IDs. 
                        // If department is nested in profile check structure.
                        // profile.department is likely an object {id, name}. 
                        const depId = profile.department?.id || (u.departmentId);
                        const desId = profile.designationId; // Profile usually has designationId directly too

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
                        const hours = Math.round((diffMs / (1000 * 60 * 60)) * 2) / 2; // Round to nearest 0.5
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

    useEffect(() => {
        const points = availableTasks.reduce((acc, t) => {
            if (completedTaskIds.includes(t.id)) {
                if (t.calculationType === 'SCALED') {
                    const quantity = scaledTaskValues[t.id] || 0;
                    if (t.minThreshold && quantity < t.minThreshold) return acc;

                    let pts = quantity * (t.pointsPerUnit || 0);
                    if (t.maxThreshold && quantity > t.maxThreshold) {
                        // Cap points or Cap units? Usually limits quantity considered.
                        // But requirements say "10 for 150000 like this". 
                        // "maxThreshold" in our schema was "100 calls (optional cap)".
                        // Let's assume max thresholds caps the 'quantity' used for calculation.
                        // Or if it simply means max points? Let's cap effectively calculated points?
                        // "1 point for each 10 calls" -> pointsPerUnit = 0.1
                        // "minThreshold" -> 10?
                        // Let's stick to unit capping.
                        pts = t.maxThreshold * (t.pointsPerUnit || 0);
                    }
                    // Actually if quantity > maxThreshold, we just take maxThreshold * perUnit? 
                    // Wait, if I do 200 calls and cap is 100, I get points for 100.
                    const effQuantity = (t.maxThreshold && quantity > t.maxThreshold) ? t.maxThreshold : quantity;
                    pts = effQuantity * (t.pointsPerUnit || 0);

                    return acc + pts;
                } else {
                    return acc + t.points;
                }
            }
            return acc;
        }, 0);
        setCurrentPoints(Math.floor(points));
    }, [completedTaskIds, availableTasks, scaledTaskValues]);

    const handleMetricChange = (category: string, field: string, value: any) => {
        setMetrics((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: parseInt(value) || 0
            }
        }));
    };

    const calculateTotalRevenue = () => {
        return Object.values(metrics.revenue).reduce((acc: number, curr: any) => acc + (parseInt(curr) || 0), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const totalRevenue = calculateTotalRevenue();

            // Flatten generic counts for the main table to keep backward compatibility
            const tasksCompleted =
                (metrics.sales?.copiesSold || 0) +
                (metrics.content?.courses || 0) +
                (metrics.content?.workshops || 0);

            const payload = {
                ...commonData,
                category: template,
                userRole: user?.role, // Auto reflect from profile
                revenueGenerated: totalRevenue,
                tasksCompleted: tasksCompleted > 0 ? tasksCompleted : completedTaskIds.length,
                completedTaskIds,
                taskQuantities: scaledTaskValues,
                chatsHandled: metrics.communication.whatsapp,
                followUpsCompleted: metrics.communication.calls,
                metrics: {
                    template,
                    ...metrics
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
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Submit Work Report</h1>
                        <p className="text-secondary-500">Track your daily impact and achievements</p>
                    </div>
                    <select
                        className="input w-48 font-bold uppercase text-sm"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                    >
                        <option value="GENERAL">General Staff</option>
                        <option value="SALES">Executive</option>
                        <option value="PUBLICATION">Publication Exec</option>
                        <option value="PROGRAM">Program Executive</option>
                        <option value="FORMATTING">Formatting Team</option>
                    </select>
                </div>

                {/* Gamified Task Checklist */}
                {availableTasks.length > 0 && (
                    <div className="card-premium p-6 border-t-4 border-indigo-500">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-secondary-900">
                                <Award size={24} className="text-indigo-600" />
                                Daily Task Checklist
                            </h3>
                            <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Potential Score</span>
                                <div className="text-2xl font-black text-indigo-700">{currentPoints} <span className="text-sm">pts</span></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={(e) => {
                                        // Prevent toggling when clicking input
                                        if ((e.target as HTMLElement).tagName === 'INPUT') return;

                                        if (task.calculationType === 'SCALED') {
                                            // Allow toggling if they want to explicitly uncheck, 
                                            // but usually input > 0 auto-checks.
                                            // Let's allow manual uncheck to override
                                        }

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

                                                            // Auto select if > 0, deselect if 0?
                                                            // Maybe better to just let them check it. 
                                                            // But usually typing implies active.
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

                        {/* Meetings Section (All Roles) */}
                        <div className="card-premium p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-secondary-900">
                                <CheckCircle size={20} className="text-indigo-600" />
                                Key Meetings
                            </h3>
                            <textarea className="input" rows={3} placeholder='JSON style or list: Meeting with X at 10AM (Result: Deal Closed)'
                                value={metrics.meetingsText} onChange={e => setMetrics({ ...metrics, meetingsText: e.target.value })} />
                            <p className="text-[10px] text-secondary-400 mt-1">Format: Time, With Whom, Result</p>
                        </div>
                    </div>

                    {/* Right Col - Role Specific Metrics */}
                    <div className="space-y-6">
                        {/* Revenue Block */}
                        <div className="card-premium p-6 border-t-4 border-success-500">
                            <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">
                                <DollarSign size={16} className="text-success-600" />
                                Revenue
                            </h3>
                            <div className="space-y-3">
                                {template === 'SALES' && (
                                    <>
                                        <div><label className="text-xs font-bold text-secondary-500">New Sales (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'new', e.target.value)} /></div>
                                        <div><label className="text-xs font-bold text-secondary-500">Renewals (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'renewal', e.target.value)} /></div>
                                    </>
                                )}
                                {template === 'PUBLICATION' && (
                                    <>
                                        <div><label className="text-xs font-bold text-secondary-500">DOI (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'doi', e.target.value)} /></div>
                                        <div><label className="text-xs font-bold text-secondary-500">APC (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'apc', e.target.value)} /></div>
                                        <div><label className="text-xs font-bold text-secondary-500">Hardcopy (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'hardcopy', e.target.value)} /></div>
                                    </>
                                )}
                                {template === 'PROGRAM' && (
                                    <>
                                        <div><label className="text-xs font-bold text-secondary-500">Workshops (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'workshop', e.target.value)} /></div>
                                        <div><label className="text-xs font-bold text-secondary-500">Programs (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'program', e.target.value)} /></div>
                                    </>
                                )}
                                {template === 'GENERAL' && (
                                    <div><label className="text-xs font-bold text-secondary-500">Total Revenue (₹)</label><input type="number" className="input h-10" onChange={e => handleMetricChange('revenue', 'total', e.target.value)} /></div>
                                )}
                            </div>
                        </div>

                        {/* Communication Block */}
                        <div className="card-premium p-6 border-t-4 border-primary-500">
                            <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">
                                <Phone size={16} className="text-primary-600" />
                                Communication
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div><label className="text-[10px] font-bold text-secondary-500 text-center block">Calls</label><input type="number" className="input h-8 text-center p-0" onChange={e => handleMetricChange('communication', 'calls', e.target.value)} /></div>
                                <div><label className="text-[10px] font-bold text-secondary-500 text-center block">Mails</label><input type="number" className="input h-8 text-center p-0" onChange={e => handleMetricChange('communication', 'mails', e.target.value)} /></div>
                                <div><label className="text-[10px] font-bold text-secondary-500 text-center block">WApp</label><input type="number" className="input h-8 text-center p-0" onChange={e => handleMetricChange('communication', 'whatsapp', e.target.value)} /></div>
                            </div>
                        </div>

                        {/* Finance Block */}
                        <div className="card-premium p-6 border-t-4 border-warning-500">
                            <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">
                                <FileText size={16} className="text-warning-600" />
                                Invoices Raised
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[10px] font-bold text-secondary-500 block">Proforma</label><input type="number" className="input h-8" onChange={e => handleMetricChange('finance', 'proforma', e.target.value)} /></div>
                                <div><label className="text-[10px] font-bold text-secondary-500 block">Final Inv</label><input type="number" className="input h-8" onChange={e => handleMetricChange('finance', 'invoice', e.target.value)} /></div>
                            </div>
                        </div>

                        {/* Role Specific Extras */}
                        {template === 'SALES' && (
                            <div className="card-premium p-6 border-t-4 border-rose-500">
                                <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">Sales Stats</h3>
                                <div><label className="text-xs font-bold text-secondary-500">Copies Sold</label><input type="number" className="input h-10" onChange={e => handleMetricChange('sales', 'copiesSold', e.target.value)} /></div>
                            </div>
                        )}

                        {template === 'PROGRAM' && (
                            <div className="card-premium p-6 border-t-4 border-purple-500">
                                <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">Creation & Dist</h3>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Posters" type="number" className="input h-8 text-xs" onChange={e => handleMetricChange('content', 'posters', e.target.value)} />
                                        <input placeholder="Videos" type="number" className="input h-8 text-xs" onChange={e => handleMetricChange('content', 'videos', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Courses" type="number" className="input h-8 text-xs" onChange={e => handleMetricChange('content', 'courses', e.target.value)} />
                                        <input placeholder="Certificates" type="number" className="input h-8 text-xs" onChange={e => handleMetricChange('distribution', 'certificateShare', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {template === 'FORMATTING' && (
                            <div className="card-premium p-6 border-t-4 border-cyan-500">
                                <h3 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 text-secondary-900">Formatting Stats</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-secondary-500">Paper Formatting Count</label>
                                        <input type="number" className="input h-10" onChange={e => handleMetricChange('formatting', 'paperFormatting', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-secondary-500">Correction Count</label>
                                        <input type="number" className="input h-10" onChange={e => handleMetricChange('formatting', 'correctionCount', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-lg font-black shadow-xl hover:shadow-primary-200 transition-all">
                            {loading ? 'Submitting...' : 'Submit Report'} <Send size={18} className="inline ml-2" />
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
