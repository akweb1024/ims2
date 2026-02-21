'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import {
    User, Mail, Phone, MapPin, Briefcase, DollarSign,
    Calendar, FileText, Award, TrendingUp, Clock,
    Shield, ArrowLeft, Edit, Save, Plus, Trash2,
    Building, ChevronRight, Star, Target, PieChart as PieIcon,
    Activity
} from 'lucide-react';
import PerformanceProgressBar from '@/components/common/PerformanceProgressBar';
import ExpenseImpactAnalytics from '@/components/dashboard/hr/ExpenseImpactAnalytics';
import TargetPerformanceTable from '@/components/dashboard/hr/TargetPerformanceTable';
import RichTextEditor from '@/components/common/RichTextEditor';
import SafeHTML from '@/components/common/SafeHTML';
import GoalManagementDashboard from '@/components/dashboard/goals/GoalManagementDashboard';
import WorkAgendaPlanner from '@/components/dashboard/work-agenda/WorkAgendaPlanner';
import WorkAssignmentManager from '@/components/dashboard/assignments/WorkAssignmentManager';

export default function EmployeeProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeIncrement, setActiveIncrement] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [growthData, setGrowthData] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    const canViewSalary = currentUser && ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'FINANCE', 'FINANCE_ADMIN'].includes(currentUser.role);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);

    // Increment Form State
    const [showIncrementForm, setShowIncrementForm] = useState(false);
    const [incrementForm, setIncrementForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'INCREMENT',
        reason: '',
        designation: ''
    });

    const fetchEmployeeDetails = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployee(data);

                // Also fetch active increment performance
                const incRes = await fetch(`/api/hr/increments?employeeId=${params.id}&status=APPROVED`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (incRes.ok) {
                    const increments = await incRes.json();
                    if (increments.length > 0) setActiveIncrement(increments[0]);
                }
            } else {
                console.error('Failed to fetch employee');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    const fetchGrowthData = useCallback(async () => {
        if (growthData) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/${params.id}/growth`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setGrowthData(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    }, [growthData, params.id]);

    useEffect(() => {
        if (params.id) {
            fetchEmployeeDetails();
        }
    }, [params.id, fetchEmployeeDetails]);

    useEffect(() => {
        if (activeTab === 'growth') {
            fetchGrowthData();
        }
    }, [activeTab, fetchGrowthData]);

    const handleAddIncrement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/${params.id}/increment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(incrementForm)
            });

            if (res.ok) {
                const data = await res.json();
                const msg = data.status === 'RECOMMENDED'
                    ? 'Increment recommendation submitted for approval!'
                    : 'Salary updated successfully!';
                alert(msg);
                setShowIncrementForm(false);
                fetchEmployeeDetails(); // Refresh to see new salary
                // Reset form
                setIncrementForm({
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    type: 'INCREMENT',
                    reason: '',
                    designation: ''
                });
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    };

    const handleApproveIncrement = async (recordId: string) => {
        if (!confirm('Are you sure you want to approve this increment? This will update the employee profile.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/increment-records/${recordId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Increment approved successfully!');
                fetchEmployeeDetails();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (err) { console.error(err); }
    };

    const handleRejectIncrement = async (recordId: string) => {
        if (!confirm('Are you sure you want to reject this increment?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/increment-records/${recordId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Increment rejected.');
                fetchEmployeeDetails();
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (err) { console.error(err); }
    };

    const [showEmpModal, setShowEmpModal] = useState(false);
    const [designations, setDesignations] = useState<any[]>([]);
    const [empForm, setEmpForm] = useState({
        email: '', password: '', role: 'EXECUTIVE', designation: '',
        baseSalary: '', bankName: '', accountNumber: '', panNumber: '',
        offerLetterUrl: '', contractUrl: '', jobDescription: '', kra: '',
        totalExperienceYears: 0, totalExperienceMonths: 0,
        relevantExperienceYears: 0, relevantExperienceMonths: 0,
        qualification: '', grade: '', lastPromotionDate: '',
        lastIncrementDate: '', nextReviewDate: '', lastIncrementPercentage: 0,
        designationId: '',
        phoneNumber: '',
        officePhone: '',
        personalEmail: '',
        emergencyContact: '',
        address: '',
        permanentAddress: '',
        bloodGroup: '',
        aadharNumber: '',
        uanNumber: '',
        pfNumber: '',
        esicNumber: '',
        ifscCode: '',
        profilePicture: '',
        employeeId: '',
        isActive: true,
        dateOfJoining: '',
        manualLeaveAdjustment: 0,
        employeeType: 'FULL_TIME'
    });

    useEffect(() => {
        fetch('/api/hr/designations')
            .then(res => res.json())
            .then(data => setDesignations(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching designations:', err));
    }, []);


    useEffect(() => {
        if (activeTab === 'goals') {
            // Fetch goals if necessary, currently fetched in combined Details API
            // if separated, fetch here.
        }
    }, [activeTab]);

    const [showGoalForm, setShowGoalForm] = useState(false);
    const [goalForm, setGoalForm] = useState({
        title: '',
        description: '',
        targetValue: '',
        currentValue: '0',
        unit: 'Units',
        type: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        kpiId: ''
    });

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance/goals', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...goalForm,
                    employeeId: employee.id,
                    targetValue: parseFloat(goalForm.targetValue),
                    currentValue: parseFloat(goalForm.currentValue),
                    kpiId: goalForm.kpiId || null
                })
            });

            if (res.ok) {
                alert('Goal created successfully!');
                setShowGoalForm(false);
                fetchEmployeeDetails();
                setGoalForm({
                    title: '', description: '', targetValue: '', currentValue: '0',
                    unit: 'Units', type: 'MONTHLY',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                    kpiId: ''
                });
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateGoalProgress = async (id: string, current: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/performance/goals', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, currentValue: current })
            });
            if (res.ok) fetchEmployeeDetails();
        } catch (err) { console.error(err); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                setEmpForm(prev => ({ ...prev, profilePicture: data.url }));
            }
        } catch (err) {
            console.error('File Upload Error:', err);
        }
    };

    const handleEmpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clean the data - convert empty strings to null for optional fields
        const cleanData = Object.fromEntries(
            Object.entries(empForm).map(([key, value]) => {
                // Skip these fields
                if (key === 'email' || key === 'password') return [key, value];

                // Convert numbers
                if (key === 'manualLeaveAdjustment') return [key, parseFloat(value as string) || 0];

                // Convert empty strings to null
                if (value === '' || value === 'null' || value === 'undefined') {
                    return [key, null];
                }

                return [key, value];
            })
        );

        // Remove password if empty (don't update password)
        if (!cleanData.password) {
            delete cleanData.password;
        }

        // Remove email (can't be updated)
        delete cleanData.email;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: employee.id, ...cleanData })
            });

            const responseData = await res.json();

            if (res.ok) {
                alert('Employee profile updated successfully!');
                setShowEmpModal(false);
                fetchEmployeeDetails(); // Refresh profile
            } else {
                console.error('❌ Update failed:', responseData);
                alert(`Failed to update: ${responseData.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('❌ Network error:', err);
            alert('Network error. Please check your connection and try again.');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Profile...</div>;
    if (!employee) return <div className="p-8 text-center">Employee not found</div>;

    return (
        <DashboardLayout userRole={currentUser?.role || employee.user.role}>
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="btn btn-secondary p-2 rounded-full" title="Go back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">{employee.user.name || employee.user.email}</h1>
                        <p className="text-secondary-500">
                            {employee.employeeId && <span className="font-mono bg-secondary-100 px-1 rounded text-secondary-700 mr-2">{employee.employeeId}</span>}
                            {employee.designation || 'No Designation'} • {employee.user.role} • <span className="text-secondary-900 font-bold">{employee.employeeType?.replace('_', ' ')}</span>
                        </p>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Link href={`/dashboard/hr-management/employees/${params.id}/edit`} className="btn btn-secondary flex items-center gap-2">
                            <Edit size={16} /> Edit Profile
                        </Link>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Sidebar - Quick Info */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 text-center">
                            <div className="w-24 h-24 rounded-full bg-primary-100 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-primary-600 overflow-hidden border-4 border-white shadow-sm">
                                {employee.profilePicture ? (
                                    <Image src={employee.profilePicture} alt="Profile" fill className="object-cover" />
                                ) : (
                                    (employee.user.name?.[0] || employee.user.email[0]).toUpperCase()
                                )}
                            </div>
                            <h2 className="font-bold text-lg">{employee.user.name || employee.user.email.split('@')[0]}</h2>
                            <p className="text-sm text-secondary-500 mb-4">{employee.user.department?.name || 'General Staff'}</p>
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${employee.user.isActive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                                {employee.user.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="card-premium p-4 space-y-3">
                            <h3 className="font-bold text-xs uppercase text-secondary-400 tracking-wider">Contact Details</h3>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail size={16} className="text-primary-500" />
                                <span className="truncate" title={employee.officialEmail}>{employee.officialEmail || employee.user.email}</span>
                            </div>
                            {employee.personalEmail && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail size={16} className="text-secondary-400" />
                                    <span className="truncate" title={employee.personalEmail}>{employee.personalEmail}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                                <Phone size={16} className="text-primary-500" />
                                <span>{employee.officePhone || employee.phoneNumber || '--'}</span>
                            </div>
                            {employee.phoneNumber && employee.officePhone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone size={16} className="text-secondary-400" />
                                    <span>{employee.phoneNumber}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin size={16} className="text-secondary-400" />
                                <span className="truncate" title={employee.address}>{employee.address || '--'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex gap-2 border-b border-secondary-200 overflow-x-auto">
                            {['overview', 'history', 'documents', 'goals', 'work-agenda', 'assignments', 'performance', 'attendance', 'leaves', 'growth'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-secondary-400 hover:text-secondary-600'
                                        }`}
                                >
                                    {tab === 'goals' ? 'Goals & KRAs' : tab === 'work-agenda' ? 'Work Agenda' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="card-premium p-6">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Briefcase className="text-primary-500" size={20} />
                                        Professional Info
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Designation</dt>
                                            <dd className="font-medium text-secondary-900">{employee.designatRef?.name || employee.designation || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Employment Type</dt>
                                            <dd className="font-bold text-primary-600">{employee.employeeType?.replace('_', ' ')}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Department</dt>
                                            <dd className="font-medium text-secondary-900">{employee.user.department?.name || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Date of Joining</dt>
                                            <dd className="font-medium text-secondary-900"><FormattedDate date={employee.dateOfJoining} /></dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Total Experience</dt>
                                            <dd className="font-medium text-secondary-900">
                                                {(() => {
                                                    const doj = new Date(employee.dateOfJoining);
                                                    const now = new Date();

                                                    // Calculate tenure in months
                                                    let tenureMonths = (now.getFullYear() - doj.getFullYear()) * 12 + (now.getMonth() - doj.getMonth());
                                                    if (now.getDate() < doj.getDate()) {
                                                        tenureMonths--;
                                                    }

                                                    // Initial experience from DB (assuming it's experience BEFORE joining or at time of entry)
                                                    // If we assume the DB value is 'Previous Experience', we just add them.
                                                    // If the DB value was 'Total Experience at DOJ', we also just add tenure.
                                                    const initialYears = employee.totalExperienceYears || 0;
                                                    const initialMonths = employee.totalExperienceMonths || 0;

                                                    const totalMonths = (initialYears * 12) + initialMonths + Math.max(0, tenureMonths);

                                                    const displayYears = Math.floor(totalMonths / 12);
                                                    const displayMonths = totalMonths % 12;

                                                    return `${displayYears} Years ${displayMonths} Months`;
                                                })()}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="card-premium p-6">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Shield className="text-success-500" size={20} />
                                        Statutory & Bank
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">PAN Number</dt>
                                            <dd className="font-medium text-secondary-900">{employee.panNumber || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Aadhar Number</dt>
                                            <dd className="font-medium text-secondary-900">{employee.aadharNumber || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">UAN / PF</dt>
                                            <dd className="font-medium text-secondary-900">{employee.uanNumber || '-'} / {employee.pfNumber || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Bank Account</dt>
                                            <dd className="font-medium text-secondary-900">
                                                {employee.bankName}<br />
                                                <span className="text-secondary-500 font-mono text-xs">{employee.accountNumber}</span>
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Leave Balance Card */}
                                <div className="card-premium p-6">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Calendar className="text-indigo-500" size={20} />
                                        Leave Balance
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Initial Balance</dt>
                                            <dd className="font-medium text-secondary-900">{employee.initialLeaveBalance || 0} days</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Current Balance</dt>
                                            <dd className="font-bold text-primary-600 text-lg">{employee.currentLeaveBalance || 0} days</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Manual Adjustment</dt>
                                            <dd className="font-medium text-secondary-900">{employee.manualLeaveAdjustment || 0} days</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Multi-Company Designations Card */}
                                {canViewSalary && employee.companyDesignations && employee.companyDesignations.length > 0 && (
                                    <div className="card-premium p-6">
                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                            <Briefcase className="text-purple-500" size={20} />
                                            Company Assignments
                                        </h3>
                                        <div className="space-y-3">
                                            {employee.companyDesignations.map((cd: any) => (
                                                <div key={cd.id} className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-xl border border-secondary-100">
                                                    <div>
                                                        <p className="font-bold text-sm text-secondary-900">{cd.company?.name || 'Unknown Company'}</p>
                                                        <p className="text-xs text-secondary-600">{cd.designation}</p>
                                                    </div>
                                                    {cd.isPrimary && (
                                                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-[10px] font-black rounded-full">
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Compensation Overview Card */}
                                {canViewSalary && (
                                    <div className="card-premium p-6 md:col-span-2 bg-gradient-to-br from-white to-secondary-50/50">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <DollarSign className="text-primary-600" size={20} />
                                            Compensation Structure
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="p-4 bg-white rounded-2xl border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-wider mb-1">CTC</p>
                                                <p className="text-xl font-black text-secondary-900">₹{employee.salaryStructure?.salaryFixed?.toLocaleString() || '0'}</p>
                                                <p className="text-[10px] text-secondary-500 font-bold">Monthly Base</p>
                                            </div>
                                            <div className="p-4 bg-white rounded-2xl border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-wider mb-1">Variable Pay</p>
                                                <p className="text-xl font-black text-primary-600">₹{employee.salaryStructure?.salaryVariable?.toLocaleString() || '0'}</p>
                                                <p className="text-[10px] text-secondary-500 font-bold">Performance Linked</p>
                                            </div>
                                            <div className="p-4 bg-white rounded-2xl border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-wider mb-1">Incentives</p>
                                                <p className="text-xl font-black text-warning-600">₹{employee.salaryStructure?.salaryIncentive?.toLocaleString() || '0'}</p>
                                                <p className="text-[10px] text-secondary-500 font-bold">Target Bonuses</p>
                                            </div>
                                            <div className="p-4 bg-white rounded-2xl border border-secondary-100 shadow-sm">
                                                <p className="text-[10px] font-black text-secondary-400 uppercase tracking-wider mb-1">Perks/Exemp</p>
                                                <p className="text-xl font-black text-success-600">₹{(
                                                    (employee.salaryStructure?.healthCare || 0) +
                                                    (employee.salaryStructure?.travelling || 0) +
                                                    (employee.salaryStructure?.mobile || 0) +
                                                    (employee.salaryStructure?.internet || 0) +
                                                    (employee.salaryStructure?.booksAndPeriodicals || 0)
                                                ).toLocaleString()}</p>
                                                <p className="text-[10px] text-secondary-500 font-bold">Sec-10 Benefits</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {canViewSalary && (
                                    <div className="card-premium p-6 md:col-span-2">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <PieIcon className="text-primary-600" size={20} />
                                            Departmental Expense Impact
                                        </h3>
                                        <ExpenseImpactAnalytics employeeId={params.id as string} />
                                    </div>
                                )}

                                <div className="card-premium p-6 md:col-span-2">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Award className="text-warning-500" size={20} />
                                        Job Description & KRA
                                    </h3>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2 flex items-center gap-2">
                                                <FileText size={14} />
                                                Job Description
                                            </h4>
                                            <div className="bg-secondary-50/50 p-4 rounded-xl border border-secondary-100 max-h-[400px] overflow-y-auto">
                                                <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere">
                                                    <SafeHTML html={employee.jobDescription || '<p class="text-secondary-400 italic">Not detailed.</p>'} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2 flex items-center gap-2">
                                                <Award size={14} />
                                                Key Responsibility Areas
                                            </h4>
                                            <div className="bg-secondary-50/50 p-4 rounded-xl border border-secondary-100 max-h-[400px] overflow-y-auto">
                                                <div className="prose prose-sm max-w-none break-words overflow-wrap-anywhere">
                                                    <SafeHTML html={employee.kra || '<p class="text-secondary-400 italic">Not detailed.</p>'} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Tab (Increments) */}
                        {activeTab === 'history' && canViewSalary && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-secondary-900">Compensation History</h3>
                                    <Link
                                        href={`/dashboard/hr-management/increments/new?employeeId=${employee.id}`}
                                        className="btn btn-outline text-xs"
                                    >
                                        + Add Record
                                    </Link>
                                </div>

                                {showIncrementForm && (
                                    <div className="bg-secondary-50 p-6 rounded-xl border border-secondary-200 animate-in slide-in-from-top-2">
                                        <h4 className="font-bold text-sm text-secondary-900 mb-4 uppercase">New Compensation Event</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="label-premium">Effective Date</label>
                                                <input
                                                    type="date"
                                                    title="Effective Date"
                                                    className="input-premium"
                                                    value={incrementForm.date}
                                                    onChange={e => setIncrementForm({ ...incrementForm, date: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-premium">Type</label>
                                                <select
                                                    className="input-premium"
                                                    title="Increment Type"
                                                    value={incrementForm.type}
                                                    onChange={e => setIncrementForm({ ...incrementForm, type: e.target.value })}
                                                >
                                                    <option value="INCREMENT">Increment</option>
                                                    <option value="PROMOTION">Promotion</option>
                                                    <option value="CORRECTION">Correction</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label-premium">New Salary (Annual / Base)</label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 500000"
                                                    className="input-premium"
                                                    value={incrementForm.amount}
                                                    onChange={e => setIncrementForm({ ...incrementForm, amount: e.target.value })}
                                                />
                                            </div>
                                            {incrementForm.type === 'PROMOTION' && (
                                                <div>
                                                    <label className="label-premium">New Designation</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Senior Developer"
                                                        className="input-premium"
                                                        value={incrementForm.designation}
                                                        onChange={e => setIncrementForm({ ...incrementForm, designation: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="label-premium">Reason / Notes</label>
                                                <input
                                                    type="text"
                                                    placeholder="Annual Appraisal..."
                                                    className="input-premium"
                                                    value={incrementForm.reason}
                                                    onChange={e => setIncrementForm({ ...incrementForm, reason: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button className="btn btn-secondary" onClick={() => setShowIncrementForm(false)}>Cancel</button>
                                            <button className="btn btn-primary" onClick={handleAddIncrement}>Save & Update Profile</button>
                                        </div>
                                    </div>
                                )}

                                <div className="card-premium overflow-hidden p-0">
                                    <table className="table">
                                        <thead className="bg-secondary-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Effective Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Type</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">Old Salary</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">New Salary</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">Change</th>
                                                <th className="px-6 py-4 text-right text-xs font-bold text-secondary-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {employee.incrementHistory && Array.isArray(employee.incrementHistory) && employee.incrementHistory.length > 0 ? (
                                                employee.incrementHistory.map((rec: any) => (
                                                    <tr key={rec.id} className="hover:bg-secondary-50">
                                                        <td className="px-6 py-4 text-sm font-medium">
                                                            <a href={`/dashboard/hr-management/increments/${rec.id}`} className="text-primary-600 hover:underline flex items-center gap-1" title="View Details">
                                                                <FormattedDate date={rec.effectiveDate} />
                                                                <span className="text-[10px] text-secondary-400">↗</span>
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${rec.type === 'INCREMENT' ? 'bg-success-100 text-success-700' :
                                                                    rec.type === 'DECREMENT' ? 'bg-danger-100 text-danger-700' : 'bg-secondary-100'
                                                                    }`}>{rec.type}</span>
                                                                {rec.newDesignation && rec.type === 'PROMOTION' && (
                                                                    <span className="text-[10px] text-secondary-500 mt-1">To: {rec.newDesignation}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm text-secondary-500">₹{rec.oldSalary.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right text-sm font-bold text-secondary-900">₹{rec.newSalary.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={`text-sm font-bold ${rec.status === 'REJECTED' ? 'text-secondary-400' : (rec.percentage >= 0 ? 'text-success-600' : 'text-danger-600')}`}>
                                                                {rec.percentage > 0 ? '+' : ''}{rec.percentage}%
                                                            </div>
                                                            <div className="text-[10px] text-secondary-400">₹{rec.incrementAmount.toLocaleString()}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rec.status === 'APPROVED' ? 'bg-success-100 text-success-700' :
                                                                    rec.status === 'REJECTED' ? 'bg-danger-100 text-danger-700' :
                                                                        'bg-warning-100 text-warning-700'
                                                                    }`}>
                                                                    {rec.status || 'APPROVED'}
                                                                </span>
                                                                {rec.status === 'RECOMMENDED' && ['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role) && (
                                                                    <div className="flex gap-1 mt-1">
                                                                        <button
                                                                            onClick={() => handleApproveIncrement(rec.id)}
                                                                            className="text-[10px] font-bold text-success-600 hover:underline"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                        <span className="text-secondary-300">|</span>
                                                                        <button
                                                                            onClick={() => handleRejectIncrement(rec.id)}
                                                                            className="text-[10px] font-bold text-danger-600 hover:underline"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-secondary-400 text-sm">No history records found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}


                        {/* Goals Tab */}
                        {activeTab === 'goals' && (
                            <GoalManagementDashboard
                                employeeId={employee.id}
                                isOwnGoals={currentUser?.id === employee.user.id}
                            />
                        )}

                        {/* Work Agenda Tab */}
                        {activeTab === 'work-agenda' && (
                            <WorkAgendaPlanner
                                employeeId={employee.id}
                                isOwnAgenda={currentUser?.id === employee.user.id}
                            />
                        )}

                        {/* Assignments Tab */}
                        {activeTab === 'assignments' && (
                            <WorkAssignmentManager
                                userId={employee.user.id}
                                view="received"
                                canAssign={['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'].includes(currentUser?.role)}
                            />
                        )}

                        {/* Documents Tab */}
                        {activeTab === 'documents' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {employee.documents?.map((doc: any) => (
                                    <div key={doc.id} className="card-premium p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-primary-500" size={24} />
                                            <div>
                                                <h4 className="font-bold text-sm text-secondary-900">{doc.name}</h4>
                                                <p className="text-xs text-secondary-500"><FormattedDate date={doc.createdAt} /></p>
                                            </div>
                                        </div>
                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline text-xs font-bold uppercase">View</a>
                                    </div>
                                ))}
                                {(!employee.documents || employee.documents.length === 0) && (
                                    <div className="col-span-2 text-center p-8 text-secondary-400">No documents uploaded.</div>
                                )}
                            </div>
                        )}

                        {/* Performance Tab */}
                        {activeTab === 'performance' && (
                            <div className="space-y-8">
                                <TargetPerformanceTable
                                    employeeId={employee.id}
                                    monthlyTarget={employee.monthlyTarget}
                                    yearlyTarget={employee.yearlyTarget}
                                    onUpdateTargets={fetchEmployeeDetails}
                                />

                                {activeIncrement && (
                                    <div className="card-premium p-8 space-y-8 bg-gradient-to-br from-white to-secondary-50 shadow-lg border-primary-100">
                                        <div className="flex justify-between items-center border-b border-secondary-100 pb-6">
                                            <div>
                                                <h3 className="font-black text-secondary-900 flex items-center gap-3 text-xl">
                                                    <Target className="text-primary-600" size={28} />
                                                    Active Performance & Goals
                                                </h3>
                                                <p className="text-xs text-secondary-500 font-bold uppercase tracking-widest mt-1">
                                                    Linked to FY{activeIncrement.fiscalYear} Approved Increment
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="badge badge-success px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">
                                                    Active Structure
                                                </span>
                                            </div>
                                        </div>

                                        {activeIncrement && (() => {
                                            const monthlyReviews = activeIncrement.reviews?.filter((r: any) => r.type === 'MONTHLY') || [];
                                            const currentMonth = new Date().getMonth() + 1;
                                            const currentYear = new Date().getFullYear();

                                            const latestMonthReview = monthlyReviews[0];
                                            const monthlyTarget = activeIncrement.newMonthlyTarget || 0;
                                            const monthlyAchieved = latestMonthReview?.revenueAchievement || 0;

                                            const currentQ = Math.floor((currentMonth - 1) / 3) + 1;
                                            const qMonths = currentQ === 1 ? [1, 2, 3] : currentQ === 2 ? [4, 5, 6] : currentQ === 3 ? [7, 8, 9] : [10, 11, 12];
                                            const qReviews = monthlyReviews.filter((r: any) => qMonths.includes(r.month) && r.year === currentYear);
                                            const qAchieved = qReviews.reduce((sum: number, r: any) => sum + (r.revenueAchievement || 0), 0);

                                            const monthlyTargetsJson = activeIncrement.monthlyTargets as any;
                                            let qTarget = 0;
                                            if (monthlyTargetsJson) {
                                                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                                qMonths.forEach(m => {
                                                    qTarget += (monthlyTargetsJson[monthNames[m - 1]] || monthlyTarget);
                                                });
                                            } else {
                                                qTarget = monthlyTarget * 3;
                                            }

                                            const yearlyAchieved = monthlyReviews.filter((r: any) => r.year === currentYear).reduce((sum: number, r: any) => sum + (r.revenueAchievement || 0), 0);
                                            const yearlyTarget = activeIncrement.newYearlyTarget || (monthlyTarget * 12);

                                            return (
                                                <div className="space-y-10">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                        <PerformanceProgressBar
                                                            label="Monthly Achievement"
                                                            target={monthlyTarget}
                                                            current={monthlyAchieved}
                                                            unit="₹"
                                                        />
                                                        <PerformanceProgressBar
                                                            label={`Quarterly (Q${currentQ})`}
                                                            target={qTarget}
                                                            current={qAchieved}
                                                            unit="₹"
                                                            color="bg-indigo-500"
                                                        />
                                                        <PerformanceProgressBar
                                                            label="Yearly Achievement"
                                                            target={yearlyTarget}
                                                            current={yearlyAchieved}
                                                            unit="₹"
                                                            color="bg-success-500"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                        <div className="space-y-8">
                                                            <div className="p-6 bg-white rounded-[2rem] border border-secondary-100 shadow-sm">
                                                                <h4 className="text-xs font-black text-secondary-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                    <Shield size={16} className="text-primary-500" /> Current KRA (Increment Specific)
                                                                </h4>
                                                                <div className="text-sm text-secondary-700 leading-relaxed bg-secondary-50/50 p-4 rounded-xl border border-secondary-100 italic whitespace-pre-wrap">
                                                                    {activeIncrement.newKRA || 'No specific KRA defined in this increment.'}
                                                                </div>
                                                            </div>

                                                            <div className="bg-white rounded-[2rem] border border-secondary-100 overflow-hidden shadow-sm">
                                                                <div className="bg-secondary-50 px-6 py-4 border-b border-secondary-100">
                                                                    <h4 className="text-[10px] font-black text-secondary-900 uppercase tracking-widest flex items-center gap-2">
                                                                        <TrendingUp size={14} className="text-indigo-500" /> Monthly Revenue Breakdown
                                                                    </h4>
                                                                </div>
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-secondary-50/50">
                                                                            <th className="px-6 py-3 text-left font-bold text-secondary-500 uppercase tracking-tighter">Month</th>
                                                                            <th className="px-6 py-3 text-right font-bold text-secondary-500 uppercase tracking-tighter">Achieved</th>
                                                                            <th className="px-6 py-3 text-right font-bold text-secondary-500 uppercase tracking-tighter">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-secondary-100">
                                                                        {monthlyReviews.slice(0, 6).map((r: any) => {
                                                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                                            const mTarget = monthlyTargetsJson ? (monthlyTargetsJson[Object.keys(monthlyTargetsJson)[r.month - 1]] || monthlyTarget) : monthlyTarget;
                                                                            const perc = mTarget > 0 ? (r.revenueAchievement / mTarget) * 100 : 0;
                                                                            return (
                                                                                <tr key={r.id} className="hover:bg-secondary-50/50 transition-colors">
                                                                                    <td className="px-6 py-4 font-bold text-secondary-900">{monthNames[r.month - 1]} {r.year}</td>
                                                                                    <td className="px-6 py-4 text-right font-black text-primary-600">₹{r.revenueAchievement.toLocaleString()}</td>
                                                                                    <td className="px-6 py-4 text-right">
                                                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${perc >= 100 ? 'bg-success-50 text-success-700' : perc >= 70 ? 'bg-primary-50 text-primary-700' : 'bg-warning-50 text-warning-700'}`}>
                                                                                            {perc.toFixed(0)}%
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        {monthlyReviews.length === 0 && (
                                                                            <tr>
                                                                                <td colSpan={3} className="px-6 py-10 text-center text-secondary-400 italic">No monthly achievement data available.</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-6">
                                                            <h4 className="text-xs font-black text-secondary-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                                <Activity size={16} className="text-warning-500" /> Latest KPI Checkpoints
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {activeIncrement.newKPI && typeof activeIncrement.newKPI === 'object' ? (
                                                                    Object.entries(activeIncrement.newKPI).map(([k, v]: [string, any]) => (
                                                                        <div key={k} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-secondary-100 shadow-sm hover:border-primary-200 transition-colors">
                                                                            <span className="text-xs font-bold text-secondary-600">{k}</span>
                                                                            <span className="text-sm font-black text-primary-700">{String(v)}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="text-center py-6 bg-secondary-50 rounded-2xl border-dashed border-2 border-secondary-200">
                                                                        <p className="text-xs text-secondary-400 italic">No specific KPIs defined.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="pt-6 border-t border-secondary-100">
                                            <h3 className="font-black text-secondary-900 flex items-center gap-3 text-lg mb-6">
                                                <TrendingUp className="text-indigo-600" size={24} />
                                                Performance Review History
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {activeIncrement.reviews?.map((review: any) => (
                                                    <div key={review.id} className="card-premium p-6 border-l-4 border-indigo-500 shadow-md hover:shadow-lg transition-shadow bg-white flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{review.period}</p>
                                                                    <p className="text-xs font-bold text-secondary-900">{review.type}</p>
                                                                </div>
                                                                <span className="text-[10px] text-secondary-400 font-bold">
                                                                    <FormattedDate date={review.date} />
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-secondary-700 leading-relaxed italic mb-6">&ldquo;{review.comments || 'No feedback recorded'}&rdquo;</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 pt-4 border-t border-secondary-50">
                                                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-black">
                                                                {review.reviewer?.name?.[0]}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-[10px] font-black text-secondary-900 truncate uppercase">{review.reviewer?.name}</p>
                                                                <p className="text-[8px] text-secondary-400 truncate">{review.reviewer?.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!activeIncrement.reviews || activeIncrement.reviews.length === 0) && (
                                                    <div className="col-span-full py-20 text-center card-premium bg-secondary-50/50 border-dashed border-2">
                                                        <Award size={48} className="text-secondary-200 mx-auto mb-4" />
                                                        <p className="text-sm text-secondary-500 font-bold uppercase tracking-widest">No reviews recorded yet for this active increment cycle.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <h3 className="font-bold text-lg text-secondary-900 mt-8 flex items-center gap-2">
                                        <Activity className="text-warning-500" size={20} />
                                        HR Pulse Comments
                                    </h3>
                                    {employee.hrComments?.map((comment: any) => (
                                        <div key={comment.id} className="card-premium p-4 border-l-4 border-warning-400">
                                            <p className="text-sm text-secondary-800 mb-2">{comment.content}</p>
                                            <div className="flex justify-between items-center text-xs text-secondary-400">
                                                <span>By {comment.author?.email}</span>
                                                <span><FormattedDate date={comment.createdAt} /></span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!employee.hrComments || employee.hrComments.length === 0) && (
                                        <div className="text-center p-8 text-secondary-400 bg-secondary-50 rounded-xl border-dashed border-2 border-secondary-200">
                                            No HR pulse comments added yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Attendance Tab */}
                        {activeTab === 'attendance' && (
                            <div className="space-y-6">
                                <h3 className="font-bold text-lg text-secondary-900">Attendance History (Last 30 Days)</h3>
                                <div className="card-premium overflow-hidden p-0">
                                    <table className="table">
                                        <thead className="bg-secondary-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Date</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Check In</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Check Out</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Work Loc</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {employee.attendance?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((rec: any) => (
                                                <tr key={rec.id} className="hover:bg-secondary-50">
                                                    <td className="px-6 py-4 text-sm font-medium"><FormattedDate date={rec.date} /></td>
                                                    <td className="px-6 py-4 text-sm text-secondary-900 font-bold">
                                                        {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-secondary-900 font-bold">
                                                        {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${rec.status === 'PRESENT' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                                            {rec.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-secondary-500 uppercase font-medium">{rec.workFrom}</td>
                                                </tr>
                                            ))}
                                            {(!employee.attendance || employee.attendance.length === 0) && (
                                                <tr><td colSpan={5} className="p-8 text-center text-secondary-400">No attendance records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Leaves Tab */}
                        {activeTab === 'leaves' && (
                            <div className="space-y-6">

                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-secondary-900">Leave Requests & History</h3>
                                    {employee.dateOfJoining && (
                                        <div className="flex gap-4">
                                            <div className="bg-success-50 px-4 py-2 rounded-xl text-center border border-success-100">
                                                <p className="text-[10px] font-bold text-success-600 uppercase tracking-widest">Available</p>
                                                <p className="text-xl font-black text-secondary-900">
                                                    {(() => {
                                                        const doj = new Date(employee.dateOfJoining);
                                                        const now = new Date();
                                                        const months = (now.getFullYear() - doj.getFullYear()) * 12 + (now.getMonth() - doj.getMonth());
                                                        const accrued = months * 1.5;

                                                        const taken = employee.leaveRequests
                                                            ?.filter((l: any) => l.status === 'APPROVED')
                                                            .reduce((acc: number, l: any) => {
                                                                const start = new Date(l.startDate);
                                                                const end = new Date(l.endDate);
                                                                const diff = Math.abs(end.getTime() - start.getTime());
                                                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                                                                return acc + days;
                                                            }, 0) || 0;

                                                        // Manual Adjustment included
                                                        const adjustment = employee.manualLeaveAdjustment || 0;
                                                        const initial = employee.initialLeaveBalance || 0;
                                                        const balance = initial + accrued - taken + adjustment;

                                                        return balance.toFixed(1);
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="bg-secondary-50 px-4 py-2 rounded-xl text-center border border-secondary-100">
                                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Taken (Total)</p>
                                                <p className="text-xl font-black text-secondary-900">
                                                    {(() => {
                                                        const taken = employee.leaveRequests
                                                            ?.filter((l: any) => l.status === 'APPROVED')
                                                            .reduce((acc: number, l: any) => {
                                                                const start = new Date(l.startDate);
                                                                const end = new Date(l.endDate);
                                                                const diff = Math.abs(end.getTime() - start.getTime());
                                                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                                                                return acc + days;
                                                            }, 0) || 0;
                                                        return taken;
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="card-premium overflow-hidden p-0">
                                    <table className="table">
                                        <thead className="bg-secondary-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Requested On</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Type</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Duration</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Reason</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {employee.leaveRequests?.map((leave: any) => (
                                                <tr key={leave.id} className="hover:bg-secondary-50">
                                                    <td className="px-6 py-4 text-sm text-secondary-500"><FormattedDate date={leave.createdAt} /></td>
                                                    <td className="px-6 py-4 font-bold text-sm text-secondary-900 uppercase">{leave.type}</td>
                                                    <td className="px-6 py-4 text-sm font-medium">
                                                        <FormattedDate date={leave.startDate} /> - <FormattedDate date={leave.endDate} />
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-secondary-600 truncate max-w-[200px]" title={leave.reason}>{leave.reason}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${leave.status === 'APPROVED' ? 'bg-success-100 text-success-700' :
                                                            leave.status === 'REJECTED' ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'
                                                            }`}>
                                                            {leave.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!employee.leaveRequests || employee.leaveRequests.length === 0) && (
                                                <tr><td colSpan={5} className="p-8 text-center text-secondary-400">No leave history found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Growth Tab */}
                        {activeTab === 'growth' && (
                            <div className="space-y-8">
                                {/* Courses Section */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
                                        <TrendingUp className="text-primary-600" size={20} />
                                        Learning & Development
                                    </h3>
                                    {!growthData ? (
                                        <div className="p-8 text-center text-secondary-500">Loading learning data...</div>
                                    ) : growthData.courses.length === 0 ? (
                                        <div className="p-8 text-center bg-secondary-50 rounded-xl border-dashed border-2 border-secondary-200 text-secondary-400">
                                            No courses enrolled yet.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {growthData.courses.map((course: any) => (
                                                <div key={course.id} className="card-premium p-4 flex gap-4">
                                                    <div className="w-16 h-16 rounded-lg bg-secondary-200 flex-shrink-0 overflow-hidden">
                                                        {course.thumbnailUrl ? (
                                                            <Image src={course.thumbnailUrl} alt="" fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-secondary-400">IMG</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-secondary-900 truncate">{course.title}</h4>
                                                        <p className="text-xs text-secondary-500 mb-2">{course.level} • {course.category}</p>
                                                        <div className="w-full bg-secondary-100 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="bg-primary-500 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${course.progress}%` } as React.CSSProperties}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between items-center mt-1">
                                                            <span className="text-[10px] font-bold text-secondary-600 uppercase">{course.status}</span>
                                                            <span className="text-[10px] text-secondary-500">{Math.round(course.progress)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Conferences Section */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
                                        <Briefcase className="text-purple-600" size={20} />
                                        Conferences & Papers
                                    </h3>

                                    {!growthData ? null : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Registrations */}
                                            <div className="card-premium p-0 overflow-hidden">
                                                <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-100 font-bold text-sm text-secondary-700">
                                                    Conference Attendance
                                                </div>
                                                {growthData.conferences.length === 0 ? (
                                                    <div className="p-6 text-center text-sm text-secondary-400">No conferences attended.</div>
                                                ) : (
                                                    <div className="divide-y divide-secondary-100">
                                                        {growthData.conferences.map((conf: any) => (
                                                            <div key={conf.id} className="p-4 hover:bg-secondary-50">
                                                                <h5 className="font-bold text-secondary-900 text-sm">{conf.title}</h5>
                                                                <p className="text-xs text-secondary-500 mb-1">
                                                                    <FormattedDate date={conf.startDate} /> • {conf.mode}
                                                                </p>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-50 text-success-700 uppercase border border-success-100">
                                                                    {conf.ticketType}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Papers */}
                                            <div className="card-premium p-0 overflow-hidden">
                                                <div className="bg-secondary-50 px-4 py-3 border-b border-secondary-100 font-bold text-sm text-secondary-700">
                                                    Research Submissions
                                                </div>
                                                {growthData.papers.length === 0 ? (
                                                    <div className="p-6 text-center text-sm text-secondary-400">No papers submitted.</div>
                                                ) : (
                                                    <div className="divide-y divide-secondary-100">
                                                        {growthData.papers.map((paper: any) => (
                                                            <div key={paper.id} className="p-4 hover:bg-secondary-50">
                                                                <h5 className="font-bold text-secondary-900 text-sm truncate" title={paper.title}>{paper.title}</h5>
                                                                <p className="text-xs text-secondary-500 mb-1">
                                                                    {paper.conference}
                                                                </p>
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] text-secondary-400">{paper.track}</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${paper.reviewStatus === 'ACCEPTED' ? 'bg-success-50 text-success-700 border-success-100' :
                                                                        paper.reviewStatus === 'REJECTED' ? 'bg-danger-50 text-danger-700 border-danger-100' :
                                                                            'bg-warning-50 text-warning-700 border-warning-100'
                                                                        }`}>
                                                                        {paper.reviewStatus}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Activity / Quizzes */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
                                        <Award className="text-orange-500" size={20} />
                                        Quiz Performance (Last 10)
                                    </h3>
                                    {!growthData ? null : growthData.recentQuizzes.length === 0 ? (
                                        <div className="p-4 text-center text-secondary-400 text-sm border border-secondary-200 rounded-xl border-dashed">No quiz data available.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <div className="flex gap-4 pb-2">
                                                {growthData.recentQuizzes.map((quiz: any) => (
                                                    <div key={quiz.id} className="flex-none w-64 card-premium p-4 border-l-4" style={{ borderColor: quiz.passed ? '#22c55e' : '#ef4444' } as React.CSSProperties}>
                                                        <h5 className="font-bold text-sm text-secondary-900 truncate" title={quiz.quizTitle}>{quiz.quizTitle}</h5>
                                                        <p className="text-xs text-secondary-500 mb-2 truncate">{quiz.courseTitle}</p>
                                                        <div className="flex justify-between items-end">
                                                            <div>
                                                                <p className="text-[10px] uppercase font-bold text-secondary-400">Score</p>
                                                                <p className={`text-xl font-black ${quiz.passed ? 'text-success-600' : 'text-danger-600'}`}>{quiz.score}%</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] text-secondary-400"><FormattedDate date={quiz.date} /></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* EDIT MODAL */}
                        {showEmpModal && (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                                    <div className="bg-secondary-50 p-6 border-b border-secondary-100 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-secondary-900">Edit Profile</h3>
                                        <button onClick={() => setShowEmpModal(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
                                    </div>
                                    <form onSubmit={handleEmpSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[85vh] overflow-y-auto">
                                        <div className="col-span-2 grid grid-cols-[100px_1fr] gap-6 items-center bg-secondary-50 p-4 rounded-xl">
                                            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white border-2 border-secondary-200">
                                                {empForm.profilePicture ? (
                                                    <Image src={empForm.profilePicture} alt="Profile" fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-secondary-300">
                                                        {(empForm.email || 'U')[0].toUpperCase()}
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                                                    <span className="text-white text-xs font-bold text-center">Change<br />Photo</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                                </label>
                                            </div>
                                            <div className="space-y-4 w-full">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="label-premium">Staff Email (Read Only)</label>
                                                        <input type="email" disabled title="Staff Email" className="input-premium bg-white opacity-60" value={empForm.email} />
                                                    </div>
                                                    <div>
                                                        <label className="label-premium">Employee ID</label>
                                                        <input type="text" className="input-premium bg-white" placeholder="STM-001" title="Employee ID" value={empForm.employeeId} onChange={e => setEmpForm({ ...empForm, employeeId: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label-premium">System Role</label>
                                            <select className="input-premium" title="System Role" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}>
                                                <option value="EXECUTIVE">Executive</option>
                                                <option value="MANAGER">Manager</option>
                                                <option value="TEAM_LEADER">Team Leader</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </div>
                                        {/* ... other form fields ... */}
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
