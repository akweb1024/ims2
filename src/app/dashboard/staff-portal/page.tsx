'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import WorkAgendaPlanner from '@/components/dashboard/work-agenda/WorkAgendaPlanner';
import EmployeeIDCard from '@/components/dashboard/EmployeeIDCard';
import TaxDeclarationPortal from '@/components/dashboard/staff/TaxDeclarationPortal';
import EmployeeOnboarding from '@/components/dashboard/staff/EmployeeOnboarding';
import EmployeeDocuments from '@/components/dashboard/staff/EmployeeDocuments';
import EmployeeKPIView from '@/components/dashboard/staff/EmployeeKPIView';
import AttendanceCalendar from '@/components/dashboard/staff/AttendanceCalendar';
import DailyTaskTracker from '@/components/dashboard/DailyTaskTracker';
import EmployeeTransactions from '@/components/dashboard/staff/EmployeeTransactions';
import { Lock, AlertOctagon, Calendar as CalendarIcon, Zap, ArrowLeft } from 'lucide-react';

// New Modular Components
import StaffProfileView from '@/components/dashboard/staff-portal/StaffProfileView';
import StaffLeaveManagement from '@/components/dashboard/staff-portal/StaffLeaveManagement';
import StaffWorkReports from '@/components/dashboard/staff-portal/StaffWorkReports';
import StaffSalaryView from '@/components/dashboard/staff-portal/StaffSalaryView';

// Manager Center Views
import TeamMembersView from '@/components/dashboard/manager/TeamMembersView';
import TeamAttendanceView from '@/components/dashboard/manager/TeamAttendanceView';
import TeamLeaveRequestsView from '@/components/dashboard/manager/TeamLeaveRequestsView';
import TeamLeaveBalancesView from '@/components/dashboard/manager/TeamLeaveBalancesView';
import TeamSalaryView from '@/components/dashboard/manager/TeamSalaryView';
import TeamAnalyticsView from '@/components/dashboard/manager/TeamAnalyticsView';
import TeamGoalTrackingView from '@/components/dashboard/manager/TeamGoalTrackingView';
import TeamTaskMasterView from '@/components/dashboard/manager/TeamTaskMasterView';
import TeamPointsRewardsView from '@/components/dashboard/manager/TeamPointsRewardsView';
import TeamWorkReportsView from '@/components/dashboard/manager/TeamWorkReportsView';
import { formatToISTDate, formatToISTTime } from '@/lib/date-utils';

