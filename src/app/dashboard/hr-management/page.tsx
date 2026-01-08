'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import OnboardingManager from '@/components/dashboard/OnboardingManager';
import DocumentManager from '@/components/dashboard/DocumentManager';
import EmployeeList from '@/components/dashboard/hr/EmployeeList';
import EmployeeModal from '@/components/dashboard/hr/EmployeeModal';
import HolidayManager from '@/components/dashboard/hr/HolidayManager';
import RecruitmentBoard from '@/components/dashboard/hr/RecruitmentBoard';
import JobPostingModal from '@/components/dashboard/hr/JobPostingModal';
import PerformanceReviewModal from '@/components/dashboard/hr/PerformanceReviewModal';
import AttendanceModal from '@/components/dashboard/hr/AttendanceModal';
import { Briefcase, Info, Target, TrendingUp, Award, GraduationCap, Edit, Trash2 } from 'lucide-react';
import {
    useEmployees, useHolidays, useDesignations, useJobs, useApplications,
    useCreateEmployee, useUpdateEmployee, useCreateJob, useUpdateJob,
    useWorkReportMutations, usePerformanceReviewMutation, useAttendanceMutations,
    useDeleteEmployee, useLeaveRequests, useSalarySlips, useAttendance,
    useWorkReports, useProductivity, useDocuments, useLeaveRequestMutations,
    useDocumentMutations, usePerformanceReviews, useHRInsights,
    useBulkSalaryMutation
} from '@/hooks/useHR';

