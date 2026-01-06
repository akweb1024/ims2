'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import OnboardingManager from '@/components/dashboard/OnboardingManager';
import DocumentManager from '@/components/dashboard/DocumentManager';

const FormattedTime = ({ date }: { date: string | Date | null }) => {
    if (!date) return <span>--:--</span>;
    return <span>{new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
};

export default function HRManagementPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [activeTab, setActiveTab] = useState('employees');
    const [stats, setStats] = useState({ present: 0, total: 0 });
    const [leaves, setLeaves] = useState<any[]>([]);
    const [allSlips, setAllSlips] = useState<any[]>([]);
    const [allAttendance, setAllAttendance] = useState<any[]>([]);
    const [allReviews, setAllReviews] = useState<any[]>([]);
    const [hrInsights, setHrInsights] = useState<any>(null);
    const [empDocuments, setEmpDocuments] = useState<any[]>([]);
    const [selectedDocEmp, setSelectedDocEmp] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [applications, setApplications] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [prodAnalysis, setProdAnalysis] = useState<any>(null);
    const [prodDateRange, setProdDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // Modal state
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, feedback: '' });
    const [selectedEmp, setSelectedEmp] = useState<any>(null);
    const [empForm, setEmpForm] = useState({
        email: '',
        password: '',
        role: 'SALES_EXECUTIVE',
        designation: '',
        baseSalary: '',
        bankName: '',
        accountNumber: '',
        panNumber: '',
        offerLetterUrl: '',
        contractUrl: '',
        jobDescription: '',
        kra: ''
    });

    // Attendance correction
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    const [attendanceForm, setAttendanceForm] = useState({ id: '', checkIn: '', checkOut: '', status: 'PRESENT' });

    // Job Posting
    const [showJobModal, setShowJobModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [jobForm, setJobForm] = useState({
        title: '',
        description: '',
        requirements: '',
        location: '',
        salaryRange: '',
        type: 'FULL_TIME',
        status: 'OPEN'
    });

    // Work Reports Analysis
    const [workReports, setWorkReports] = useState<any[]>([]);
    const [reportFilter, setReportFilter] = useState({ employeeId: 'all', category: 'ALL', startDate: '', endDate: '' });

    const fetchWorkReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const query = new URLSearchParams(reportFilter as any).toString();
            const res = await fetch(`/api/hr/work-reports?${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setWorkReports(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            if (!parsedUser.companyId && parsedUser.role !== 'SUPER_ADMIN') {
                alert("This module is only accessible to members associated with a company.");
                window.location.href = '/dashboard';
                return;
            }
            setUserRole(parsedUser.role);
            fetchEmployees();
        } else {
            window.location.href = '/login';
        }
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
                // Basic stats for today (mocking for now as we don't have date filtering here)
                setStats({ total: data.length, present: data.filter((e: any) => e._count.attendance > 0).length });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaves = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/leave-requests?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setLeaves(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSlips = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/salary-slips?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAllSlips(await res.json());

            const revRes = await fetch('/api/hr/performance?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (revRes.ok) setAllReviews(await revRes.json());

            // Only fetch insights if analytics tab is active
            if (activeTab === 'analytics') {
                const insightsRes = await fetch('/api/ai-insights?type=hr', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (insightsRes.ok) setHrInsights(await insightsRes.json());
            }

        } catch (err) {
            console.error(err);
        }
    };

    const fetchDocuments = async (empId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/documents?employeeId=${empId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setEmpDocuments(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const handleDocumentUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedDocEmp) return;
        const formData = new FormData(e.currentTarget);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/hr/documents', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedDocEmp.id,
                    name: formData.get('name'),
                    fileUrl: formData.get('fileUrl'),
                    fileType: 'DOCUMENT'
                })
            });
            if (res.ok) {
                e.currentTarget.reset();
                fetchDocuments(selectedDocEmp.id);
                alert('Document uploaded!');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/documents?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchDocuments(selectedDocEmp.id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAttendance = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/attendance?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAllAttendance(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRecruitmentData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [jobsRes, appsRes] = await Promise.all([
                fetch('/api/recruitment/jobs?all=true', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/recruitment/applications', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (jobsRes.ok) setJobs(await jobsRes.json());
            if (appsRes.ok) setApplications(await appsRes.json());
        } catch (err) {
            console.error(err);
        }
    };



    useEffect(() => {
        if (activeTab === 'leaves') fetchLeaves();
        if (activeTab === 'analytics' || activeTab === 'payroll') fetchSlips();
        if (activeTab === 'attendance') fetchAttendance();
        if (activeTab === 'recruitment') fetchRecruitmentData();
        if (activeTab === 'documents' && selectedDocEmp) fetchDocuments(selectedDocEmp.id);
        if (activeTab === 'reports') fetchWorkReports();
        if (activeTab === 'holidays') fetchHolidays();
        if (activeTab === 'productivity') fetchProductivity();
    }, [activeTab, selectedDocEmp, prodDateRange]);

    const fetchHolidays = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/holidays', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setHolidays(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchProductivity = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/productivity?startDate=${prodDateRange.startDate}&endDate=${prodDateRange.endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setProdAnalysis(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/leave-requests', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveId, status })
            });
            if (res.ok) {
                fetchLeaves();
            }
        } catch (err) {
            console.error(err);
        }
    };



    const handleEmpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = '/api/hr/employees';
            const method = selectedEmp ? 'PATCH' : 'POST';
            const body = selectedEmp ? { id: selectedEmp.id, ...empForm } : empForm;

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowEmpModal(false);
                setSelectedEmp(null);
                fetchEmployees();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReportAction = async (reportId: string, status: 'APPROVED' | 'REVIEWED', rating?: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/work-reports', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: reportId,
                    status,
                    managerComment: status === 'APPROVED' ? 'Approved & Verified' : 'Reviewed',
                    managerRating: rating || 3
                })
            });
            if (res.ok) {
                fetchEmployees(); // Refresh reports
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmp) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmp.id,
                    rating: reviewForm.rating,
                    feedback: reviewForm.feedback
                })
            });

            if (res.ok) {
                setShowReviewModal(false);
                setSelectedEmp(null);
                setReviewForm({ rating: 5, feedback: '' });
                alert('Review submitted successfully!');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeactivateEmp = async (empId: string) => {
        if (!confirm('Are you sure you want to deactivate this employee? They will lose access.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees?id=${empId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Employee deactivated successfully');
                fetchEmployees();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAttendanceUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/attendance', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: attendanceForm.id,
                    checkIn: attendanceForm.checkIn ? new Date(attendanceForm.checkIn).toISOString() : null,
                    checkOut: attendanceForm.checkOut ? new Date(attendanceForm.checkOut).toISOString() : null,
                    status: attendanceForm.status
                })
            });
            if (res.ok) {
                setShowAttendanceModal(false);
                fetchAttendance();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateJob = () => {
        setSelectedJob(null);
        setJobForm({
            title: '',
            description: '',
            requirements: '',
            location: '',
            salaryRange: '',
            type: 'FULL_TIME',
            status: 'OPEN'
        });
        setShowJobModal(true);
    };

    const handleEditJob = (job: any) => {
        setSelectedJob(job);
        setJobForm({
            title: job.title,
            description: job.description,
            requirements: job.requirements || '',
            location: job.location || '',
            salaryRange: job.salaryRange || '',
            type: job.type,
            status: job.status
        });
        setShowJobModal(true);
    };

    const handleJobSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const url = '/api/recruitment/jobs';
            const method = selectedJob ? 'PATCH' : 'POST';
            const body = selectedJob ? { ...jobForm, id: selectedJob.id } : jobForm;

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowJobModal(false);
                fetchRecruitmentData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkPayroll = async () => {
        if (!confirm('Generate salary slips for all active employees for the current month?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/salary-slips', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'BULK_GENERATE',
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                // Refresh if on payroll tab (will implement context refresh if needed, for now just basic alert)
                if (activeTab === 'payroll') fetchSlips();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">HR Command Center</h1>
                        <p className="text-secondary-600">Enterprise-grade workforce management & monitoring.</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setSelectedEmp(null);
                                setEmpForm({ email: '', password: '', role: 'SALES_EXECUTIVE', designation: '', baseSalary: '', bankName: '', accountNumber: '', panNumber: '', offerLetterUrl: '', contractUrl: '', jobDescription: '', kra: '' });
                                setShowEmpModal(true);
                            }}
                            className="btn btn-primary shadow-xl"
                        >
                            + Onboard Employee
                        </button>
                    </div>
                </div>

                {/* Quick Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Total Workforce</p>
                        <p className="text-3xl font-black text-secondary-900">{stats.total}</p>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-success-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Active Today</p>
                        <p className="text-3xl font-black text-secondary-900">{stats.present}</p>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Pending Leaves</p>
                        <p className="text-3xl font-black text-secondary-900">{leaves.filter(l => l.status === 'PENDING').length}</p>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-accent-500">
                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Monthly Payroll</p>
                        <p className="text-3xl font-black text-secondary-900">₹{allSlips.reduce((acc, curr) => acc + curr.amountPaid, 0).toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-secondary-100 w-fit overflow-x-auto max-w-full">
                    {['employees', 'documents', 'recruitment', 'onboarding', 'map', 'reports', 'leaves', 'attendance', 'payroll', 'analytics', 'holidays', 'productivity'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-xl font-bold transition-all uppercase text-[10px] tracking-widest whitespace-nowrap ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'text-secondary-400 hover:bg-secondary-50'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'employees' && (
                    <div className="card-premium overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr className="text-[10px] uppercase font-black text-secondary-400 border-b border-secondary-50">
                                    <th className="pb-4">Staff Member</th>
                                    <th className="pb-4">Role & Designation</th>
                                    <th className="pb-4">Financials</th>
                                    <th className="pb-4">Stats</th>
                                    <th className="pb-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-20 text-secondary-400 font-bold animate-pulse italic">Scanning workforce assets...</td></tr>
                                ) : employees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-secondary-50/50 transition-colors group">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-xl flex items-center justify-center font-black text-secondary-600">
                                                    {emp.user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary-900">{emp.user.email}</p>
                                                    <div className="flex gap-2">
                                                        <p className="text-[10px] text-secondary-400 font-bold">Pan: {emp.panNumber || 'NOTSET'}</p>
                                                        <span className={`text-[10px] font-black px-1 rounded ${emp.user.isActive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}`}>{emp.user.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-[10px] font-black rounded uppercase">{emp.user.role}</span>
                                            <p className="text-xs font-bold text-secondary-600 mt-1">{emp.designation || 'Specialist'}</p>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm font-black text-secondary-900">₹{parseFloat(emp.baseSalary || 0).toLocaleString()}</p>
                                            <p className="text-[10px] text-secondary-400 font-bold uppercase">{emp.bankName || 'No Bank Set'}</p>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-secondary-900">{emp._count.attendance}</p>
                                                    <p className="text-[9px] font-black text-secondary-400 uppercase">Days</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-secondary-900">{emp._count.workReports}</p>
                                                    <p className="text-[9px] font-black text-secondary-400 uppercase">Reports</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedEmp(emp);
                                                        setEmpForm({
                                                            email: emp.user.email,
                                                            password: '',
                                                            role: emp.user.role,
                                                            designation: emp.designation || '',
                                                            baseSalary: emp.baseSalary || '',
                                                            bankName: emp.bankName || '',
                                                            accountNumber: emp.accountNumber || '',
                                                            panNumber: emp.panNumber || '',
                                                            offerLetterUrl: emp.offerLetterUrl || '',
                                                            contractUrl: emp.contractUrl || '',
                                                            jobDescription: emp.jobDescription || '',
                                                            kra: emp.kra || ''
                                                        });
                                                        setShowEmpModal(true);
                                                    }}
                                                    className="p-2 hover:bg-white rounded-lg text-primary-600"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedEmp(emp);
                                                        setShowReviewModal(true);
                                                    }}
                                                    className="p-2 hover:bg-white rounded-lg text-warning-500 tooltip-left"
                                                    title="Evaluate Performance"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const amount = prompt("Salary Amount:");
                                                        if (amount) fetch('/api/hr/salary-slips', {
                                                            method: 'POST',
                                                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ employeeId: emp.id, month: new Date().getMonth() + 1, year: new Date().getFullYear(), amountPaid: amount, status: 'PAID' })
                                                        }).then(r => r.ok && alert('Paid!'));
                                                    }}
                                                    className="p-2 hover:bg-white rounded-lg text-success-600"
                                                    title="Quick Pay"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeactivateEmp(emp.id)}
                                                    className="p-2 hover:bg-white rounded-lg text-danger-500"
                                                    title="Deactivate / Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <DocumentManager employees={employees} />
                        <hr className="border-secondary-200" />
                        <h3 className="text-lg font-bold">Employee Uploaded Documents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                            {/* Employee List Sidebar */}
                            <div className="md:col-span-1 card-premium overflow-y-auto">
                                <h3 className="font-bold text-secondary-900 mb-4 sticky top-0 bg-white z-10 py-2 border-b">Select Employee</h3>
                                <div className="space-y-2">
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => {
                                                setSelectedDocEmp(emp);
                                                fetchDocuments(emp.id);
                                            }}
                                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedDocEmp?.id === emp.id ? 'bg-primary-50 border border-primary-200 shadow-sm' : 'hover:bg-secondary-50 border border-transparent'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedDocEmp?.id === emp.id ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'}`}>
                                                {emp.user.email[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className={`text-sm font-bold truncate ${selectedDocEmp?.id === emp.id ? 'text-primary-900' : 'text-secondary-900'}`}>{emp.user.email.split('@')[0]}</p>
                                                <p className="text-[10px] text-secondary-400 truncate">{emp.designation}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Document View Area */}
                            <div className="md:col-span-2 space-y-6">
                                {selectedDocEmp ? (
                                    <>
                                        <div className="card-premium bg-primary-900 text-white flex justify-between items-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')]">
                                            <div>
                                                <h3 className="text-xl font-black">{selectedDocEmp.user.email}</h3>
                                                <p className="text-primary-200 text-sm">Employee Digital File</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black">{empDocuments.length}</p>
                                                <p className="text-[10px] uppercase tracking-widest opacity-60">Documents Stored</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleDocumentUpload} className="bg-white p-4 rounded-2xl border border-dashed border-secondary-300 flex gap-2 items-center">
                                            <div className="flex-1">
                                                <input name="name" className="input text-xs py-2" placeholder="Document Name (e.g. ID Proof)" required />
                                            </div>
                                            <div className="flex-1">
                                                <input name="fileUrl" className="input text-xs py-2" placeholder="Document URL (https://...)" required />
                                            </div>
                                            <button className="btn btn-primary py-2 px-4 rounded-lg text-xs font-bold whitespace-nowrap">+ Upload</button>
                                        </form>

                                        <div className="space-y-3 overflow-y-auto h-[350px] pr-2">
                                            {empDocuments.length === 0 ? (
                                                <div className="text-center py-10 text-secondary-300 font-bold italic">No documents uploaded for this employee.</div>
                                            ) : empDocuments.map(doc => (
                                                <div key={doc.id} className="group bg-white p-4 rounded-xl border border-secondary-100 hover:border-primary-300 hover:shadow-md transition-all flex justify-between items-center">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-secondary-50 text-2xl flex items-center justify-center rounded-lg">📄</div>
                                                        <div>
                                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="font-bold text-secondary-900 hover:text-primary-600 hover:underline">{doc.name}</a>
                                                            <p className="text-[10px] text-secondary-400">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteDocument(doc.id)} className="text-danger-400 hover:text-danger-600 p-2 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-secondary-400 font-bold bg-secondary-50/50 rounded-3xl border border-dashed border-secondary-200">
                                        select an employee to view documents
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )} { /* End of documents tab */}

                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        {/* Filters & Controls */}
                        <div className="card-premium p-6 flex flex-wrap gap-4 items-end bg-secondary-50/50">
                            <div className="flex-1 min-w-[200px]">
                                <label className="label">Employee</label>
                                <select
                                    className="input bg-white"
                                    value={reportFilter.employeeId}
                                    onChange={(e) => setReportFilter({ ...reportFilter, employeeId: e.target.value })}
                                >
                                    <option value="all">Check All Employees</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.user.email} - {e.designation}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label">Start Date</label>
                                <input
                                    type="date"
                                    className="input bg-white"
                                    value={reportFilter.startDate || ''}
                                    onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">End Date</label>
                                <input
                                    type="date"
                                    className="input bg-white"
                                    value={reportFilter.endDate || ''}
                                    onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Category</label>
                                <select
                                    className="input bg-white"
                                    value={reportFilter.category}
                                    onChange={(e) => setReportFilter({ ...reportFilter, category: e.target.value })}
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="SALES">Sales</option>
                                    <option value="DEVELOPMENT">Development</option>
                                    <option value="SUPPORT">Support</option>
                                    <option value="GENERAL">General</option>
                                </select>
                            </div>
                            <button onClick={fetchWorkReports} className="btn btn-primary h-[42px] px-8 shadow-lg">Refresh Analytics</button>
                        </div>

                        {/* Analytic Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            <div className="card-premium p-3 border-l-4 border-indigo-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Reports</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.length}</p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-purple-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Hours</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.reduce((acc, r) => acc + (r.hoursSpent || 0), 0).toFixed(1)}</p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-amber-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Revenue</p>
                                <p className="text-xl font-black text-secondary-900">
                                    ₹{workReports.reduce((acc, r) => acc + (r.revenueGenerated || 0), 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-emerald-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Tasks</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.reduce((acc, r) => acc + (r.tasksCompleted || 0), 0)}</p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-rose-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Tickets</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.reduce((acc, r) => acc + (r.ticketsResolved || 0), 0)}</p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-blue-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Chats</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.reduce((acc, r) => acc + (r.chatsHandled || 0), 0)}</p>
                            </div>
                            <div className="card-premium p-3 border-l-4 border-cyan-500">
                                <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Followups</p>
                                <p className="text-xl font-black text-secondary-900">{workReports.reduce((acc, r) => acc + (r.followUpsCompleted || 0), 0)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {workReports.length === 0 ? (
                                <div className="col-span-full py-20 text-center card-premium text-secondary-400 italic">No work reports found for the selected criteria.</div>
                            ) : workReports.map(report => (
                                <div key={report.id} className="card-premium group">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 text-[10px] font-black rounded ${report.status === 'APPROVED' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{report.status}</span>
                                        <span className="text-[10px] font-bold text-secondary-400 uppercase"><FormattedDate date={report.date} /></span>
                                    </div>
                                    <h4 className="font-bold text-secondary-900 mb-1">{report.title}</h4>
                                    <p className="text-secondary-500 text-sm line-clamp-3 mb-2">{report.content}</p>

                                    {/* Metrics pill list */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {report.revenueGenerated > 0 && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-100">₹{report.revenueGenerated.toLocaleString()}</span>}
                                        {report.tasksCompleted > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-100">{report.tasksCompleted} Tasks</span>}
                                        {report.ticketsResolved > 0 && <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-rose-100">{report.ticketsResolved} Tickets</span>}
                                        {report.chatsHandled > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-blue-100">{report.chatsHandled} Chats</span>}
                                        {report.followUpsCompleted > 0 && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-cyan-100">{report.followUpsCompleted} Followups</span>}
                                        {report.hoursSpent > 0 && <span className="bg-secondary-50 text-secondary-600 px-2 py-0.5 rounded-full text-[10px] font-black border border-secondary-100">{report.hoursSpent} Hrs</span>}
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-secondary-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-secondary-100 rounded-full flex items-center justify-center text-[10px] font-bold">{report.employee?.user.email?.[0].toUpperCase() || '?'}</div>
                                            <span className="text-[10px] font-bold text-secondary-50">{report.employee?.user.email?.split('@')[0] || 'Unknown'}</span>
                                            {report.selfRating && <span className="text-[9px] bg-secondary-100 text-secondary-600 px-1 rounded ml-2">Self: {report.selfRating}/10</span>}
                                        </div>
                                        {report.status !== 'APPROVED' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleReportAction(report.id, 'APPROVED', 5)}
                                                    className="btn btn-success py-1 px-3 text-[10px] font-bold"
                                                    title="Approve with 5 Stars"
                                                >
                                                    Approve ⭐⭐⭐⭐⭐
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const rating = prompt("Rate impact (1-5):", "3");
                                                        if (rating) handleReportAction(report.id, 'APPROVED', parseInt(rating));
                                                    }}
                                                    className="btn btn-primary py-1 px-3 text-[10px]"
                                                >
                                                    Rate & Approve
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-warning-400 text-xs">
                                                <span>Manager Rating:</span>
                                                <span className="font-bold">{'★'.repeat(report.managerRating || 0)}{'☆'.repeat(5 - (report.managerRating || 0))}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="card-premium overflow-hidden">
                        <table className="table">
                            <thead>
                                <tr className="text-[10px] uppercase font-black text-secondary-400">
                                    <th className="pb-4">Employee</th>
                                    <th className="pb-4">Type</th>
                                    <th className="pb-4">Duration</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {leaves.map(leave => (
                                    <tr key={leave.id} className="hover:bg-secondary-50/50">
                                        <td className="py-4">
                                            <p className="font-bold text-secondary-900">{leave.employee.user.email}</p>
                                        </td>
                                        <td className="py-4 font-bold text-secondary-600 text-xs uppercase">{leave.type}</td>
                                        <td className="py-4">
                                            <p className="text-xs font-black text-secondary-900">
                                                <FormattedDate date={leave.startDate} /> → <FormattedDate date={leave.endDate} />
                                            </p>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${leave.status === 'APPROVED' ? 'bg-success-50 text-success-700' : leave.status === 'PENDING' ? 'bg-warning-50 text-warning-700' : 'bg-danger-50 text-danger-700'}`}>{leave.status}</span>
                                        </td>
                                        <td className="py-4 text-right">
                                            {leave.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleLeaveStatus(leave.id, 'APPROVED')} className="btn btn-success py-1 text-[10px]">Approve</button>
                                                    <button onClick={() => handleLeaveStatus(leave.id, 'REJECTED')} className="btn btn-danger py-1 text-[10px]">Reject</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {allAttendance.map(record => (
                                <div key={record.id} className="card-premium p-6 flex justify-between items-center group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-secondary-900 text-white rounded-2xl flex items-center justify-center text-xl font-black">
                                            {record.employee.user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900">{record.employee.user.email}</p>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase"><FormattedDate date={record.date} /></p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-xs font-black text-secondary-900">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                                                <p className="text-[8px] font-black text-secondary-400 uppercase">Check In</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-secondary-900">{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Work...'}</p>
                                                <p className="text-[8px] font-black text-secondary-400 uppercase">Check Out</p>
                                            </div>
                                        </div>
                                        <span className={`mt-2 block text-[9px] font-black px-2 py-0.5 rounded uppercase ${record.status === 'PRESENT' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{record.workFrom}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setAttendanceForm({
                                                id: record.id,
                                                checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : '',
                                                checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
                                                status: record.status
                                            });
                                            setShowAttendanceModal(true);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-secondary-100 rounded text-secondary-500 hover:text-secondary-900"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'payroll' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-accent-50 p-6 rounded-3xl border border-accent-100">
                            <div>
                                <h3 className="text-xl font-black text-accent-900">Monthly Payroll Processing</h3>
                                <p className="text-accent-700 font-medium text-sm">Actioning for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                            </div>
                            <button onClick={handleBulkPayroll} className="btn bg-accent-600 text-white hover:bg-accent-700 font-black shadow-xl px-8 py-4 rounded-2xl flex items-center gap-2">
                                <span>⚡</span> Run Payroll Batch
                            </button>
                        </div>

                        <div className="card-premium overflow-hidden">
                            <table className="table">
                                <thead>
                                    <tr className="text-[10px] uppercase font-black text-secondary-400 border-b border-secondary-50">
                                        <th className="pb-4">Employee</th>
                                        <th className="pb-4">Base Salary</th>
                                        <th className="pb-4">Period</th>
                                        <th className="pb-4">Status</th>
                                        <th className="pb-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-50">
                                    {allSlips.filter(s => s.month === new Date().getMonth() + 1 && s.year === new Date().getFullYear()).length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-10 text-secondary-400 font-bold italic">No slips generated for this month yet. Run the batch!</td></tr>
                                    ) : allSlips.filter(s => s.month === new Date().getMonth() + 1 && s.year === new Date().getFullYear()).map(slip => (
                                        <tr key={slip.id} className="hover:bg-secondary-50/50 transition-colors">
                                            <td className="py-4">
                                                <p className="font-bold text-secondary-900">{slip.employee?.user?.email || 'Unknown'}</p>
                                            </td>
                                            <td className="py-4 font-black text-secondary-900">₹{slip.amountPaid.toLocaleString()}</td>
                                            <td className="py-4 text-xs font-bold text-secondary-500 uppercase">{slip.month}/{slip.year}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${slip.status === 'PAID' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{slip.status}</span>
                                            </td>
                                            <td className="py-4 text-right">
                                                <button className="text-primary-600 font-bold text-[10px] uppercase hover:underline">View Slip</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-8">
                        {/* AI Insights Section */}
                        {hrInsights && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="card-premium bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-0">
                                    <h4 className="text-white/80 font-bold uppercase text-[10px] tracking-widest mb-2">Avg Productivity</h4>
                                    <div className="text-4xl font-black mb-1">{hrInsights.metrics?.avgDailyProductivity || 0} hrs</div>
                                    <p className="text-xs text-indigo-100">Per employee / day (Last 30 days)</p>
                                </div>
                                <div className="card-premium bg-gradient-to-br from-pink-500 to-rose-600 text-white border-0">
                                    <h4 className="text-white/80 font-bold uppercase text-[10px] tracking-widest mb-2">Retention Risk</h4>
                                    <h4 className="text-white/80 font-bold uppercase text-[10px] tracking-widest mb-2">Retention Risk</h4>
                                    <div className="text-4xl font-black mb-1">{hrInsights.metrics?.flightRiskCount || 0}</div>
                                    <p className="text-xs text-rose-100">Employees showing disengagement signs</p>
                                </div>
                                <div className="card-premium bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0">
                                    <h4 className="text-white/80 font-bold uppercase text-[10px] tracking-widest mb-2">Active Departments</h4>
                                    <div className="text-4xl font-black mb-1">{hrInsights.metrics?.teamCount || 0}</div>
                                    <p className="text-xs text-emerald-100">Teams analyzed for performance</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Team Breakdown */}
                            {hrInsights?.teamAnalysis && (
                                <div className="card-premium">
                                    <div className="p-6 border-b border-secondary-50">
                                        <h3 className="text-lg font-black text-secondary-900 uppercase tracking-widest">Team Pulse</h3>
                                    </div>
                                    <table className="table w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-bold text-secondary-400 border-b border-secondary-50">
                                                <th className="p-4">Department / Role</th>
                                                <th className="p-4 text-center">Headcount</th>
                                                <th className="p-4 text-center">Avg Rating</th>
                                                <th className="p-4 text-center">Attendance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-50">
                                            {hrInsights.teamAnalysis.map((team: any, i: number) => (
                                                <tr key={i} className="hover:bg-secondary-50/50">
                                                    <td className="p-4 font-bold text-secondary-900 capitalize">{team.role}</td>
                                                    <td className="p-4 text-center text-sm font-bold text-secondary-600">{team.headcount}</td>
                                                    <td className="p-4 text-center text-sm font-bold text-warning-600">★ {team.avgRating}</td>
                                                    <td className="p-4 text-center text-sm font-bold text-success-600">{team.avgAttendance}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Top Performers */}
                            {hrInsights?.topPerformers && (
                                <div className="card-premium h-full">
                                    <div className="p-6 border-b border-secondary-50 flex justify-between items-center">
                                        <h3 className="text-lg font-black text-secondary-900 uppercase tracking-widest">Top Contributors</h3>
                                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">This Month</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {hrInsights.topPerformers.map((emp: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-secondary-100 hover:shadow-md transition-all bg-white">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-secondary-900 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-primary-50 text-primary-700'}`}>
                                                    #{i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-secondary-900">{emp.name}</p>
                                                    <p className="text-[10px] text-secondary-400 font-bold uppercase">{emp.role.replace('_', ' ')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-secondary-900 text-lg">{emp.score}</p>
                                                    <p className="text-[9px] text-secondary-400 font-medium">{emp.details}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* AI Alerts List */}
                        {hrInsights?.insights && (
                            <div className="card-premium overflow-hidden">
                                <div className="p-6 border-b border-secondary-50 bg-secondary-900 text-white">
                                    <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2"><span>🚨</span> Intelligence Alerts</h3>
                                </div>
                                <div className="divide-y divide-secondary-50">
                                    {hrInsights.insights.length === 0 ? (
                                        <p className="p-8 text-center text-secondary-400 italic font-bold">No critical risks detected at this moment.</p>
                                    ) : hrInsights.insights.map((insight: any, idx: number) => (
                                        <div key={idx} className={`p-6 flex gap-4 ${insight.severity === 'critical' ? 'bg-danger-50/50' : ''}`}>
                                            <div className="text-2xl">{insight.icon}</div>
                                            <div>
                                                <p className="font-bold text-secondary-900">{insight.title}</p>
                                                <p className="text-sm text-secondary-600">{insight.description}</p>
                                                {insight.severity === 'critical' && <span className="inline-block mt-2 px-2 py-0.5 rounded bg-danger-600 text-white text-[9px] font-black uppercase">Immediate Action Required</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Salary Trends Visualization */}
                        <div className="card-premium p-8">
                            <h3 className="text-lg font-black text-secondary-900 mb-6 uppercase tracking-widest">Monthly Payroll Distribution</h3>
                            <div className="flex items-end gap-4 h-48">
                                {(() => {
                                    const monthlyTotals = [1, 2, 3, 4, 5, 6].map(m =>
                                        allSlips.filter(s => s.month === m).reduce((acc, curr) => acc + curr.amountPaid, 0)
                                    );
                                    const maxTotal = Math.max(...monthlyTotals, 1);

                                    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => {
                                        const currentTotal = monthlyTotals[i];
                                        const height = (currentTotal / maxTotal) * 100;
                                        return (
                                            <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                                                <div className="w-full bg-primary-100 rounded-t-lg transition-all group-hover:bg-primary-500 relative" style={{ height: `${Math.max(5, height)}%` }}>
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                        ₹{currentTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-black text-secondary-400 uppercase">{m}</p>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Recent Reviews */}
                        <div className="card-premium">
                            <div className="p-6 border-b border-secondary-50">
                                <h3 className="text-lg font-black text-secondary-900 uppercase tracking-widest">Performance Radar</h3>
                            </div>
                            <div className="divide-y divide-secondary-50">
                                {allReviews.map(review => (
                                    <div key={review.id} className="p-6 flex justify-between items-start hover:bg-secondary-50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-secondary-900">{review.employee.user.email}</p>
                                                <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-[10px] font-black rounded">{review.rating} STARS</span>
                                            </div>
                                            <p className="text-sm text-secondary-500">{review.feedback}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-secondary-400 uppercase"><FormattedDate date={review.date} /></p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'recruitment' && (
                    <div className="space-y-8">
                        {/* Jobs Overview */}
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">Talent Acquisition</h3>
                                <p className="text-secondary-500 text-sm">Manage job openings and track applicant pipelines.</p>
                            </div>
                            <button onClick={handleCreateJob} className="btn btn-primary shadow-lg">+ Post New Job</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {jobs.map(job => (
                                <div key={job.id} onClick={() => handleEditJob(job)} className="card-premium p-6 border-l-4 border-primary-500 hover:shadow-lg transition-all cursor-pointer relative group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${job.status === 'OPEN' ? 'bg-success-50 text-success-700' : 'bg-secondary-100 text-secondary-500'}`}>{job.status}</span>
                                        <span className="text-xs font-bold text-secondary-400">{job._count?.applications || 0} Apps</span>
                                    </div>
                                    <h4 className="font-bold text-secondary-900 mb-1">{job.title}</h4>
                                    <p className="text-xs text-secondary-500 mb-4">{job.type.replace('_', ' ')} • {job.salaryRange}</p>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full shadow-sm">
                                        <span className="text-xs text-primary-600 font-bold">✎ Edit</span>
                                    </div>
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {Array.from({ length: Math.min(3, job._count?.applications || 0) }).map((_, i) => (
                                            <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-secondary-200" />
                                        ))}
                                        {(job._count?.applications || 0) > 3 && (
                                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-secondary-100 flex items-center justify-center text-[8px] font-bold text-secondary-500">+{job._count.applications - 3}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div onClick={handleCreateJob} className="card-premium p-6 border-dashed border-2 border-secondary-200 flex flex-col items-center justify-center text-secondary-400 hover:border-primary-300 hover:text-primary-500 cursor-pointer transition-all">
                                <span className="text-3xl mb-2">+</span>
                                <span className="font-bold text-sm">Create Opening</span>
                            </div>
                        </div>

                        {/* Application Pipeline */}
                        <div className="card-premium overflow-hidden">
                            <div className="p-6 border-b border-secondary-50">
                                <h3 className="text-lg font-black text-secondary-900 uppercase tracking-widest">Candidate Pipeline</h3>
                            </div>
                            <table className="table">
                                <thead>
                                    <tr className="text-[10px] uppercase font-bold text-secondary-400 border-b border-secondary-50">
                                        <th className="p-4">Candidate</th>
                                        <th className="p-4">Applied For</th>
                                        <th className="p-4 text-center">AI Match Score</th>
                                        <th className="p-4 text-center">Stage</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-50">
                                    {applications.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-10 text-secondary-400 font-bold italic">No active applications.</td></tr>
                                    ) : applications.map(app => (
                                        <tr key={app.id} className="hover:bg-secondary-50/50 group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                                        {app.applicantName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900">{app.applicantName}</p>
                                                        <p className="text-[10px] text-secondary-400">{app.applicantEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-secondary-600 text-xs">{app.jobPosting.title}</td>
                                            <td className="p-4 text-center">
                                                {/* Simulated AI Score */}
                                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-50 text-accent-700 text-xs font-black border border-accent-100">
                                                    <span>🤖</span> {Math.floor(Math.random() * (98 - 70) + 70)}%
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${app.status === 'APPLIED' ? 'bg-primary-50 text-primary-700' :
                                                    app.status.includes('INTERVIEW') ? 'bg-warning-50 text-warning-700' :
                                                        app.status === 'SELECTED' ? 'bg-success-50 text-success-700' : 'bg-secondary-100 text-secondary-500'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button className="text-primary-600 font-bold text-[10px] uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">View Profile</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'map' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900">Live Operations Map</h3>
                                <p className="text-secondary-500 text-sm">Real-time field force tracking and geofence compliance.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-secondary-100 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <div className="text-xs font-bold text-secondary-600">
                                        <span className="block text-secondary-400 font-extrabold uppercase text-[10px]">Active</span>
                                        {allAttendance.filter(a => !a.checkOut).length} Staff
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium h-[600px] relative overflow-hidden bg-slate-100 group">
                            <div className="absolute inset-0 bg-[url('https://maps.wikimedia.org/img/osm-intl,12,28.6139,77.2090,300x200.png')] bg-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700"></div>

                            <div className="absolute inset-0 p-10">
                                {allAttendance.filter(a => !a.checkOut && a.latitude).map((a, i) => (
                                    <div
                                        key={a.id}
                                        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer hover:z-50 transition-all duration-300 hover:scale-110"
                                        style={{
                                            top: `${50 + (a.latitude ? (a.latitude - 28.7041) * 1000 : 0)}%`,
                                            left: `${50 + (a.longitude ? (a.longitude - 77.1025) * 1000 : 0)}%`
                                        }}
                                        title={`${a.employee.user.email} - ${a.locationName}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold text-white relative ${a.isGeofenced ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                            {a.employee.user.email[0].toUpperCase()}
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                                <span className={`w-2 h-2 rounded-full ${a.isGeofenced ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                            </div>
                                        </div>
                                        <div className="bg-white/90 backdrop-blur px-2 py-1 rounded shadow-lg mt-1 text-[10px] font-bold text-secondary-900 border border-secondary-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                            {a.employee.user.email.split('@')[0]}
                                        </div>
                                    </div>
                                ))}

                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600/20 animate-ping absolute"></div>
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs z-20">HQ</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {allAttendance.filter(a => !a.checkOut).map(a => (
                                <div key={a.id} className="card-premium p-4 flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${a.isGeofenced ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                        {a.employee.user.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-secondary-900">{a.employee.user.email}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-secondary-500">Checked in at <FormattedTime date={a.checkIn} /></span>
                                            {a.isGeofenced ? (
                                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border border-emerald-100">Verified HQ</span>
                                            ) : (
                                                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded text-[10px] font-black uppercase shadow-sm border border-rose-100">Off-Site</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-secondary-400 mt-1 truncate max-w-[200px]">{a.locationName || 'Location not tracked'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Holiday Almanac</h3>
                                <p className="text-secondary-500 font-medium">Official non-operational schedule.</p>
                            </div>
                            <button onClick={() => window.open('/dashboard/hr-management/holidays', '_blank')} className="text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">Manage Detailed List ↗</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {holidays.map((h: any) => (
                                <div key={h.id} className="card-premium p-6 border-l-4" style={{ borderColor: h.type === 'PUBLIC' ? '#2563eb' : '#7c3aed' }}>
                                    <p className="text-xs font-black text-secondary-400 uppercase mb-2">{new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</p>
                                    <h4 className="font-black text-secondary-900">{h.name}</h4>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase mt-2">{h.type}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'productivity' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">Productivity Intelligence</h3>
                                <p className="text-secondary-500 font-medium">Comparative output analysis across staff.</p>
                            </div>
                            <div className="flex gap-2">
                                <input type="date" className="input text-xs" value={prodDateRange.startDate} onChange={e => setProdDateRange({ ...prodDateRange, startDate: e.target.value })} />
                                <input type="date" className="input text-xs" value={prodDateRange.endDate} onChange={e => setProdDateRange({ ...prodDateRange, endDate: e.target.value })} />
                            </div>
                        </div>

                        {prodAnalysis && (
                            <div className="card-premium p-0 overflow-hidden">
                                <table className="table">
                                    <thead>
                                        <tr className="text-[10px] uppercase font-black text-secondary-400 border-b border-secondary-50">
                                            <th className="p-4">Staff Member</th>
                                            <th className="p-4">Output Score</th>
                                            <th className="p-4">JD/KRA Match</th>
                                            <th className="p-4">Efficiency (Idx)</th>
                                            <th className="p-4 text-center">Workload Distribution</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-50">
                                        {prodAnalysis.individualAnalysis.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-secondary-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-bold text-secondary-900">{item.name}</p>
                                                    <p className="text-[9px] text-secondary-400 font-bold uppercase">{item.role}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-xl font-black text-secondary-900">{item.score.toFixed(0)}</p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-secondary-100 rounded-full overflow-hidden w-24">
                                                            <div
                                                                className={`h-full rounded-full ${item.avgKRA > 0.7 ? 'bg-success-500' : item.avgKRA > 0.4 ? 'bg-warning-500' : 'bg-danger-500'}`}
                                                                style={{ width: `${(item.avgKRA || 0) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-secondary-600">{(item.avgKRA * 100).toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`inline-block px-2 py-1 rounded-lg text-xs font-black ${item.productivityIndex > prodAnalysis.teamSummary.avgProductivity ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'}`}>
                                                        {item.productivityIndex}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <div className="text-center" title="Tasks">
                                                            <span className="block text-[9px] text-secondary-400 font-bold uppercase">Tsk</span>
                                                            <span className="block font-bold">{item.metrics.totalTasks}</span>
                                                        </div>
                                                        <div className="text-center" title="Tickets">
                                                            <span className="block text-[9px] text-secondary-400 font-bold uppercase">Tkt</span>
                                                            <span className="block font-bold">{item.metrics.totalTickets}</span>
                                                        </div>
                                                        <div className="text-center" title="Chats">
                                                            <span className="block text-[9px] text-secondary-400 font-bold uppercase">Cht</span>
                                                            <span className="block font-bold">{item.metrics.totalChats}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <button onClick={() => window.open('/dashboard/hr-management/productivity', '_blank')} className="btn btn-secondary w-full py-4 font-black uppercase tracking-widest text-xs">Launch Full Analytical Suite ↗</button>
                    </div>
                )}

                {activeTab === 'onboarding' && <OnboardingManager />}

                {/* MODAL */}
                {showEmpModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                            <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-secondary-900">{selectedEmp ? 'Edit Profile' : 'New Onboarding'}</h3>
                                <button onClick={() => setShowEmpModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                            </div>
                            <form onSubmit={handleEmpSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                                {selectedEmp ? (
                                    <div className="col-span-2">
                                        <label className="label-premium">Staff Email (Read Only)</label>
                                        <input type="email" disabled className="input-premium bg-secondary-50 opacity-60" value={empForm.email} />
                                    </div>
                                ) : (
                                    <div className="col-span-1">
                                        <label className="label-premium">Email Address</label>
                                        <input type="email" required className="input-premium" placeholder="new.staff@example.com" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} />
                                        <p className="text-[10px] text-primary-600 font-bold mt-1 leading-tight">💡 Enter an existing user&apos;s email to add them to your company.</p>
                                    </div>
                                )}
                                <div className="col-span-1">
                                    <label className="label-premium">System Role</label>
                                    <select className="input-premium" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}>
                                        <option value="SALES_EXECUTIVE">Sales Executive</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="FINANCE_ADMIN">Finance Admin</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Designation</label>
                                    <input type="text" className="input-premium" placeholder="e.g. Senior Associate" value={empForm.designation} onChange={e => setEmpForm({ ...empForm, designation: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Base Salary (Monthly)</label>
                                    <input type="number" className="input-premium" value={empForm.baseSalary} onChange={e => setEmpForm({ ...empForm, baseSalary: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="label-premium text-[10px] uppercase tracking-widest text-primary-600 font-bold mb-2 block">Key Responsibility Areas (KRA)</label>
                                    <textarea
                                        rows={3}
                                        className="input-premium"
                                        placeholder="Enter KRA points (one per line)..."
                                        value={empForm.kra}
                                        onChange={e => setEmpForm({ ...empForm, kra: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="label-premium text-[10px] uppercase tracking-widest text-primary-600 font-bold mb-2 block">Job Description (Detailed)</label>
                                    <textarea
                                        rows={4}
                                        className="input-premium"
                                        placeholder="Detailed job description..."
                                        value={empForm.jobDescription}
                                        onChange={e => setEmpForm({ ...empForm, jobDescription: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 grid grid-cols-3 gap-4 border-t border-secondary-50 pt-6">
                                    <div>
                                        <label className="label-premium text-[10px]">Bank Name</label>
                                        <input type="text" className="input-premium" value={empForm.bankName} onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium text-[10px]">Account #</label>
                                        <input type="text" className="input-premium" value={empForm.accountNumber} onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium text-[10px]">PAN Number</label>
                                        <input type="text" className="input-premium" value={empForm.panNumber} onChange={e => setEmpForm({ ...empForm, panNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-secondary-50 pt-6">
                                    <div>
                                        <label className="label-premium text-[10px]">Offer Letter URL</label>
                                        <input type="text" className="input-premium" placeholder="https://..." value={empForm.offerLetterUrl} onChange={e => setEmpForm({ ...empForm, offerLetterUrl: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label-premium text-[10px]">Contract URL</label>
                                        <input type="text" className="input-premium" placeholder="https://..." value={empForm.contractUrl} onChange={e => setEmpForm({ ...empForm, contractUrl: e.target.value })} />
                                    </div>
                                </div>
                                <div className="col-span-2 pt-6 flex gap-4">
                                    <button type="submit" className="btn btn-primary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-lg">Save Record</button>
                                    <button type="button" onClick={() => setShowEmpModal(false)} className="btn btn-secondary px-8">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showReviewModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                            <div className="bg-warning-50 p-6 border-b border-warning-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-warning-900">Performance Review</h3>
                                <button onClick={() => setShowReviewModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                            </div>
                            <form onSubmit={handleReviewSubmit} className="p-8 space-y-6">
                                <div>
                                    <label className="label-premium bg-warning-50 text-warning-800 px-2 py-1 rounded inline-block mb-2">Rating</label>
                                    <div className="flex gap-4">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                type="button"
                                                key={star}
                                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                                className={`text-3xl transition-transform hover:scale-110 ${star <= reviewForm.rating ? 'text-warning-500' : 'text-secondary-200'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="label-premium">Feedback & Comments</label>
                                    <textarea
                                        required
                                        className="input-premium h-32"
                                        placeholder="Detailed feedback about the employee's performance..."
                                        value={reviewForm.feedback}
                                        onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4 flex gap-4">
                                    <button type="submit" className="btn bg-warning-500 hover:bg-warning-600 text-white flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-lg">Submit Review</button>
                                    <button type="button" onClick={() => setShowReviewModal(false)} className="btn btn-secondary px-8">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showAttendanceModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                            <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-secondary-900">Correct Attendance</h3>
                                <button onClick={() => setShowAttendanceModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                            </div>
                            <form onSubmit={handleAttendanceUpdate} className="p-8 space-y-4">
                                <div>
                                    <label className="label-premium">Check In Time</label>
                                    <input type="datetime-local" className="input-premium" value={attendanceForm.checkIn} onChange={e => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Check Out Time</label>
                                    <input type="datetime-local" className="input-premium" value={attendanceForm.checkOut} onChange={e => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Status</label>
                                    <select className="input-premium" value={attendanceForm.status} onChange={e => setAttendanceForm({ ...attendanceForm, status: e.target.value })}>
                                        <option value="PRESENT">Present</option>
                                        <option value="ABSENT">Absent</option>
                                        <option value="LEAVE">On Leave</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-lg">Update Record</button>
                            </form>
                        </div>
                    </div>
                )}

                {showJobModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                            <div className="bg-primary-50 p-6 border-b border-primary-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-primary-900">{selectedJob ? 'Edit Job Posting' : 'Post New Job'}</h3>
                                <button onClick={() => setShowJobModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                            </div>
                            <form onSubmit={handleJobSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                                <div className="col-span-2">
                                    <label className="label-premium">Job Title</label>
                                    <input type="text" required className="input-premium" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="label-premium">Description</label>
                                    <textarea required rows={4} className="input-premium" value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="label-premium">Requirements</label>
                                    <textarea rows={3} className="input-premium" value={jobForm.requirements} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Location</label>
                                    <input type="text" className="input-premium" value={jobForm.location} onChange={e => setJobForm({ ...jobForm, location: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Salary Range</label>
                                    <input type="text" className="input-premium" value={jobForm.salaryRange} onChange={e => setJobForm({ ...jobForm, salaryRange: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label-premium">Type</label>
                                    <select className="input-premium" value={jobForm.type} onChange={e => setJobForm({ ...jobForm, type: e.target.value })}>
                                        <option value="FULL_TIME">Full Time</option>
                                        <option value="PART_TIME">Part Time</option>
                                        <option value="CONTRACT">Contract</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Status</label>
                                    <select className="input-premium" value={jobForm.status} onChange={e => setJobForm({ ...jobForm, status: e.target.value })}>
                                        <option value="OPEN">Open</option>
                                        <option value="CLOSED">Closed</option>
                                        <option value="DRAFT">Draft</option>
                                    </select>
                                </div>
                                <div className="col-span-2 pt-6 flex gap-4">
                                    <button type="submit" className="btn btn-primary flex-1 py-4 text-sm font-black uppercase tracking-widest shadow-lg">Save Job</button>
                                    <button type="button" onClick={() => setShowJobModal(false)} className="btn btn-secondary px-8">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div >

        </DashboardLayout >
    );
}
