'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RichTextEditor from '@/components/common/RichTextEditor';
import { ArrowLeft, Save, Shield, User, Mail, Briefcase, DollarSign, Award, Target } from 'lucide-react';

const initialFormState = {
    email: '',
    name: '',
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
    kra: '',
    totalExperienceYears: 0,
    totalExperienceMonths: 0,
    relevantExperienceYears: 0,
    relevantExperienceMonths: 0,
    qualification: '',
    grade: '',
    lastPromotionDate: '',
    lastIncrementDate: '',
    nextReviewDate: '',
    lastIncrementPercentage: 0,
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
    isActive: true,
    dateOfJoining: '',
    profilePicture: '',
    employeeId: '',
    manualLeaveAdjustment: 0,
    targets: {
        revenue: '',
        publication: '',
        development: ''
    },
    managerId: ''
};

export default function EditEmployeePage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [designations, setDesignations] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [empForm, setEmpForm] = useState(initialFormState);
    const [userRole, setUserRole] = useState('MANAGER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');

                // Fetch Designations
                const desRes = await fetch('/api/hr/designations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (desRes.ok) setDesignations(await desRes.ok ? await desRes.json() : []);

                // Fetch Potential Managers (All Employees)
                const managersRes = await fetch('/api/hr/employees', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (managersRes.ok) {
                    const allEmps = await managersRes.json();
                    const eligibleManagers = allEmps.filter((e: any) =>
                        ['MANAGER', 'TEAM_LEADER', 'ADMIN', 'SUPER_ADMIN'].includes(e.user.role)
                    );
                    setManagers(eligibleManagers);
                }

                // Fetch Employee
                const empRes = await fetch(`/api/hr/employees/${params.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (empRes.ok) {
                    const data = await empRes.json();
                    setEmpForm({
                        email: data.user.email,
                        name: data.user.name || '',
                        password: '',
                        role: data.user.role,
                        designation: data.designatRef?.name || data.designation || '',
                        baseSalary: data.baseSalary || '',
                        bankName: data.bankName || '',
                        accountNumber: data.accountNumber || '',
                        panNumber: data.panNumber || '',
                        offerLetterUrl: data.offerLetterUrl || '',
                        contractUrl: data.contractUrl || '',
                        jobDescription: data.jobDescription || '',
                        kra: data.kra || '',
                        totalExperienceYears: data.totalExperienceYears || 0,
                        totalExperienceMonths: data.totalExperienceMonths || 0,
                        relevantExperienceYears: data.relevantExperienceYears || 0,
                        relevantExperienceMonths: data.relevantExperienceMonths || 0,
                        qualification: data.qualification || '',
                        grade: data.grade || '',
                        lastPromotionDate: data.lastPromotionDate?.split('T')[0] || '',
                        lastIncrementDate: data.lastIncrementDate?.split('T')[0] || '',
                        nextReviewDate: data.nextReviewDate?.split('T')[0] || '',
                        lastIncrementPercentage: data.lastIncrementPercentage || 0,
                        designationId: data.designationId || '',
                        phoneNumber: data.phoneNumber || '',
                        officePhone: data.officePhone || '',
                        personalEmail: data.personalEmail || '',
                        emergencyContact: data.emergencyContact || '',
                        address: data.address || '',
                        permanentAddress: data.permanentAddress || '',
                        bloodGroup: data.bloodGroup || '',
                        ifscCode: data.ifscCode || '',
                        aadharNumber: data.aadharNumber || '',
                        uanNumber: data.uanNumber || '',
                        pfNumber: data.pfNumber || '',
                        esicNumber: data.esicNumber || '',
                        isActive: data.user.isActive,
                        dateOfJoining: data.dateOfJoining?.split('T')[0] || '',
                        profilePicture: data.profilePicture || '',
                        employeeId: data.employeeId || '',
                        manualLeaveAdjustment: data.manualLeaveAdjustment || 0,
                        targets: data.metrics?.targets || { revenue: '', publication: '', development: '' },
                        managerId: data.user.managerId || ''
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const cleanData = Object.fromEntries(
            Object.entries(empForm).map(([key, value]) => {
                if (key === 'email' || key === 'password') return [key, value];
                if (key === 'manualLeaveAdjustment' || key === 'baseSalary') return [key, parseFloat(value as string) || 0];
                if (value === '' || value === 'null' || value === 'undefined') return [key, null];
                if (value === '' || value === 'null' || value === 'undefined') return [key, null];
                if (key === 'targets') return [key, value]; // Keep targets object as is
                return [key, value];
            })
        );

        if (!cleanData.password) delete cleanData.password;
        delete cleanData.email;

        try {
            const token = localStorage.getItem('token');
            // Prepare targets to be saved in 'metrics' JSON field
            const payload = { ...cleanData };
            if (payload.targets) {
                (payload.metrics as any) = { ...((payload.metrics as object) || {}), targets: payload.targets };
                delete payload.targets;
            }

            const res = await fetch('/api/hr/employees', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: params.id, ...payload })
            });

            if (res.ok) {
                alert('Employee updated successfully!');
                router.push(`/dashboard/hr-management/employees/${params.id}`);
            } else {
                const err = await res.json();
                alert(`Failed to update: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Employee Data...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-secondary-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Update Employee</h1>
                            <p className="text-secondary-500 font-medium">Modifying record for <span className="text-primary-600 font-bold">{empForm.email}</span></p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <div className="card-premium p-8">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-500" />
                            Personal & Identity
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="label-premium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-premium"
                                    value={empForm.name}
                                    onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Contact Number</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.phoneNumber}
                                    onChange={e => setEmpForm({ ...empForm, phoneNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Personal Email</label>
                                <input
                                    type="email"
                                    className="input-premium"
                                    value={empForm.personalEmail}
                                    onChange={e => setEmpForm({ ...empForm, personalEmail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Aadhar Number</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.aadharNumber}
                                    onChange={e => setEmpForm({ ...empForm, aadharNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">PAN Number</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.panNumber}
                                    onChange={e => setEmpForm({ ...empForm, panNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Blood Group</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.bloodGroup}
                                    onChange={e => setEmpForm({ ...empForm, bloodGroup: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="label-premium">Current Address</label>
                                <textarea
                                    className="input-premium h-20"
                                    value={empForm.address}
                                    onChange={e => setEmpForm({ ...empForm, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Employment Section */}
                    <div className="card-premium p-8">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-indigo-500" />
                            Work & Role
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="label-premium">Employee ID</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.employeeId}
                                    onChange={e => setEmpForm({ ...empForm, employeeId: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Date of Joining</label>
                                <input
                                    type="date"
                                    className="input-premium"
                                    value={empForm.dateOfJoining}
                                    onChange={e => setEmpForm({ ...empForm, dateOfJoining: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">System Role</label>
                                <select
                                    className="input-premium"
                                    value={empForm.role}
                                    onChange={e => setEmpForm({ ...empForm, role: e.target.value })}
                                >
                                    <option value="SALES_EXECUTIVE">Sales Executive</option>
                                    <option value="TEAM_LEADER">Team Leader</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="FINANCE_ADMIN">Finance Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Reports To (Manager)</label>
                                <select
                                    className="input-premium"
                                    value={empForm.managerId}
                                    onChange={e => setEmpForm({ ...empForm, managerId: e.target.value })}
                                >
                                    <option value="">No Manager (Top Level)</option>
                                    {managers.filter(m => m.user.id !== params.id).map(m => (
                                        <option key={m.id} value={m.user.id}>
                                            {m.user.name || m.user.email} ({m.designation || m.user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Designation Profile</label>
                                <select
                                    className="input-premium"
                                    value={empForm.designationId}
                                    onChange={e => {
                                        const d = designations.find(x => x.id === e.target.value);
                                        setEmpForm({
                                            ...empForm,
                                            designationId: e.target.value,
                                            designation: d?.name || empForm.designation,
                                            jobDescription: d?.jobDescription || empForm.jobDescription,
                                            kra: d?.kra || empForm.kra
                                        });
                                    }}
                                >
                                    <option value="">Manual/Custom</option>
                                    {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label-premium">Designation Name</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.designation}
                                    onChange={e => setEmpForm({ ...empForm, designation: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Account Status</label>
                                <select
                                    className="input-premium"
                                    value={empForm.isActive ? 'true' : 'false'}
                                    onChange={e => setEmpForm({ ...empForm, isActive: e.target.value === 'true' })}
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Financials Section */}
                    <div className="card-premium p-8">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            Financials & Bank
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="label-premium">Base Salary (Monthly)</label>
                                <input
                                    type="number"
                                    className="input-premium"
                                    value={empForm.baseSalary}
                                    onChange={e => setEmpForm({ ...empForm, baseSalary: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Bank Name</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.bankName}
                                    onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">Account Number</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.accountNumber}
                                    onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label-premium">IFSC Code</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={empForm.ifscCode}
                                    onChange={e => setEmpForm({ ...empForm, ifscCode: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rich Details */}
                    <div className="card-premium p-8">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-500" />
                            KRA & Job Description
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="label-premium mb-2 block">Key Responsibility Areas (KRA)</label>
                                <RichTextEditor
                                    value={empForm.kra}
                                    onChange={v => setEmpForm({ ...empForm, kra: v })}
                                />
                            </div>
                            <div>
                                <label className="label-premium mb-2 block">Job Description</label>
                                <RichTextEditor
                                    value={empForm.jobDescription}
                                    onChange={v => setEmpForm({ ...empForm, jobDescription: v })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Targets Section */}
                    <div className="card-premium p-8">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <Target className="w-5 h-5 text-rose-500" />
                            Performance Targets
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="label-premium">Revenue Target</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        className="input-premium pl-8"
                                        placeholder="e.g 500000"
                                        value={empForm.targets.revenue}
                                        onChange={e => setEmpForm({ ...empForm, targets: { ...empForm.targets, revenue: e.target.value } })}
                                    />
                                </div>
                                <p className="text-[10px] text-secondary-400 mt-1">Monthly revenue goal</p>
                            </div>
                            <div>
                                <label className="label-premium">Publication Deadline/Issues</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    placeholder="e.g. 2 Issues / Month"
                                    value={empForm.targets.publication}
                                    onChange={e => setEmpForm({ ...empForm, targets: { ...empForm.targets, publication: e.target.value } })}
                                />
                                <p className="text-[10px] text-secondary-400 mt-1">For Editorial/Publication Team</p>
                            </div>
                            <div>
                                <label className="label-premium">Web Dev / Correction</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    placeholder="e.g. 5 Modules / Week"
                                    value={empForm.targets.development}
                                    onChange={e => setEmpForm({ ...empForm, targets: { ...empForm.targets, development: e.target.value } })}
                                />
                                <p className="text-[10px] text-secondary-400 mt-1">For IT/Dev Team</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="sticky bottom-8 z-10">
                        <div className="card-premium bg-white/80 backdrop-blur-xl border-primary-100 p-4 flex gap-4 shadow-2xl">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn btn-primary flex-1 py-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest"
                            >
                                <Save className="w-5 h-5" />
                                {saving ? 'Updating Database...' : 'Commit Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary px-10 py-4"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