const FormattedTime = ({ date }: { date: string | Date | null }) => {
    if (!date) return <span>--:--</span>;
    return <span>{new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
};

const HRManagementContent = () => {
    const searchParams = useSearchParams();

    // React Query Hooks - Basic
    const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
    const { data: designations = [] } = useDesignations();
    const { data: jobs = [] } = useJobs(true);
    const { data: applications = [] } = useApplications();
    const { data: holidays = [] } = useHolidays();

    // State for filtering
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [activeTab, setActiveTab] = useState('employees');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const [selectedDocEmp, setSelectedDocEmp] = useState<any>(null);
    const [prodDateRange, setProdDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // React Query Hooks - Tab Specific
    const { data: leaves = [] } = useLeaveRequests();
    const { data: allSlips = [] } = useSalarySlips();
    const { data: allAttendance = [] } = useAttendance();
    const { data: workReports = [], refetch: refetchWorkReports } = useWorkReports();
    const { data: prodAnalysis } = useProductivity(prodDateRange.startDate, prodDateRange.endDate);
    const { data: empDocuments = [] } = useDocuments(selectedDocEmp?.id);
    const { data: allReviews = [] } = usePerformanceReviews();
    const { data: hrInsights } = useHRInsights(activeTab === 'analytics');

    // Mutations
    const createEmployeeMutation = useCreateEmployee();
    const updateEmployeeMutation = useUpdateEmployee();
    const createJobMutation = useCreateJob();
    const updateJobMutation = useUpdateJob();
    const { updateStatus: updateReportStatus } = useWorkReportMutations();
    const performanceReviewMutation = usePerformanceReviewMutation();
    const { correct: attendanceCorrectionMutation } = useAttendanceMutations();
    const deleteEmployeeMutation = useDeleteEmployee();
    const { updateStatus: updateLeaveStatus } = useLeaveRequestMutations();
    const { upload: uploadDoc, remove: removeDoc } = useDocumentMutations();
    const bulkSalaryMutation = useBulkSalaryMutation();



    // ... (keep handleLeaveStatus, etc) ...

    const handleEmpSubmit = async (data: any) => {
        try {
            if (selectedEmp) {
                await updateEmployeeMutation.mutateAsync({ ...data, id: selectedEmp.id });
            } else {
                await createEmployeeMutation.mutateAsync(data);
            }
            setShowEmpModal(false);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save employee');
        }
    };

    // ...

    const handleJobSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedJob) {
                await updateJobMutation.mutateAsync({ ...jobForm, id: selectedJob.id });
            } else {
                await createJobMutation.mutateAsync(jobForm);
            }
            setShowJobModal(false);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to save job');
        }
    };

    // Keep handleDeactivateEmp with manual fetch for now or add mutation later


    // Modal state
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, feedback: '' });
    const [selectedEmp, setSelectedEmp] = useState<any>(null);

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
    // const [workReports, setWorkReports] = useState<any[]>([]); // Replaced by useWorkReports hook
    const [reportFilter, setReportFilter] = useState({ employeeId: 'all', category: 'ALL', startDate: '', endDate: '' });

    // fetchWorkReports removed, now handled by useWorkReports hook

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
            // fetchEmployees replaced by hook
        } else {
            window.location.href = '/login';
        }
    }, []);

    // fetchLeaves removed, now handled by useLeaveRequests hook

    // fetchSlips removed, now handled by useSalarySlips hook
    // fetchDocuments removed, now handled by useDocuments hook

    const handleDocumentUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedDocEmp) return;
        const formData = new FormData(e.currentTarget);
        try {
            await uploadDoc.mutateAsync({
                employeeId: selectedDocEmp.id,
                name: formData.get('name'),
                fileUrl: formData.get('fileUrl'),
                fileType: 'DOCUMENT'
            });
            e.currentTarget.reset();
            alert('Document uploaded!');
        } catch (err) { console.error(err); }
    };

    const handleDeleteDocument = async (id: string) => {
        if (!confirm('Delete this document?')) return;
        try {
            await removeDoc.mutateAsync(id);
        } catch (err) { console.error(err); }
    };

    // fetchAttendance removed, now handled by useAttendance hook


    useEffect(() => {
        // All fetches are now handled by React Query hooks, which re-fetch on dependency changes
        // The activeTab, selectedDocEmp, prodDateRange dependencies are implicitly handled by the hooks themselves
        // No manual fetches needed here anymore.
        // if (activeTab === 'leaves') fetchLeaves(); // Removed
        // if (activeTab === 'analytics' || activeTab === 'payroll') fetchSlips(); // Removed
        // if (activeTab === 'attendance') fetchAttendance(); // Removed
        // if (activeTab === 'recruitment') fetchRecruitmentData(); // Removed
        // if (activeTab === 'documents' && selectedDocEmp) fetchDocuments(selectedDocEmp.id); // Removed
        // if (activeTab === 'reports') fetchWorkReports(); // Removed
        // Holidays fetched inside component
        // if (activeTab === 'productivity') fetchProductivity(); // Removed
    }, [activeTab, selectedDocEmp, prodDateRange]);

    // fetchHolidays removed

    // fetchProductivity removed, now handled by useProductivity hook

    const handleLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await updateLeaveStatus.mutateAsync({ leaveId, status });
        } catch (err) { console.error(err); }
    };
    // Computed stats
    const stats = {
        total: employees.length,
        present: employees.filter((e: any) => e._count?.attendance > 0).length // _count might be undefined if not included in query? Hook should include it.
    };

    // Old fetch implementations removed in favor of React Query mutations


    const handleReportAction = async (reportId: string, status: 'APPROVED' | 'REVIEWED', rating?: number) => {
        try {
            await updateReportStatus.mutateAsync({
                id: reportId,
                status,
                managerComment: status === 'APPROVED' ? 'Approved & Verified' : 'Reviewed',
                managerRating: rating || 3
            });
            // Refresh logic is now handled by React Query invalidation
        } catch (err) {
            console.error(err);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmp) return;
        try {
            await performanceReviewMutation.mutateAsync({
                employeeId: selectedEmp.id,
                rating: reviewForm.rating,
                feedback: reviewForm.feedback
            });
            setShowReviewModal(false);
            setSelectedEmp(null);
            setReviewForm({ rating: 5, feedback: '' });
            alert('Review submitted successfully!');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeactivateEmp = async (empId: string) => {
        if (!confirm('Are you sure you want to deactivate this employee? They will lose access.')) return;
        try {
            await deleteEmployeeMutation.mutateAsync(empId);
            alert('Employee deactivated successfully');
        } catch (err) {
            console.error(err);
        }
    };

    const handleAttendanceUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await attendanceCorrectionMutation.mutateAsync({
                id: attendanceForm.id,
                checkIn: attendanceForm.checkIn ? new Date(attendanceForm.checkIn).toISOString() : null,
                checkOut: attendanceForm.checkOut ? new Date(attendanceForm.checkOut).toISOString() : null,
                status: attendanceForm.status
            });
            setShowAttendanceModal(false);
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



    const handleBulkPayroll = async () => {
        if (!confirm('This will generate salary slips for ALL active employees for the current month. Deduct leaves automatically?')) return;
        try {
            const data = await bulkSalaryMutation.mutateAsync({
                action: 'BULK_GENERATE',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
            });
            alert(data.message);
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
                            onClick={() => window.location.href = '/dashboard/hr-management/designations'}
                            className="btn btn-secondary shadow-xl flex items-center gap-2"
                        >
                            <Briefcase size={18} />
                            Designation Master
                        </button>
                        <button
                            onClick={() => {
                                setSelectedEmp(null);
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
                    <EmployeeList
                        employees={employees}
                        loading={loadingEmployees}
                        onEdit={(emp) => {
                            setSelectedEmp(emp);
                            setShowEmpModal(true);
                        }}
                        onDelete={handleDeactivateEmp}
                        onPay={(emp) => {
                            const amount = prompt("Salary Amount:");
                            if (amount) fetch('/api/hr/salary-slips', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ employeeId: emp.id, month: new Date().getMonth() + 1, year: new Date().getFullYear(), amountPaid: amount, status: 'PAID' })
                            }).then(r => r.ok && alert('Paid!'));
                        }}
                        onReview={(emp) => {
                            setSelectedEmp(emp);
                            setShowReviewModal(true);
                        }}
                        onViewProfile={(id) => window.location.href = `/dashboard/hr-management/employees/${id}`}
                    />
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
                                            }}
                                            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedDocEmp?.id === emp.id ? 'bg-primary-50 border border-primary-200 shadow-sm' : 'hover:bg-secondary-50 border border-transparent'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedDocEmp?.id === emp.id ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-500'}`}>
                                                {emp.user?.email?.[0].toUpperCase() || 'U'}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className={`text-sm font-bold truncate ${selectedDocEmp?.id === emp.id ? 'text-primary-900' : 'text-secondary-900'}`}>{emp.user?.email?.split('@')[0] || 'Unknown'}</p>
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
                                                <h3 className="text-xl font-black">{selectedDocEmp.user?.email || 'Unknown'}</h3>
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
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.user?.email} - {e.designation}</option>)}
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
                            <button onClick={() => refetchWorkReports()} className="btn btn-primary h-[42px] px-8 shadow-lg">Refresh Analytics</button>
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
                    <RecruitmentBoard
                        jobs={jobs}
                        applications={applications}
                        onCreateJob={handleCreateJob}
                        onEditJob={handleEditJob}
                    />
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

                {activeTab === 'holidays' && <HolidayManager />}

                {/* Holiday Modal */}
                {/* Holiday Modal Removed */}

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
                <EmployeeModal
                    isOpen={showEmpModal}
                    onClose={() => {
                        setShowEmpModal(false);
                        setSelectedEmp(null);
                    }}
                    employee={selectedEmp}
                    designations={designations}
                    onSave={handleEmpSubmit}
                />

                <PerformanceReviewModal
                    isOpen={showReviewModal}
                    onClose={() => setShowReviewModal(false)}
                    onSave={handleReviewSubmit}
                />

                <AttendanceModal
                    isOpen={showAttendanceModal}
                    onClose={() => setShowAttendanceModal(false)}
                    onSave={handleAttendanceUpdate}
                />

                <JobPostingModal
                    isOpen={showJobModal}
                    onClose={() => setShowJobModal(false)}
                    job={selectedJob}
                    onSave={handleJobSubmit}
                />
            </div >

        </DashboardLayout >
    );
}

export default function HRManagementPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading HR Dashboard...</div>}>
            <HRManagementContent />
        </Suspense>
    );
}
