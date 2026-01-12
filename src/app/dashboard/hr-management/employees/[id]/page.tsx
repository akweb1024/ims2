'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import {
    User, Mail, Phone, MapPin, Briefcase, DollarSign,
    Calendar, FileText, Award, TrendingUp, Clock,
    Shield, ArrowLeft, Edit, Save, Plus, Trash2
} from 'lucide-react';
import RichTextEditor from '@/components/common/RichTextEditor';
import SafeHTML from '@/components/common/SafeHTML';

export default function EmployeeProfilePage() {
    const params = useParams();
    const router = useRouter();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Increment Form State
    const [showIncrementForm, setShowIncrementForm] = useState(false);
    const [incrementForm, setIncrementForm] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'INCREMENT',
        reason: ''
    });

    useEffect(() => {
        if (params.id) {
            fetchEmployeeDetails();
        }
    }, [params.id]);

    const fetchEmployeeDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/employees/${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setEmployee(await res.json());
            } else {
                console.error('Failed to fetch employee');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIncrement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Logic to add separate increment record manually would go here
            // Currently API might need an update to support manual distinct creation or we use the specific endpoint
            // For now, we'll simulate or just log as this might require a dedicated 'add record' API separate from profile update
            alert("Feature to manually add historical record coming soon. Use Edit Profile to update current salary.");
            setShowIncrementForm(false);
        } catch (err) {
            console.error(err);
        }
    };

    const [showEmpModal, setShowEmpModal] = useState(false);
    const [designations, setDesignations] = useState<any[]>([]);
    const [empForm, setEmpForm] = useState({
        email: '', password: '', role: 'SALES_EXECUTIVE', designation: '',
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

        console.log('📤 Sending employee update:', { id: employee.id, ...cleanData });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: employee.id, ...cleanData })
            });

            const responseData = await res.json();

            if (res.ok) {
                console.log('✅ Employee updated successfully');
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
        <DashboardLayout userRole={employee.user.role}>
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="btn btn-secondary p-2 rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">{employee.user.email}</h1>
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
                                    <img src={employee.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    employee.user.email[0].toUpperCase()
                                )}
                            </div>
                            <h2 className="font-bold text-lg">{employee.user.email.split('@')[0]}</h2>
                            <p className="text-sm text-secondary-500 mb-4">{employee.department?.name || 'General Staff'}</p>
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${employee.user.isActive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                                {employee.user.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="card-premium p-4 space-y-3">
                            <h3 className="font-bold text-xs uppercase text-secondary-400 tracking-wider">Contact Details</h3>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail size={16} className="text-secondary-400" />
                                <span className="truncate" title={employee.personalEmail}>{employee.personalEmail || '--'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone size={16} className="text-secondary-400" />
                                <span>{employee.phoneNumber || '--'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin size={16} className="text-secondary-400" />
                                <span className="truncate" title={employee.address}>{employee.address || '--'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-secondary-200 overflow-x-auto">
                            {['overview', 'history', 'documents', 'performance', 'attendance', 'leaves'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-secondary-400 hover:text-secondary-600'
                                        }`}
                                >
                                    {tab}
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
                                            <dd className="font-medium text-secondary-900">{employee.department?.name || '-'}</dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Date of Joining</dt>
                                            <dd className="font-medium text-secondary-900"><FormattedDate date={employee.dateOfJoining} /></dd>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <dt className="text-xs font-bold text-secondary-400 uppercase">Total Experience</dt>
                                            <dd className="font-medium text-secondary-900">{employee.totalExperienceYears} Y {employee.totalExperienceMonths} M</dd>
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

                                <div className="card-premium p-6 md:col-span-2">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <Award className="text-warning-500" size={20} />
                                        Job Description & KRA
                                    </h3>
                                    <div className="grid grid-cols-1 gap-8">
                                        <div>
                                            <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2">Job Description</h4>
                                            <SafeHTML html={employee.jobDescription || 'Not detailed.'} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-secondary-400 uppercase mb-2">Key Responsibility Areas</h4>
                                            <SafeHTML html={employee.kra || 'Not detailed.'} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* History Tab (Increments) */}
                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-secondary-900">Compensation History</h3>
                                    <button onClick={() => setShowIncrementForm(!showIncrementForm)} className="btn btn-outline text-xs">
                                        {showIncrementForm ? 'Cancel' : '+ Add Record'}
                                    </button>
                                </div>

                                {showIncrementForm && (
                                    <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 animate-in slide-in-from-top-2">
                                        <p className="text-xs text-secondary-500 mb-2">Manual entry for historical records.</p>
                                        {/* Simplified Form for UI Demo */}
                                        <div className="flex gap-4">
                                            <input type="date" className="input-premium w-auto" />
                                            <input type="number" placeholder="New Salary" className="input-premium" />
                                            <button className="btn btn-primary" onClick={handleAddIncrement}>Save</button>
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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {employee.incrementHistory && employee.incrementHistory.length > 0 ? (
                                                employee.incrementHistory.map((rec: any) => (
                                                    <tr key={rec.id} className="hover:bg-secondary-50">
                                                        <td className="px-6 py-4 text-sm font-medium"><FormattedDate date={rec.effectiveDate} /></td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rec.type === 'INCREMENT' ? 'bg-success-100 text-success-700' :
                                                                rec.type === 'DECREMENT' ? 'bg-danger-100 text-danger-700' : 'bg-secondary-100'
                                                                }`}>{rec.type}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm text-secondary-500">₹{rec.oldSalary.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right text-sm font-bold text-secondary-900">₹{rec.newSalary.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className={`text-sm font-bold ${rec.percentage >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                                {rec.percentage > 0 ? '+' : ''}{rec.percentage}%
                                                            </div>
                                                            <div className="text-[10px] text-secondary-400">₹{rec.incrementAmount.toLocaleString()}</div>
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
                            <div className="space-y-6">
                                <h3 className="font-bold text-lg text-secondary-900">Performance Reviews & Notes</h3>
                                {employee.hrComments?.map((comment: any) => (
                                    <div key={comment.id} className="card-premium p-4 border-l-4 border-warning-400">
                                        <p className="text-sm text-secondary-800 mb-2">{comment.content}</p>
                                        <div className="flex justify-between items-center text-xs text-secondary-400">
                                            <span>By {comment.author?.email}</span>
                                            <span><FormattedDate date={comment.createdAt} /></span>
                                        </div>
                                    </div>
                                ))}
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
                                            {employee.attendance?.map((rec: any) => (
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
                                                        const balance = accrued - taken + adjustment;

                                                        // Display logic to show breakdown if hovered? For now just the balance.
                                                        // return `${balance.toFixed(1)} ${adjustment !== 0 ? `(${adjustment > 0 ? '+' : ''}${adjustment} adj)` : ''}`;
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
                                                    <img src={empForm.profilePicture} alt="Profile" className="w-full h-full object-cover" />
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
                                                        <input type="email" disabled className="input-premium bg-white opacity-60" value={empForm.email} />
                                                    </div>
                                                    <div>
                                                        <label className="label-premium">Employee ID</label>
                                                        <input type="text" className="input-premium bg-white" placeholder="STM-001" value={empForm.employeeId} onChange={e => setEmpForm({ ...empForm, employeeId: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label-premium">System Role</label>
                                            <select className="input-premium" value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })}>
                                                <option value="SALES_EXECUTIVE">Sales Executive</option>
                                                <option value="MANAGER">Manager</option>
                                                <option value="FINANCE_ADMIN">Finance Admin</option>
                                                <option value="HR_MANAGER">HR Manager</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label-premium">Employee Type</label>
                                            <select className="input-premium" value={empForm.employeeType} onChange={e => setEmpForm({ ...empForm, employeeType: e.target.value })}>
                                                <option value="FULL_TIME">Full Time</option>
                                                <option value="PART_TIME">Part Time</option>
                                                <option value="CONTRACT">Contract</option>
                                                <option value="GIG_WORKIE">GIG Worker</option>
                                                <option value="FREELANCE">Freelance</option>
                                                <option value="INTERN">Intern</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="label-premium">Account Status</label>
                                            <select className="input-premium" value={empForm.isActive ? 'true' : 'false'} onChange={e => setEmpForm({ ...empForm, isActive: e.target.value === 'true' })}>
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label-premium">Designation & KRA Profile</label>
                                            <select
                                                className="input-premium"
                                                value={empForm.designationId}
                                                onChange={e => {
                                                    const desId = e.target.value;
                                                    const selected = designations.find(d => d.id === desId);
                                                    setEmpForm({
                                                        ...empForm,
                                                        designationId: desId,
                                                        designation: selected?.name || empForm.designation,
                                                        jobDescription: selected?.jobDescription || empForm.jobDescription,
                                                        kra: selected?.kra || empForm.kra
                                                    });
                                                }}
                                            >
                                                <option value="">Select Predefined Role</option>
                                                {designations.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2">
                                            <h4 className="label-premium font-black text-primary-600 border-b border-primary-100 pb-2 mb-4 block uppercase tracking-tighter">Contact & Personal Info</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label-premium">Mobile Number</label>
                                                    <input type="number" className="input-premium" value={empForm.phoneNumber} onChange={e => setEmpForm({ ...empForm, phoneNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Office Extension/Mobile</label>
                                                    <input type="number" className="input-premium" value={empForm.officePhone} onChange={e => setEmpForm({ ...empForm, officePhone: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Personal Email</label>
                                                    <input type="email" className="input-premium" value={empForm.personalEmail} onChange={e => setEmpForm({ ...empForm, personalEmail: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Emergency Contact</label>
                                                    <input type="number" className="input-premium" value={empForm.emergencyContact} onChange={e => setEmpForm({ ...empForm, emergencyContact: e.target.value })} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="label-premium">Current Address</label>
                                                    <input type="text" className="input-premium" value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="label-premium">Permanent Address</label>
                                                    <input type="text" className="input-premium" value={empForm.permanentAddress} onChange={e => setEmpForm({ ...empForm, permanentAddress: e.target.value })} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="label-premium">Blood Group</label>
                                                    <input type="text" className="input-premium" value={empForm.bloodGroup} onChange={e => setEmpForm({ ...empForm, bloodGroup: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <h4 className="label-premium font-black text-primary-600 border-b border-primary-100 pb-2 mb-4 block uppercase tracking-tighter">Financial & Statutory</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label-premium">Base Salary (Monthly)</label>
                                                    <input type="number" className="input-premium" value={empForm.baseSalary} onChange={e => setEmpForm({ ...empForm, baseSalary: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Bank Name</label>
                                                    <input type="text" className="input-premium" value={empForm.bankName} onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Account Number</label>
                                                    <input type="text" className="input-premium" value={empForm.accountNumber} onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">IFSC Code</label>
                                                    <input type="text" className="input-premium" value={empForm.ifscCode} onChange={e => setEmpForm({ ...empForm, ifscCode: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">PAN Number</label>
                                                    <input type="text" className="input-premium" value={empForm.panNumber} onChange={e => setEmpForm({ ...empForm, panNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">Aadhar Number</label>
                                                    <input type="text" className="input-premium" value={empForm.aadharNumber} onChange={e => setEmpForm({ ...empForm, aadharNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">UAN Number</label>
                                                    <input type="text" className="input-premium" value={empForm.uanNumber} onChange={e => setEmpForm({ ...empForm, uanNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">PF Number</label>
                                                    <input type="text" className="input-premium" value={empForm.pfNumber} onChange={e => setEmpForm({ ...empForm, pfNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="label-premium">ESIC Number</label>
                                                    <input type="text" className="input-premium" value={empForm.esicNumber} onChange={e => setEmpForm({ ...empForm, esicNumber: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-premium">Grade / Level</label>
                                            <input type="text" className="input-premium" value={empForm.grade} onChange={e => setEmpForm({ ...empForm, grade: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="label-premium">Date of Joining</label>
                                            <input type="date" className="input-premium" value={empForm.dateOfJoining} onChange={e => setEmpForm({ ...empForm, dateOfJoining: e.target.value })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label-premium font-black text-primary-600 border-b border-primary-100 pb-2 mb-4 block uppercase tracking-tighter">Experience & Qualification</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-secondary-500 uppercase">Total Exp (Years/Months)</label>
                                                    <div className="flex gap-2">
                                                        <input type="number" className="input-premium" placeholder="Y" value={empForm.totalExperienceYears} onChange={e => setEmpForm({ ...empForm, totalExperienceYears: parseInt(e.target.value) || 0 })} />
                                                        <input type="number" className="input-premium" placeholder="M" value={empForm.totalExperienceMonths} onChange={e => setEmpForm({ ...empForm, totalExperienceMonths: parseInt(e.target.value) || 0 })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-primary-500 uppercase">Relevant Exp (Years/Months)</label>
                                                    <div className="flex gap-2">
                                                        <input type="number" className="input-premium border-primary-100" placeholder="Y" value={empForm.relevantExperienceYears} onChange={e => setEmpForm({ ...empForm, relevantExperienceYears: parseInt(e.target.value) || 0 })} />
                                                        <input type="number" className="input-premium border-primary-100" placeholder="M" value={empForm.relevantExperienceMonths} onChange={e => setEmpForm({ ...empForm, relevantExperienceMonths: parseInt(e.target.value) || 0 })} />
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-secondary-500 uppercase">Educational Qualification</label>
                                                    <input type="text" className="input-premium" value={empForm.qualification} onChange={e => setEmpForm({ ...empForm, qualification: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>


                                        <div className="col-span-2">
                                            <h4 className="label-premium font-black text-rose-600 border-b border-rose-100 pb-2 mb-4 block uppercase tracking-tighter">Admin Corrections</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="label-premium">Leave Balance Adjustment (Days)</label>
                                                    <p className="text-[10px] text-secondary-400 mb-1">Negative to deduct, positive to add extra days.</p>
                                                    <input type="number" step="0.5" className="input-premium border-rose-200 focus:border-rose-500" value={empForm.manualLeaveAdjustment} onChange={e => setEmpForm({ ...empForm, manualLeaveAdjustment: parseFloat(e.target.value) })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="label-premium font-black text-warning-600 border-b border-warning-100 pb-2 mb-4 block uppercase tracking-tighter">Growth & Review Track</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-secondary-500 uppercase">Last Promotion Date</label>
                                                    <input type="date" className="input-premium" value={empForm.lastPromotionDate} onChange={e => setEmpForm({ ...empForm, lastPromotionDate: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-secondary-500 uppercase">Last Increment Date</label>
                                                    <input type="date" className="input-premium" value={empForm.lastIncrementDate} onChange={e => setEmpForm({ ...empForm, lastIncrementDate: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-secondary-500 uppercase">Last Increment %</label>
                                                    <input type="number" step="0.01" className="input-premium" value={empForm.lastIncrementPercentage} onChange={e => setEmpForm({ ...empForm, lastIncrementPercentage: parseFloat(e.target.value) || 0 })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-warning-600 uppercase">Next Review Date</label>
                                                    <input type="date" className="input-premium border-warning-200" value={empForm.nextReviewDate} onChange={e => setEmpForm({ ...empForm, nextReviewDate: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label-premium text-[10px] uppercase tracking-widest text-primary-600 font-bold mb-2 block">Key Responsibility Areas (KRA)</label>
                                            <RichTextEditor
                                                value={empForm.kra}
                                                onChange={val => setEmpForm({ ...empForm, kra: val })}
                                                placeholder="Enter KRA points..."
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="label-premium text-[10px] uppercase tracking-widest text-primary-600 font-bold mb-2 block">Job Description (Detailed)</label>
                                            <RichTextEditor
                                                value={empForm.jobDescription}
                                                onChange={val => setEmpForm({ ...empForm, jobDescription: val })}
                                                placeholder="Detailed job description..."
                                            />
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
                    </div>
                </div >
            </div >
        </DashboardLayout >
    );
}