export default function StaffPortalPage() {
    const [user, setUser] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [workReports, setWorkReports] = useState<any[]>([]);
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [performance, setPerformance] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any>(null);
    const [snapshots, setSnapshots] = useState<any[]>([]); // Added for dynamic performance
    const [fullProfile, setFullProfile] = useState<any>(null);
    const [compliance, setCompliance] = useState<any>({ isCompliant: true, pendingDocuments: [], pendingModules: [] });
    const [activeIncrement, setActiveIncrement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [checkingIn, setCheckingIn] = useState(false);
    const [workFromMode, setWorkFromMode] = useState<'OFFICE' | 'REMOTE'>('OFFICE');
    const [managerFilters, setManagerFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: 'PENDING'
    });
    const [activeSubTab, setActiveSubTab] = useState('members');
    const [elapsedTime, setElapsedTime] = useState('00h 00m 00s');
    const [remainingTime, setRemainingTime] = useState('08h 30m 00s');

    const todayAttendance = attendance.find(a => {
        return formatToISTDate(a.date) === formatToISTDate(new Date());
    });

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
            const [attendanceRes, reportsRes, slipsRes, leavesRes, perfRes, docsRes, profileRes, complRes, snapRes] = await Promise.all([
                fetch('/api/hr/attendance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/work-reports?employeeId=self', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/salary-slips', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/leave-requests', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/performance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/my-documents', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/profile/me', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/onboarding/compliance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/hr/performance/monthly?employeeId=self&year=${new Date().getFullYear()}`, { headers: { 'Authorization': `Bearer ${token}` } }), // Fetch Snapshots
            ]);

            if (complRes.ok) {
                const complData = await complRes.json();
                setCompliance(complData);
                // Force redirect to Documents or Onboarding if not compliant
                if (!complData.isCompliant) {
                    if (complData.pendingDocuments.length > 0) setActiveTab('documents');
                    else if (complData.pendingModules.length > 0) setActiveTab('onboarding');
                }
            }
            if (docsRes.ok) setDocuments(await docsRes.json());
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setFullProfile(profileData);
                if (profileData.user) {
                    // Sync the main user state with latest server data
                    setUser((prev: any) => ({ ...prev, ...profileData.user }));
                }
            }
            if (attendanceRes.ok) setAttendance(await attendanceRes.json());
            if (reportsRes.ok) setWorkReports(await reportsRes.json());
            if (slipsRes.ok) setSalarySlips(await slipsRes.json());
            if (leavesRes.ok) setLeaves(await leavesRes.json());
            if (perfRes.ok) setPerformance(await perfRes.json());
            if (snapRes.ok) setSnapshots(await snapRes.json());
            const incRes = await fetch('/api/staff/performance/active-increment', { headers: { 'Authorization': `Bearer ${token}` } });
            if (incRes.ok) {
                const incData = await incRes.json();
                setActiveIncrement(incData.increment);
            }
        } catch (err) {
            console.error('Failed to fetch staff data', err);
        } finally {
            setLoading(false);
        }
    };

    // Timer Logic
    useEffect(() => {
        if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
            const calculateTime = () => {
                const now = new Date();
                const checkIn = new Date(todayAttendance.checkIn);
                const diffMs = now.getTime() - checkIn.getTime();

                // Calculate Working Hours
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);

                // Calculate Remaining (Target: 8h 30m = 8.5 * 60 * 60 * 1000 ms)
                const targetMs = 8.5 * 60 * 60 * 1000;
                const remainingMs = targetMs - diffMs;

                if (remainingMs > 0) {
                    const rHours = Math.floor(remainingMs / (1000 * 60 * 60));
                    const rMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
                    const rSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
                    setRemainingTime(`${rHours}h ${rMinutes}m ${rSeconds}s`);
                } else {
                    setRemainingTime('Overtime');
                }
            };

            calculateTime();
            const interval = setInterval(calculateTime, 1000); // Update every second

            return () => clearInterval(interval);
        }
    }, [todayAttendance]);

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

    const baseTabs = [
        { id: 'overview', name: 'Overview', icon: '🏠' },
        { id: 'profile', name: 'My Profile', icon: '👤' },
        { id: 'attendance', name: 'Attendance', icon: '📅' },
        { id: 'work-reports', name: 'Work Reports', icon: '📝' },
        { id: 'work-agenda', name: 'Work Agenda', icon: '📔' },
        { id: 'tax-declarations', name: 'Tax Declarations', icon: '🛡️' },
        { id: 'leaves', name: 'Leave Requests', icon: '🏃' },
        { id: 'performance', name: 'Performance', icon: '📈' },
        { id: 'salary', name: 'Salary', icon: '💵' },
        { id: 'documents', name: 'Documents', icon: '📁' },
        { id: 'onboarding', name: 'Onboarding', icon: '🎓' },
        { id: 'transactions', name: 'Transactions', icon: '💰' },
        { id: 'it-services', name: 'IT Services', icon: '🛠️' },
        { id: 'id-card', name: 'ID Card', icon: '🪪' },
    ];

    const managerTabs = ['MANAGER', 'TEAM_LEADER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) ? [
        { id: 'separator', name: '', icon: '', isSeparator: true },
        { id: 'team-ops', name: 'Team Ops', icon: '🏢' },
        { id: 'team-payroll', name: 'Team Payroll', icon: '💰' },
        { id: 'team-perf', name: 'Team Performance', icon: '🚀' },
    ] : [];

    const tabs: any[] = [...baseTabs, ...managerTabs];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (tabId === 'team-ops') setActiveSubTab('members');
        else if (tabId === 'team-payroll') setActiveSubTab('salary');
        else if (tabId === 'team-perf') setActiveSubTab('analytics');
    };

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
                            <p className="text-secondary-500 font-medium">Welcome back, <span className="text-primary-600">{user?.name || user?.email?.split('@')[0]}</span></p>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col items-end gap-3 relative z-10">
                        {todayAttendance?.checkIn && !todayAttendance.checkOut && (
                            <div className="flex gap-4 mb-2">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Working</p>
                                    <p className="font-black text-secondary-900 text-lg">{elapsedTime}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Remaining</p>
                                    <p className={`font-black text-lg ${remainingTime === 'Overtime' ? 'text-success-600' : 'text-primary-600'}`}>{remainingTime}</p>
                                </div>
                            </div>
                        )}

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
                                className="btn bg-secondary-900 text-white hover:bg-black px-8 py-3 rounded-2xl shadow-xl shadow-secondary-200 opacity-100 transition-all flex items-center gap-2 hover:scale-105 animate-pulse"
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
                <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border border-secondary-100">
                    {tabs.map((tab) => {
                        if (tab.isSeparator) return <div key="sep" className="w-px h-8 bg-secondary-100 mx-2 self-center"></div>;

                        // Compliance Lock Logic
                        const isLocked = !compliance.isCompliant &&
                            tab.id !== 'documents' &&
                            tab.id !== 'onboarding' &&
                            tab.id !== 'work-reports' &&
                            tab.id !== 'attendance'; // Allow Check-in

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isLocked && handleTabChange(tab.id)}
                                className={`
                                flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${activeTab === tab.id
                                        ? 'bg-primary-600 text-white shadow-md transform scale-105'
                                        : isLocked
                                            ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                                            : tab.id.startsWith('team-')
                                                ? 'text-indigo-600 hover:bg-indigo-50 font-bold'
                                                : 'text-secondary-600 hover:bg-secondary-50 hover:text-primary-600'
                                    }
                            `}
                            >
                                <span>{tab.icon}</span>
                                {tab.name}
                                {isLocked && <Lock size={12} className="ml-1" />}
                            </button>
                        )
                    })}
                </div>

                {!compliance.isCompliant && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-pulse">
                        <AlertOctagon className="text-red-600 mt-1 shrink-0" />
                        <div>
                            <h3 className="font-bold text-red-800">Action Required: Compliance Pending</h3>
                            <p className="text-sm text-red-700 mt-1">
                                You must complete your onboarding tasks to access all portal features.
                            </p>
                            <ul className="list-disc pl-5 mt-2 text-xs text-red-700 font-medium">
                                {compliance.pendingDocuments.length > 0 && <li>Sign {compliance.pendingDocuments.length} pending document(s) in &quot;Documents&quot; tab.</li>}
                                {compliance.pendingModules.length > 0 && <li>Complete {compliance.pendingModules.length} mandatory onboarding module(s).</li>}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 min-h-[500px] relative">
                    {activeTab === 'onboarding' && <EmployeeOnboarding />}
                    {activeTab === 'documents' && <EmployeeDocuments data={documents} fullProfile={fullProfile} />}
                    {activeTab === 'transactions' && <EmployeeTransactions />}

                    {activeTab === 'profile' && (
                        <StaffProfileView user={user} fullProfile={fullProfile} />
                    )}

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="card-premium p-6 border-t-4 border-primary-500">
                                    <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Today&apos;s Status</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-secondary-500">Check In</span>
                                            <span className="font-bold text-secondary-900">{formatToISTTime(todayAttendance?.checkIn)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-secondary-500">Check Out</span>
                                            <span className="font-bold text-secondary-900">{formatToISTTime(todayAttendance?.checkOut)}</span>
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
                                        <p className="text-xs font-bold text-secondary-400 mt-1 uppercase tracking-widest">Active Days</p>
                                    </div>
                                </div>
                                <div className="card-premium p-6 border-t-4 border-amber-500">
                                    <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Leave Balance</h3>
                                    <div className="text-center py-4">
                                        <p className="text-4xl font-black text-secondary-900">{fullProfile?.leaveBalance || 0}</p>
                                        <p className="text-xs font-bold text-secondary-400 mt-1 uppercase tracking-widest">Available Days</p>
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
                                <div className="card-premium p-6 border-t-4 border-indigo-500 bg-indigo-50/30">
                                    <h3 className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-4">Quick Actions</h3>
                                    <div className="space-y-3">
                                        <a href="/dashboard/staff-portal/submit-report" className="btn btn-primary w-full py-2 text-xs font-black shadow-lg">
                                            Submit Daily Report 📝
                                        </a>
                                        <a href="/dashboard/service-desk/request" className="btn bg-amber-500 hover:bg-amber-600 text-white w-full py-2 text-xs font-black shadow-lg">
                                            Request IT Service 🛠️
                                        </a>
                                        <button onClick={() => setActiveTab('work-reports')} className="text-[10px] w-full text-center font-bold text-primary-600 uppercase hover:underline">
                                            View Past Reports
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Task Tracker */}
                            <DailyTaskTracker />
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="p-8">
                            <EmployeeKPIView snapshots={snapshots} reviews={performance} />
                        </div>
                    )}

                    {activeTab === 'tax-declarations' && <TaxDeclarationPortal />}

                    {activeTab === 'attendance' && (
                        <div className="space-y-6">
                            <AttendanceCalendar attendance={attendance} workReports={workReports} />

                            <div className="card-premium overflow-hidden">
                                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/30">
                                    <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                                        <CalendarIcon size={18} className="text-primary-600" />
                                        Detailed Log
                                    </h3>
                                    <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">All Records</span>
                                </div>
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
                                                <td className="font-bold">{formatToISTDate(a.date)}</td>
                                                <td className="text-success-600 font-medium">{formatToISTTime(a.checkIn)}</td>
                                                <td className="text-danger-600 font-medium">{formatToISTTime(a.checkOut)}</td>
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
                        </div>
                    )}

                    {activeTab === 'work-reports' && (
                        <StaffWorkReports
                            workReports={workReports}
                            todayAttendance={todayAttendance}
                            user={user}
                            onDataRefresh={fetchAllData}
                        />
                    )}

                    {activeTab === 'leaves' && (
                        <StaffLeaveManagement
                            leaves={leaves}
                            fullProfile={fullProfile}
                            onLeaveSubmitted={fetchAllData}
                        />
                    )}

                    {activeTab === 'work-agenda' && (
                        <div className="p-8">
                            <WorkAgendaPlanner isOwnAgenda={true} />
                        </div>
                    )}

                    {activeTab === 'salary' && (
                        <StaffSalaryView fullProfile={fullProfile} salarySlips={salarySlips} />
                    )}

                    {activeTab === 'id-card' && fullProfile && <EmployeeIDCard employee={fullProfile} />}

                    {activeTab === 'it-services' && (
                        <div className="p-8 max-w-4xl mx-auto space-y-8">
                            <div className="card-premium p-10 bg-gradient-to-br from-secondary-900 to-black text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -mr-32 -mt-32"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl">🛠️</div>
                                        <div>
                                            <h2 className="text-3xl font-black">IT Support & Services</h2>
                                            <p className="text-primary-400 font-bold uppercase tracking-widest text-xs">Employee Self-Service Portal</p>
                                        </div>
                                    </div>
                                    <p className="text-secondary-300 leading-relaxed max-w-2xl mb-8">
                                        Need technical assistance? Request software installations, hardware upgrades, access permissions, or any other IT-related equipment directly from here.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <a href="/dashboard/service-desk/request" className="btn btn-primary px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
                                            <span>➕</span> Request New Service
                                        </a>
                                        <a href="/dashboard/service-desk" className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border border-white/10">
                                            <span>📋</span> View My Requests
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="card-premium p-6 border-t-4 border-primary-500">
                                    <h4 className="font-bold text-secondary-900 mb-2">Fast Turnaround</h4>
                                    <p className="text-xs text-secondary-500">Most software requests are fulfilled within 24 hours.</p>
                                </div>
                                <div className="card-premium p-6 border-t-4 border-success-500">
                                    <h4 className="font-bold text-secondary-900 mb-2">Trackable</h4>
                                    <p className="text-xs text-secondary-500">Real-time status updates and direct communication with IT team.</p>
                                </div>
                                <div className="card-premium p-6 border-t-4 border-amber-500">
                                    <h4 className="font-bold text-secondary-900 mb-2">Acceptance Model</h4>
                                    <p className="text-xs text-secondary-500">You review and approve the solution before it&apos;s finalized.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'team-ops' && (
                        <div className="p-8 space-y-8">
                            <div className="flex flex-wrap gap-4 mb-8 bg-secondary-50 p-2 rounded-2xl w-fit">
                                <button onClick={() => setActiveSubTab('members')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'members' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Members</button>
                                <button onClick={() => setActiveSubTab('attendance')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'attendance' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Attendance</button>
                                <button onClick={() => setActiveSubTab('leaves')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'leaves' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Leaves</button>
                                <button onClick={() => setActiveSubTab('balances')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'balances' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Balances</button>
                            </div>
                            <div className="animate-in fade-in duration-500">
                                {activeSubTab === 'members' && <TeamMembersView />}
                                {activeSubTab === 'attendance' && <TeamAttendanceView filters={managerFilters} setFilters={setManagerFilters} />}
                                {activeSubTab === 'leaves' && <TeamLeaveRequestsView />}
                                {activeSubTab === 'balances' && <TeamLeaveBalancesView filters={managerFilters} setFilters={setManagerFilters} />}
                            </div>
                        </div>
                    )}

                    {activeTab === 'team-payroll' && (
                        <div className="p-8 space-y-8">
                            <div className="flex flex-wrap gap-4 mb-8 bg-secondary-50 p-2 rounded-2xl w-fit">
                                <button onClick={() => setActiveSubTab('salary')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'salary' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Structures</button>
                                <button onClick={() => setActiveSubTab('advances')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'advances' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Advances</button>
                                <button onClick={() => setActiveSubTab('increments')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'increments' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Increments</button>
                            </div>
                            <div className="animate-in fade-in duration-500">
                                <TeamSalaryView activeSubTab={activeSubTab} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'team-perf' && (
                        <div className="p-8 space-y-8">
                            <div className="flex flex-wrap gap-4 mb-8 bg-secondary-50 p-2 rounded-2xl w-fit">
                                <button onClick={() => setActiveSubTab('analytics')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'analytics' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Analytics</button>
                                <button onClick={() => setActiveSubTab('goals')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'goals' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Goals (KRA)</button>
                                <button onClick={() => setActiveSubTab('tasks')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'tasks' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Tasks</button>
                                <button onClick={() => setActiveSubTab('points')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'points' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Rewards</button>
                                <button onClick={() => setActiveSubTab('reports')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'reports' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-400 hover:text-secondary-600'}`}>Reports</button>
                            </div>
                            <div className="animate-in fade-in duration-500">
                                {activeSubTab === 'analytics' && <TeamAnalyticsView filters={managerFilters} />}
                                {activeSubTab === 'goals' && <TeamGoalTrackingView />}
                                {activeSubTab === 'tasks' && <TeamTaskMasterView />}
                                {activeSubTab === 'points' && <TeamPointsRewardsView />}
                                {activeSubTab === 'reports' && <TeamWorkReportsView />}
                            </div>
                        </div>
                    )}
                </div >
            </div >
        </DashboardLayout >
    );
}
