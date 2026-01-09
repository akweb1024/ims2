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

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);
            // Auto-select template based on role if possible, else default
            if (u.role === 'SALES_EXECUTIVE') setTemplate('SALES');
            else if (u.role === 'EDITOR') setTemplate('PUBLICATION');
            else setTemplate('General');
        }
    }, []);

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
                revenueGenerated: totalRevenue,
                tasksCompleted,
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
                        <option value="SALES">Sales Executive</option>
                        <option value="PUBLICATION">Publication Exec</option>
                        <option value="PUBLICATION">Publication Exec</option>
                        <option value="PROGRAM">Program Executive</option>
                        <option value="FORMATTING">Formatting Team</option>
                    </select>
                </div>

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
