'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import AchievementSection from '@/components/dashboard/AchievementSection';
import WorkPlanSection from '@/components/dashboard/WorkPlanSection';
import OnboardingPortal from '@/components/dashboard/OnboardingPortal';

export default function StaffPortalPage() {
    const [user, setUser] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [workReports, setWorkReports] = useState<any[]>([]);
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [performance, setPerformance] = useState<any[]>([]);
    const [workPlans, setWorkPlans] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [checkingIn, setCheckingIn] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [workFromMode, setWorkFromMode] = useState<'OFFICE' | 'REMOTE'>('OFFICE');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (!parsedUser.companyId && parsedUser.role !== 'SUPER_ADMIN') {
                alert("This module is only accessible to members associated with a company.");
                window.location.href = '/dashboard';
                return;
            }
            setUser(parsedUser);
            fetchAllData();
        } else {
            window.location.href = '/login';
        }
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [attendanceRes, reportsRes, plansRes, slipsRes, leavesRes, perfRes, docsRes] = await Promise.all([
                fetch('/api/hr/attendance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/work-reports', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/work-plans', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/salary-slips', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/leave-requests', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/performance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/my-documents', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (docsRes.ok) setDocuments(await docsRes.json());
            if (attendanceRes.ok) setAttendance(await attendanceRes.json());
            if (reportsRes.ok) setWorkReports(await reportsRes.json());
            if (plansRes.ok) setWorkPlans(await plansRes.json());
            if (slipsRes.ok) setSalarySlips(await slipsRes.json());
            if (leavesRes.ok) setLeaves(await leavesRes.json());
            if (perfRes.ok) setPerformance(await perfRes.json());
        } catch (err) {
            console.error('Failed to fetch staff data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendance = async (action: 'check-in' | 'check-out') => {
        setCheckingIn(true);
        try {
            // Get Location first
            let locationData: any = {};
            if ("geolocation" in navigator) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    locationData = {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    };
                } catch (e) {
                    console.log("Location denied or error");
                }
            }

            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/attendance', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    workFrom: workFromMode,
                    ...locationData
                })
            });
            if (res.ok) {
                await fetchAllData();
                // Refresh profile to update button state
                const userRes = await fetch('/api/hr/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (userRes.ok) setUser(await userRes.json());
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingIn(false);
        }
    };

    const todayAttendance = attendance.find(a => {
        const d = new Date(a.date);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    });

    // Debug logging
    if (typeof window !== 'undefined') {
        console.log('Today Attendance Check:', {
            totalRecords: attendance.length,
            todayFound: !!todayAttendance,
            todayData: todayAttendance,
            allDates: attendance.map(a => new Date(a.date).toLocaleDateString())
        });
    }

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '🏠' },
        { id: 'attendance', name: 'Attendance', icon: '🕒' },
        { id: 'work-reports', name: 'Work Reports', icon: '📝' },
        { id: 'work-agenda', name: 'Work Agenda', icon: '🎯' },
        { id: 'leaves', name: 'Leaves', icon: '🏝️' },
        { id: 'performance', name: 'Performance', icon: '📈' },
        { id: 'salary', name: 'Salary', icon: '💵' },
        { id: 'documents', name: 'Documents', icon: '📁' },
        { id: 'onboarding', name: 'Onboarding', icon: '🎓' },
    ];

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-8 max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-8 rounded-[2.5rem] shadow-xl border border-secondary-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center text-3xl font-black shadow-2xl">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">Staff Portal</h1>
                            <p className="text-secondary-500 font-medium">Welcome back, <span className="text-primary-600">@{user?.email?.split('@')[0]}</span></p>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col items-end gap-3 relative z-10">
                        {!todayAttendance?.checkIn && (
                            <div className="flex gap-2 p-1 bg-secondary-100 rounded-xl mb-1">
                                <button
                                    onClick={() => setWorkFromMode('OFFICE')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${workFromMode === 'OFFICE' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                >
                                    Office
                                </button>
                                <button
                                    onClick={() => setWorkFromMode('REMOTE')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${workFromMode === 'REMOTE' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                                >
                                    Remote
                                </button>
                            </div>
                        )}

                        {!todayAttendance?.checkIn ? (
                            <button
                                onClick={() => handleAttendance('check-in')}
                                disabled={checkingIn}
                                className="btn btn-primary px-8 py-3 rounded-2xl shadow-lg hover:shadow-primary-200 transition-all flex items-center gap-2 group"
                            >
                                {checkingIn ? '...' : `Check In (${workFromMode})`}
                                <span className="group-hover:translate-x-1 transition-transform">🕒</span>
                            </button>
                        ) : !todayAttendance?.checkOut ? (
                            <button
                                onClick={() => handleAttendance('check-out')}
                                disabled={checkingIn}
                                className="btn bg-danger-600 text-white hover:bg-danger-700 px-8 py-3 rounded-2xl shadow-lg hover:shadow-danger-200 transition-all flex items-center gap-2"
                            >
                                {checkingIn ? '...' : 'Check Out'} 🚪
                            </button>
                        ) : (
                            <div className="bg-success-50 text-success-700 px-6 py-3 rounded-2xl border border-success-200 font-bold flex items-center gap-2">
                                ✅ Shift Completed
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-secondary-100/50 p-2 rounded-2xl w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? 'bg-white text-primary-600 shadow-md'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>

                <div className="min-h-[400px]">
                    {activeTab === 'onboarding' && <OnboardingPortal />}

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card-premium p-6 border-t-4 border-primary-500">
                                <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Today&apos;s Status</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-secondary-500">Check In</span>
                                        <span className="font-bold text-secondary-900">{todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : '--:--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-secondary-500">Check Out</span>
                                        <span className="font-bold text-secondary-900">{todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : '--:--'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-secondary-500">Mode</span>
                                        <span className="badge badge-secondary">{todayAttendance?.workFrom || 'OFFICE'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="card-premium p-6 border-t-4 border-success-500">
                                <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Monthly Performance</h3>
                                <div className="text-center py-4">
                                    <p className="text-4xl font-black text-secondary-900">{attendance.length}</p>
                                    <p className="text-xs text-secondary-500 font-bold mt-1">Days Present</p>
                                </div>
                            </div>

                            <div className="card-premium p-6 border-t-4 border-warning-500">
                                <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Latest Rating</h3>
                                <div className="text-center py-2">
                                    <div className="text-3xl font-black text-secondary-900 mb-2">
                                        {'★'.repeat(performance[0]?.rating || 0)}{'☆'.repeat(5 - (performance[0]?.rating || 0))}
                                    </div>
                                    <p className="text-xs text-secondary-500 italic">
                                        {performance[0]?.feedback ? `"${performance[0].feedback.slice(0, 60)}..."` : "No reviews yet"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="card-premium overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Check In</th>
                                        <th>Check Out</th>
                                        <th>Mode</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-secondary-500">No records found</td></tr>
                                    ) : attendance.map(a => (
                                        <tr key={a.id}>
                                            <td className="font-bold"><FormattedDate date={a.date} /></td>
                                            <td className="text-success-600 font-medium">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '-'}</td>
                                            <td className="text-danger-600 font-medium">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '-'}</td>
                                            <td><span className="badge badge-secondary">{a.workFrom}</span></td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <span className="badge badge-success">{a.status}</span>
                                                    {a.workFrom === 'OFFICE' && (
                                                        <span title={a.isGeofenced ? "Verified Location" : "Outside Geofence"} className={`text-[10px] ${a.isGeofenced ? 'text-success-500' : 'text-danger-500'} font-black`}>
                                                            {a.isGeofenced ? '📍 IN' : '⚠️ OUT'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'work-reports' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                {/* Todays Realtime Achievement Preview */}
                                {todayAttendance?.checkIn && (
                                    <AchievementSection report={workReports.find(r => {
                                        const rd = new Date(r.date);
                                        const td = new Date();
                                        return rd.getDate() === td.getDate() && rd.getMonth() === td.getMonth();
                                    }) || {
                                        revenueGenerated: 0,
                                        tasksCompleted: 0,
                                        ticketsResolved: 0,
                                        selfRating: 5,
                                        keyOutcome: "Activity in progress..."
                                    }} />
                                )}

                                <div className="card-premium p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-secondary-900">Submit Report</h3>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const btn = document.getElementById('magic-btn');
                                                if (btn) btn.innerHTML = '✨ Generating...';
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch('/api/hr/work-reports/generate', {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        const form = document.querySelector('form[name="reportForm"]') as HTMLFormElement;
                                                        if (form) {
                                                            if (data.content) (form.elements.namedItem('content') as HTMLTextAreaElement).value = data.content;
                                                            if (data.keyOutcome) (form.elements.namedItem('keyOutcome') as HTMLInputElement).value = data.keyOutcome;
                                                            (form.elements.namedItem('title') as HTMLInputElement).value = `Daily Report - ${new Date().toLocaleDateString()}`;
                                                            // Populate new fields
                                                            if (data.revenue) (form.elements.namedItem('revenueGenerated') as HTMLInputElement).value = data.revenue;
                                                            if (data.tasksCount) (form.elements.namedItem('tasksCompleted') as HTMLInputElement).value = data.tasksCount;
                                                            if (data.ticketsCount) (form.elements.namedItem('ticketsResolved') as HTMLInputElement).value = data.ticketsCount;
                                                            if (data.chatsCount) (form.elements.namedItem('chatsHandled') as HTMLInputElement).value = data.chatsCount;
                                                            if (data.followUpsCount) (form.elements.namedItem('followUpsCompleted') as HTMLInputElement).value = data.followUpsCount;
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                } finally {
                                                    if (btn) btn.innerHTML = '✨ Auto-Generate';
                                                }
                                            }}
                                            id="magic-btn"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                                        >
                                            ✨ Auto-Generate
                                        </button>
                                    </div>
                                    <form name="reportForm" onSubmit={async (e) => {
                                        if (submittingReport) return;
                                        setSubmittingReport(true);
                                        const form = e.currentTarget;
                                        const formData = new FormData(form);
                                        const token = localStorage.getItem('token');
                                        try {
                                            const res = await fetch('/api/hr/work-reports', {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                body: JSON.stringify(Object.fromEntries(formData))
                                            });
                                            if (res.ok) {
                                                alert('Report submitted successfully!');
                                                form.reset();
                                                fetchAllData();
                                            } else {
                                                const err = await res.json();
                                                alert(`Error: ${err.error}`);
                                            }
                                        } catch (e) {
                                            console.error(e);
                                        } finally {
                                            setSubmittingReport(false);
                                        }
                                    }} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 bg-secondary-50 p-4 rounded-2xl border border-secondary-100 mb-4">
                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Today&apos;s Revenue</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-secondary-400 font-bold">₹</span>
                                                    <input name="revenueGenerated" type="number" className="input pl-7" defaultValue="0" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Tasks Done</label>
                                                <input name="tasksCompleted" type="number" className="input" defaultValue="0" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Tickets Fixed</label>
                                                <input name="ticketsResolved" type="number" className="input" defaultValue="0" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Chats Handled</label>
                                                <input name="chatsHandled" type="number" className="input" defaultValue="0" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">Followups Done</label>
                                                <input name="followUpsCompleted" type="number" className="input" defaultValue="0" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Category</label>
                                                <select name="category" className="input" required>
                                                    <option value="GENERAL">General/Admin</option>
                                                    <option value="SALES">Sales & Growth</option>
                                                    <option value="DEVELOPMENT">Product & Tech</option>
                                                    <option value="SUPPORT">Customer Support</option>
                                                    <option value="LEARNING">Training & Learning</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label">Productivity (1-10)</label>
                                                <input name="selfRating" type="number" min="1" max="10" className="input" required placeholder="10" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Focus Area / Title</label>
                                            <input name="title" className="input" required placeholder="e.g. Sales Outreach, IT Support" />
                                        </div>
                                        <div>
                                            <label className="label">Key Outcome / Revenue Impact</label>
                                            <input name="keyOutcome" className="input" placeholder="e.g. Closed $500 deal, Fixed 3 critical bugs" />
                                        </div>
                                        <div>
                                            <label className="label">Detailed Accomplishments</label>
                                            <textarea name="content" className="input h-32" required placeholder="Describe what you did today..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Hours Spent</label>
                                                <input name="hoursSpent" type="number" step="0.5" className="input" required />
                                            </div>
                                            <div>
                                                <label className="label">Date</label>
                                                <input name="date" type="date" className="input" defaultValue={new Date().toISOString().split('T')[0]} />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submittingReport}
                                            className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {submittingReport ? (
                                                <>
                                                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                                    Submitting...
                                                </>
                                            ) : 'Submit Impact Report'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                {workReports.map(report => (
                                    <div key={report.id} className="card-premium p-6 hover:shadow-lg transition-all border-l-4 border-primary-500">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-secondary-900">{report.title}</h4>
                                            <span className="text-[10px] uppercase font-bold text-secondary-400"><FormattedDate date={report.date} /></span>
                                        </div>
                                        <p className="text-sm text-secondary-600 mb-4">{report.content}</p>

                                        {/* Advanced Metrics Display */}
                                        <div className="bg-secondary-50 p-3 rounded-xl mb-4 text-xs space-y-2 border border-secondary-100">
                                            <div className="flex justify-between">
                                                <span className="text-secondary-500 font-bold uppercase">Impact Area</span>
                                                <span className="font-black text-primary-700">{report.category || 'GENERAL'}</span>
                                            </div>
                                            {report.keyOutcome && (
                                                <div className="flex justify-between">
                                                    <span className="text-secondary-500 font-bold uppercase">Key Outcome</span>
                                                    <span className="font-bold text-secondary-900">{report.keyOutcome}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-4 text-xs pt-2 border-t border-secondary-100">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="text-secondary-400 font-bold">⏱️ {report.hoursSpent}h</span>
                                                {report.selfRating && <span className="text-secondary-400 font-bold">⚡ {report.selfRating}/10</span>}
                                                {report.revenueGenerated > 0 && <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded">₹{report.revenueGenerated.toLocaleString()}</span>}
                                                {report.tasksCompleted > 0 && <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">{report.tasksCompleted} Tasks</span>}
                                                {report.ticketsResolved > 0 && <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded">{report.ticketsResolved} Tickets</span>}
                                                {report.chatsHandled > 0 && <span className="text-blue-600 font-bold text-[10px] bg-blue-50 px-2 py-0.5 rounded">{report.chatsHandled} Chats</span>}
                                                {report.followUpsCompleted > 0 && <span className="text-cyan-600 font-bold text-[10px] bg-cyan-50 px-2 py-0.5 rounded">{report.followUpsCompleted} Followups</span>}
                                            </div>
                                            <span className={`badge ${report.status === 'APPROVED' ? 'badge-success' : 'badge-secondary'}`}>{report.status}</span>
                                        </div>
                                        {report.managerComment && (
                                            <div className="mt-4 p-3 bg-secondary-50 rounded-lg text-xs border-l-2 border-warning-400">
                                                <p className="font-bold text-secondary-500 mb-1">MANAGER COMMENT:</p>
                                                <p className="text-secondary-700 italic">{report.managerComment}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'leaves' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                <div className="card-premium p-6">
                                    <h3 className="text-xl font-bold text-secondary-900 mb-6">Request Leave</h3>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget;
                                        const formData = new FormData(form);
                                        const token = localStorage.getItem('token');
                                        const res = await fetch('/api/hr/leave-requests', {
                                            method: 'POST',
                                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                            body: JSON.stringify(Object.fromEntries(formData))
                                        });
                                        if (res.ok) {
                                            alert('Leave request submitted');
                                            form.reset();
                                            fetchAllData();
                                        }
                                    }} className="space-y-4">
                                        <div>
                                            <label className="label">Leave Type</label>
                                            <select name="type" className="input" required>
                                                <option value="SICK">Sick Leave</option>
                                                <option value="CASUAL">Casual Leave</option>
                                                <option value="VACATION">Vacation / Earned Leave</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="label">Start Date</label>
                                                <input name="startDate" type="date" className="input" required />
                                            </div>
                                            <div>
                                                <label className="label">End Date</label>
                                                <input name="endDate" type="date" className="input" required />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label">Reason</label>
                                            <textarea name="reason" className="input h-32" required placeholder="Describe the reason for leave..." />
                                        </div>
                                        <button type="submit" className="btn btn-primary w-full py-3 rounded-xl font-bold shadow-lg">Submit Request</button>
                                    </form>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="card-premium overflow-hidden">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Duration</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaves.length === 0 ? (
                                                <tr><td colSpan={4} className="text-center py-10 text-secondary-500">No leave requests found</td></tr>
                                            ) : leaves.map(l => {
                                                const start = new Date(l.startDate);
                                                const end = new Date(l.endDate);
                                                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

                                                return (
                                                    <tr key={l.id}>
                                                        <td><span className="badge badge-secondary">{l.type}</span></td>
                                                        <td>
                                                            <div className="font-bold text-secondary-900">{diffDays} Days</div>
                                                            <div className="text-[10px] text-secondary-400 font-bold uppercase">
                                                                {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="max-w-[200px] truncate">{l.reason}</td>
                                                        <td>
                                                            <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' :
                                                                l.status === 'REJECTED' ? 'badge-danger' :
                                                                    'badge-warning'
                                                                }`}>
                                                                {l.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-6 max-w-4xl mx-auto">
                            {performance.map(review => (
                                <div key={review.id} className="card-premium p-8 border-l-8 border-primary-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="text-2xl font-black text-secondary-100 uppercase tracking-tighter opacity-10 select-none">Review</div>
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex gap-1 text-warning-400 text-xl mb-1">
                                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                            </div>
                                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Reviewed on <FormattedDate date={review.date} /></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-secondary-900">{review.reviewer.email}</p>
                                            <p className="text-[10px] text-secondary-400 font-bold uppercase">{review.reviewer.role.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg text-secondary-700 leading-relaxed font-medium bg-primary-50/30 p-6 rounded-2xl border border-primary-100/50 italic">
                                        &quot;{review.feedback}&quot;
                                    </p>
                                </div>
                            ))}
                            {performance.length === 0 && (
                                <div className="card-premium p-20 text-center text-secondary-400 font-medium italic">
                                    Detailed performance reviews will appear here once submitted by your manager.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'salary' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {salarySlips.map(slip => (
                                    <div key={slip.id} className="card-premium p-6 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-success-100 text-success-600 rounded-xl flex items-center justify-center text-xl">
                                                💵
                                            </div>
                                            <div>
                                                <p className="font-bold text-secondary-900">Salary Slip - {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slip.month]} {slip.year}</p>
                                                <p className="text-xs text-secondary-500">Paid on <FormattedDate date={slip.generatedAt} /></p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-secondary-900">₹{slip.amountPaid.toLocaleString()}</p>
                                            <button
                                                onClick={async () => {
                                                    const token = localStorage.getItem('token');
                                                    const btn = document.getElementById(`download-btn-${slip.id}`);
                                                    if (btn) btn.innerHTML = 'Downloading...';
                                                    try {
                                                        const res = await fetch(`/api/hr/salary-slips/${slip.id}/download`, {
                                                            headers: { 'Authorization': `Bearer ${token}` }
                                                        });
                                                        if (res.ok) {
                                                            const blob = await res.blob();
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `Salary_Slip_${slip.month}_${slip.year}.pdf`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            window.URL.revokeObjectURL(url);
                                                        } else {
                                                            alert('Failed to download salary slip');
                                                        }
                                                    } catch (error) {
                                                        console.error('Download error:', error);
                                                        alert('An error occurred while downloading.');
                                                    } finally {
                                                        if (btn) btn.innerHTML = 'Download PDF';
                                                    }
                                                }}
                                                id={`download-btn-${slip.id}`}
                                                className="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:underline mt-1"
                                            >
                                                Download PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {salarySlips.length === 0 && (
                                    <div className="col-span-full py-20 text-center card-premium">
                                        <p className="text-secondary-500 tracking-wide">No salary slips generated yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'work-agenda' && (
                        <WorkPlanSection
                            plans={workPlans}
                            onPlanSubmitted={fetchAllData}
                            user={user}
                        />
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-8 max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card-premium p-8 bg-white border-l-8 border-primary-500">
                                    <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center text-3xl mb-6">📄</div>
                                    <h3 className="text-xl font-bold text-secondary-900 mb-2">Offer Letter</h3>
                                    <p className="text-secondary-500 text-sm mb-6">Your official appointment letter confirming your role and compensation.</p>
                                    {documents?.application?.offerLetterUrl || documents?.profile?.offerLetterUrl ? (
                                        <a href={documents.application?.offerLetterUrl || documents.profile.offerLetterUrl} target="_blank" className="btn btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                            <span>📥</span> Download Offer Letter
                                        </a>
                                    ) : (
                                        <div className="bg-secondary-50 p-4 rounded-xl text-center text-secondary-400 text-xs font-bold border border-dashed border-secondary-200 uppercase tracking-widest">Not Uploaded Yet</div>
                                    )}
                                </div>

                                <div className="card-premium p-8 bg-white border-l-8 border-primary-500">
                                    <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center text-3xl mb-6">⚖️</div>
                                    <h3 className="text-xl font-bold text-secondary-900 mb-2">Employment Contract</h3>
                                    <p className="text-secondary-500 text-sm mb-6">Legal agreement outlining terms, conditions, and company policies.</p>
                                    {documents?.application?.contractUrl || documents?.profile?.contractUrl ? (
                                        <a href={documents.application?.contractUrl || documents.profile.contractUrl} target="_blank" className="btn btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                            <span>📥</span> View Contract
                                        </a>
                                    ) : (
                                        <div className="bg-secondary-50 p-4 rounded-xl text-center text-secondary-400 text-xs font-bold border border-dashed border-secondary-200 uppercase tracking-widest">Not Uploaded Yet</div>
                                    )}
                                </div>
                            </div>

                            {/* Additional Documents Section */}
                            {documents?.profile?.documents?.length > 0 && (
                                <div className="card-premium p-8">
                                    <h3 className="text-xl font-bold text-secondary-900 mb-6">Additional Documents</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {documents.profile.documents.map((doc: any) => (
                                            <div key={doc.id} className="p-4 rounded-xl border border-secondary-100 flex items-center gap-4 hover:shadow-md transition-all">
                                                <div className="w-10 h-10 bg-secondary-50 flex items-center justify-center rounded-lg text-xl">📄</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-secondary-900 truncate" title={doc.name}>{doc.name}</p>
                                                    <p className="text-[10px] text-secondary-400">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                </div>
                                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-800 text-sm font-bold">View</a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {documents?.application?.jobPosting && (
                                <div className="card-premium p-10 bg-secondary-900 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -mr-32 -mt-32"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <span className="badge bg-primary-600 text-white border-none mb-3">{documents.application.jobPosting.type}</span>
                                                <h3 className="text-3xl font-black">{documents.application.jobPosting.title}</h3>
                                                <p className="text-primary-300 font-bold tracking-widest uppercase text-xs">{documents.application.jobPosting.company?.name || 'STM Indexing'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black">{documents.application.jobPosting.salaryRange}</p>
                                                <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Assigned Package</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-xs font-bold text-primary-400 uppercase tracking-[0.2em] border-b border-white/10 pb-2">Job Roles & Responsibilities</h4>
                                            <p className="text-secondary-300 leading-relaxed whitespace-pre-line text-sm bg-white/5 p-6 rounded-2xl border border-white/5">{documents.application.jobPosting.description}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
