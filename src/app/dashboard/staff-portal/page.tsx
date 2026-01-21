'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import Image from 'next/image';
import AchievementSection from '@/components/dashboard/AchievementSection';
import WorkPlanSection from '@/components/dashboard/WorkPlanSection';
import DigitalWallet from '@/components/dashboard/DigitalWallet';
import EmployeeIDCard from '@/components/dashboard/EmployeeIDCard';
import SafeHTML from '@/components/common/SafeHTML';
import TaxDeclarationPortal from '@/components/dashboard/staff/TaxDeclarationPortal';
import EmployeeOnboarding from '@/components/dashboard/staff/EmployeeOnboarding';
import EmployeeDocuments from '@/components/dashboard/staff/EmployeeDocuments';
import EmployeeKPIView from '@/components/dashboard/staff/EmployeeKPIView';
import AttendanceCalendar from '@/components/dashboard/staff/AttendanceCalendar';
import DailyTaskTracker from '@/components/dashboard/DailyTaskTracker';
import { Lock, AlertOctagon, FileText, Calendar as CalendarIcon, Wallet, TrendingUp } from 'lucide-react';

export default function StaffPortalPage() {
    const [user, setUser] = useState<any>(null);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [workReports, setWorkReports] = useState<any[]>([]);
    const [salarySlips, setSalarySlips] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [performance, setPerformance] = useState<any[]>([]);
    const [workPlans, setWorkPlans] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any>(null);
    const [fullProfile, setFullProfile] = useState<any>(null);
    const [compliance, setCompliance] = useState<any>({ isCompliant: true, pendingDocuments: [], pendingModules: [] });
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
            const [attendanceRes, reportsRes, plansRes, slipsRes, leavesRes, perfRes, docsRes, profileRes, complRes] = await Promise.all([
                fetch('/api/hr/attendance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/work-reports?employeeId=self', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/work-plans', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/salary-slips', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/leave-requests', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/performance', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/my-documents', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/profile/me', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/onboarding/compliance', { headers: { 'Authorization': `Bearer ${token}` } })
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



    const tabs = [
        { id: 'overview', name: 'Overview', icon: '🏠' },
        { id: 'profile', name: 'My Profile', icon: '👤' },
        { id: 'attendance', name: 'Attendance', icon: '📅' },
        { id: 'work-reports', name: 'Work Reports', icon: '📝' },
        { id: 'tax-declarations', name: 'Tax Declarations', icon: '🛡️' },
        { id: 'leaves', name: 'Leave Requests', icon: '🏃' },
        { id: 'performance', name: 'Performance', icon: '📈' },
        { id: 'salary', name: 'Salary', icon: '💵' },
        { id: 'documents', name: 'Documents', icon: '📁' },
        { id: 'onboarding', name: 'Onboarding', icon: '🎓' },
        { id: 'it-services', name: 'IT Services', icon: '🛠️' },
        { id: 'id-card', name: 'ID Card', icon: '🪪' },
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
                            <p className="text-secondary-500 font-medium">Welcome back, <span className="text-primary-600">{user?.name || user?.email?.split('@')[0]}</span></p>
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
                <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border border-secondary-100">
                    {tabs.map((tab) => {
                        // Compliance Lock Logic
                        const isLocked = !compliance.isCompliant &&
                            tab.id !== 'documents' &&
                            tab.id !== 'onboarding' &&
                            tab.id !== 'work-reports' &&
                            tab.id !== 'attendance'; // Allow Check-in

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isLocked && setActiveTab(tab.id)}
                                className={`
                                flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${activeTab === tab.id
                                        ? 'bg-primary-600 text-white shadow-md transform scale-105'
                                        : isLocked
                                            ? 'text-gray-400 cursor-not-allowed bg-gray-50'
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
                    {activeTab === 'documents' && <EmployeeDocuments />}

                    {activeTab === 'profile' && fullProfile && (
                        <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
                            {/* Profile Header Card */}
                            <div className="card-premium p-8 relative overflow-hidden bg-white border border-secondary-100 shadow-xl rounded-[2rem]">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full -mr-32 -mt-32 opacity-60 blur-3xl"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                                    <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-lg ring-4 ring-primary-50">
                                        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-secondary-800 to-secondary-900 flex items-center justify-center text-4xl font-black text-white overflow-hidden">
                                            {fullProfile.profilePicture ? (
                                                <Image src={fullProfile.profilePicture} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                                            ) : (
                                                (user?.name?.[0] || user?.email?.charAt(0)).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center md:text-left space-y-2 flex-1">
                                        <h2 className="text-3xl font-black text-secondary-900">{user?.name || user?.email?.split('@')[0]}</h2>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                            <span className="badge badge-primary px-3 py-1 text-sm">{fullProfile.designatRef?.name || fullProfile.designation || 'Specialist'}</span>
                                            <span className="badge badge-secondary px-3 py-1 text-sm">{user?.role?.replace('_', ' ')}</span>
                                            <span className={`badge ${fullProfile.isActive ? 'badge-success' : 'badge-danger'} px-3 py-1 text-sm`}>
                                                {fullProfile.isActive ? 'Active Staff' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-secondary-500 font-medium max-w-lg mx-auto md:mx-0 pt-2">
                                            <SafeHTML html={fullProfile.jobDescription || 'No professional summary available.'} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Personal Info */}
                                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg"><span className="text-xl">📋</span></div>
                                        <h3 className="text-lg font-bold text-secondary-900">Personal Information</h3>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-y-4">
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Email</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900 truncate" title={fullProfile.personalEmail}>{fullProfile.personalEmail || user?.email}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Phone</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.phoneNumber || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Office Ext</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.officePhone || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">DOB</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900"><FormattedDate date={fullProfile.dateOfBirth} /></dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Blood Group</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.bloodGroup || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Address</dt>
                                            <dd className="col-span-2 text-sm font-medium text-secondary-700">{fullProfile.address || '--'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Professional Info */}
                                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><span className="text-xl">💼</span></div>
                                        <h3 className="text-lg font-bold text-secondary-900">Professional Details</h3>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-y-4">
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Employee ID</dt>
                                            <dd className="col-span-2 text-sm font-black text-secondary-900 font-mono tracking-wider">{fullProfile.employeeId || 'STM-???'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Joined On</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900"><FormattedDate date={fullProfile.dateOfJoining} /></dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Experience</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.totalExperienceYears || 0} Y {fullProfile.totalExperienceMonths || 0} M</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Department</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.department?.name || 'General'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Emergency</dt>
                                            <dd className="col-span-2 text-sm font-bold text-danger-600">{fullProfile.emergencyContact || '--'}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Financial Info (Private) */}
                                <div className="card-premium p-6 hover:shadow-lg transition-all space-y-6 border-t-4 border-success-500">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-success-100 text-success-600 rounded-lg"><span className="text-xl">💰</span></div>
                                        <h3 className="text-lg font-bold text-secondary-900">Financial & Statutory</h3>
                                    </div>
                                    <dl className="grid grid-cols-1 gap-y-4">
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Bank</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.bankName || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">Account</dt>
                                            <dd className="col-span-2 text-sm font-mono text-secondary-900">{fullProfile.accountNumber ? `XXXX-XXXX-${fullProfile.accountNumber.slice(-4)}` : '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">IFSC</dt>
                                            <dd className="col-span-2 text-sm font-mono text-secondary-900">{fullProfile.ifscCode || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3 border-b border-secondary-50 pb-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">PAN Card</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.panNumber || '--'}</dd>
                                        </div>
                                        <div className="grid grid-cols-3">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase pt-1">UAN / PF</dt>
                                            <dd className="col-span-2 text-sm font-bold text-secondary-900">{fullProfile.uanNumber || '--'} / {fullProfile.pfNumber || '--'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    )}




                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                                        <a href="/dashboard/it-services/request" className="btn bg-amber-500 hover:bg-amber-600 text-white w-full py-2 text-xs font-black shadow-lg">
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
                            <EmployeeKPIView />
                        </div>
                    )}

                    {activeTab === 'tax-declarations' && <TaxDeclarationPortal />}

                    {
                        activeTab === 'attendance' && (
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
                            </div>
                        )
                    }

                    {
                        activeTab === 'work-reports' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    {/* Todays Realtime Achievement Preview */}
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

                                    <div className="card-premium p-8 text-center bg-gradient-to-br from-primary-50 to-white border-2 border-primary-100 border-dashed">
                                        <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </div>
                                        <h3 className="text-2xl font-black text-secondary-900 mb-2">Submit Daily Work Report</h3>
                                        <p className="text-secondary-500 mb-6 max-w-md mx-auto">Click below to access the detailed reporting tool. Track your revenue, meetings, and daily achievements.</p>
                                        {!todayAttendance?.checkIn && (
                                            <p className="text-[10px] text-warning-600 font-bold uppercase mb-4 flex items-center justify-center gap-1">
                                                <span>⚠️</span> Not Checked-in
                                            </p>
                                        )}
                                        <a href="/dashboard/staff-portal/submit-report" className="btn btn-primary px-8 py-3 text-lg shadow-xl shadow-primary-200 hover:shadow-primary-300 transition-all inline-block">
                                            Open Reporting Tool
                                        </a>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 space-y-4">
                                    {workReports.length === 0 ? (
                                        <div className="card-premium p-12 text-center">
                                            <div className="w-16 h-16 bg-secondary-50 text-secondary-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FileText size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-secondary-900">No Reports Yet</h3>
                                            <p className="text-secondary-500 text-sm">Your submitted work reports will appear here for review.</p>
                                        </div>
                                    ) : workReports.map(report => (
                                        <div key={report.id} className="card-premium p-6 hover:shadow-lg transition-all border-l-4 border-primary-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-secondary-900">{report.title}</h4>
                                                <span className="text-[10px] uppercase font-bold text-secondary-400"><FormattedDate date={report.date} /></span>
                                            </div>
                                            <div className="bg-secondary-50/50 p-4 rounded-xl mb-4 border border-secondary-100">
                                                <p className="text-secondary-600 text-sm whitespace-pre-wrap leading-relaxed">{report.content}</p>
                                            </div>

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

                                            {/* Comments / Clarification Thread */}
                                            <div className="mt-6 space-y-3 pt-4 border-t border-secondary-50">
                                                <h5 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Clarification Thread</h5>
                                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                                    {report.comments?.map((comment: any) => (
                                                        <div key={comment.id} className="bg-white p-3 rounded-xl border border-secondary-50 shadow-sm">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className={`text-[10px] font-black ${comment.authorId === user?.id ? 'text-primary-600' : 'text-indigo-600'}`}>
                                                                    {comment.author?.email?.split('@')[0]} {comment.authorId === user?.id ? '(You)' : '(Manager)'}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-secondary-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-[11px] text-secondary-700 leading-normal">{comment.content}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Add clarification..."
                                                        className="input text-[11px] py-1.5 flex-1"
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = (e.target as HTMLInputElement).value;
                                                                if (!val) return;
                                                                const token = localStorage.getItem('token');
                                                                const res = await fetch('/api/hr/work-reports/comments', {
                                                                    method: 'POST',
                                                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ reportId: report.id, content: val })
                                                                });
                                                                if (res.ok) {
                                                                    (e.target as HTMLInputElement).value = '';
                                                                    fetchAllData();
                                                                }
                                                            }
                                                        }}
                                                        title="Add a comment"
                                                    />
                                                </div>
                                            </div>

                                            {/* Edit Option for non-evaluated reports */}
                                            {report.status === 'SUBMITTED' && (
                                                <div className="mt-4 flex justify-end">
                                                    <button
                                                        onClick={() => {
                                                            const newContent = prompt("Update your report content:", report.content);
                                                            if (newContent !== null) {
                                                                const token = localStorage.getItem('token');
                                                                fetch('/api/hr/work-reports', {
                                                                    method: 'PUT',
                                                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ id: report.id, content: newContent })
                                                                }).then(res => {
                                                                    if (res.ok) fetchAllData();
                                                                    else alert("Failed to update");
                                                                });
                                                            }
                                                        }}
                                                        className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-tighter bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition-all shadow-sm"
                                                        title="Edit this report"
                                                    >
                                                        Edit Report details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'leaves' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="card-premium p-8 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Wallet size={64} />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-1 opacity-80">Leave Balance</h3>
                                            <p className="text-5xl font-black mb-4">{fullProfile?.leaveBalance || 0} <span className="text-lg font-bold opacity-70">Days</span></p>
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                                                <span>ℹ️</span> Paid leaves remaining for this year
                                            </div>
                                        </div>
                                    </div>

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
                                                <select name="type" className="input" required title="Leave Category Selection">
                                                    <option value="SICK">Sick Leave</option>
                                                    <option value="CASUAL">Casual Leave</option>
                                                    <option value="VACATION">Vacation / Earned Leave</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label">Start Date</label>
                                                    <input name="startDate" type="date" className="input" required title="Leave start date" />
                                                </div>
                                                <div>
                                                    <label className="label">End Date</label>
                                                    <input name="endDate" type="date" className="input" required title="Leave end date" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="label">Reason</label>
                                                <textarea name="reason" className="input h-32" required placeholder="Describe the reason for leave..." title="Reason for leave request" />
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
                        )
                    }

                    {
                        activeTab === 'performance' && (
                            <div className="space-y-8 max-w-6xl mx-auto">
                                {/* Performance Targets Dashboard */}
                                {fullProfile?.metrics && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {(fullProfile.metrics as any).revenueTarget && (
                                            <div className="card-premium p-6 border-t-4 border-indigo-500 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <div className="text-4xl font-black text-indigo-900">₹</div>
                                                </div>
                                                <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-4">Revenue Goal</h3>

                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <span className="text-3xl font-black text-secondary-900">
                                                            {((workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() ? (r.revenueGenerated || 0) : 0), 0) / parseFloat((fullProfile.metrics as any).revenueTarget || 1)) * 100).toFixed(0)}%
                                                        </span>
                                                        <span className="text-xs font-bold text-secondary-400 ml-1">Achieved</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-secondary-400 uppercase">Target</p>
                                                        <p className="font-bold text-indigo-600">₹{parseFloat((fullProfile.metrics as any).revenueTarget).toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-primary-500 h-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() ? (r.revenueGenerated || 0) : 0), 0) / parseFloat((fullProfile.metrics as any).revenueTarget || 1)) * 100)}%` } as React.CSSProperties}
                                                    />
                                                </div>

                                                <p className="text-xs text-secondary-500 font-medium">
                                                    Current: <span className="text-secondary-900 font-bold">₹{workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() ? (r.revenueGenerated || 0) : 0), 0).toLocaleString()}</span>
                                                </p>
                                            </div>
                                        )}

                                        {(fullProfile.metrics as any).publicationTarget && (
                                            <div className="card-premium p-6 border-t-4 border-purple-500 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <div className="text-4xl font-black text-purple-900">📄</div>
                                                </div>
                                                <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-4">Paper Success</h3>

                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <span className="text-3xl font-black text-secondary-900">
                                                            {workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() && (r.category === 'PUBLICATION' || r.keyOutcome?.includes('Accepted')) ? 1 : 0), 0)}
                                                        </span>
                                                        <span className="text-xs font-bold text-secondary-400 ml-1">/ {(fullProfile.metrics as any).publicationTarget}</span>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-indigo-500 h-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() && (r.category === 'PUBLICATION' || r.keyOutcome?.includes('Accepted')) ? 1 : 0), 0) / parseFloat((fullProfile.metrics as any).publicationTarget || 1)) * 100)}%` } as React.CSSProperties}
                                                    />
                                                </div>
                                                <p className="text-xs text-secondary-500 font-medium">
                                                    Based on &apos;Publication&apos; reports or &apos;Accepted&apos; outcomes.
                                                </p>
                                            </div>
                                        )}

                                        {(fullProfile.metrics as any).developmentTarget && (
                                            <div className="card-premium p-6 border-t-4 border-emerald-500 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <div className="text-4xl font-black text-emerald-900">🚀</div>
                                                </div>
                                                <h3 className="text-sm font-bold text-secondary-500 uppercase tracking-widest mb-4">Development Projects</h3>

                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <span className="text-3xl font-black text-secondary-900">
                                                            {workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() && (r.category === 'DEVELOPMENT') ? 1 : 0), 0)}
                                                        </span>
                                                        <span className="text-xs font-bold text-secondary-400 ml-1">/ {(fullProfile.metrics as any).developmentTarget}</span>
                                                    </div>
                                                </div>

                                                <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-purple-500 h-full transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (workReports.reduce((acc, r) => acc + (new Date(r.date).getMonth() === new Date().getMonth() && (r.category === 'DEVELOPMENT') ? 1 : 0), 0) / parseFloat((fullProfile.metrics as any).developmentTarget || 1)) * 100)}%` } as React.CSSProperties}
                                                    />
                                                </div>
                                                <p className="text-xs text-secondary-500 font-medium">
                                                    Projects delivered this month.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2 border-b border-secondary-100 pb-4">
                                    <span className="text-2xl">⭐</span> Manager Reviews
                                </h3>
                                <div className="space-y-6">
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
                                                    <p className="text-sm font-bold text-secondary-900">{review.reviewer?.email || 'Unknown Reviewer'}</p>
                                                    <p className="text-[10px] text-secondary-400 font-bold uppercase">{review.reviewer?.role?.replace('_', ' ') || 'MANAGER'}</p>
                                                </div>
                                            </div>
                                            <p className="text-lg text-secondary-700 leading-relaxed font-medium bg-primary-50/30 p-6 rounded-2xl border border-primary-100/50 italic">
                                                &quot;{review.feedback || 'No feedback provided'}&quot;
                                            </p>
                                        </div>
                                    ))}
                                    {performance.length === 0 && (
                                        <div className="card-premium p-20 text-center text-secondary-400 font-medium italic">
                                            Detailed performance reviews will appear here once submitted by your manager.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'salary' && (
                            <div className="space-y-6">
                                <div className="space-y-8">
                                    {/* Current Salary Structure */}
                                    {fullProfile && (
                                        <div className="card-premium p-8 bg-gradient-to-br from-primary-900 to-secondary-900 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                            <div className="relative z-10">
                                                <h3 className="font-bold text-primary-200 uppercase tracking-widest text-sm mb-6">Current Salary Structure</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                                    <div>
                                                        <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Base Salary (Annual)</p>
                                                        <p className="text-2xl font-black">₹{(fullProfile.baseSalary || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Variable Pay</p>
                                                        <p className="text-2xl font-black text-primary-300">₹{(fullProfile.variableSalary || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Incentive Target</p>
                                                        <p className="text-2xl font-black text-success-300">₹{((fullProfile.monthlyTarget || 0) * 12).toLocaleString()}</p>
                                                        <span className="text-[10px] opacity-70">Annualized target based on monthly</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-secondary-400 text-xs font-bold uppercase mb-1">Total CTC</p>
                                                        <p className="text-3xl font-black text-white">₹{((fullProfile.baseSalary || 0) + (fullProfile.variableSalary || 0)).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Increment History */}
                                    {fullProfile?.incrementHistory?.length > 0 && (
                                        <div className="card-premium overflow-hidden">
                                            <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/30">
                                                <h3 className="font-bold text-secondary-900 flex items-center gap-2">
                                                    <TrendingUp size={18} className="text-primary-600" />
                                                    Increment History
                                                </h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Type</th>
                                                            <th className="text-right">Previous</th>
                                                            <th className="text-right">Revised</th>
                                                            <th className="text-right">Change</th>
                                                            <th className="text-right">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {fullProfile.incrementHistory.map((rec: any) => (
                                                            <tr key={rec.id}>
                                                                <td className="font-medium"><FormattedDate date={rec.effectiveDate} /></td>
                                                                <td><span className="badge badge-secondary">{rec.type}</span></td>
                                                                <td className="text-right text-secondary-500">₹{rec.oldSalary.toLocaleString()}</td>
                                                                <td className="text-right font-bold text-secondary-900">₹{rec.newSalary.toLocaleString()}</td>
                                                                <td className="text-right">
                                                                    <span className={`font-bold ${rec.percentage >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                                        {rec.percentage > 0 ? '+' : ''}{rec.percentage}%
                                                                    </span>
                                                                </td>
                                                                <td className="text-right"><span className="badge badge-success">{rec.status}</span></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Salary Slips */}
                                    <div>
                                        <h3 className="font-bold text-lg text-secondary-900 mb-4">Salary Slips</h3>
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
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'work-agenda' && (
                            <WorkPlanSection
                                plans={workPlans}
                                onPlanSubmitted={fetchAllData}
                                user={user}
                            />
                        )
                    }

                    {
                        activeTab === 'documents' && (
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
                        )
                    }
                    {activeTab === 'documents' && <DigitalWallet />}

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
                                        <a href="/dashboard/it-services/request" className="btn btn-primary px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
                                            <span>➕</span> Request New Service
                                        </a>
                                        <a href="/dashboard/it-services" className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border border-white/10">
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
                </div >
            </div >
        </DashboardLayout >
    );
}
