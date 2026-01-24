'use client';

import { useState, useEffect } from 'react';
import RichTextEditor from '@/components/common/RichTextEditor';
import { User, Mail, Briefcase, DollarSign, Award, Target, Save, Shield, Phone } from 'lucide-react';

interface EmployeeFormProps {
    initialData?: any;
    designations: any[];
    managers: any[];
    companies: any[];
    departments: any[];
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    saving: boolean;
    mode: 'create' | 'edit';
}

const initialFormState = {
    email: '',
    name: '',
    password: '',
    role: 'EXECUTIVE',
    employeeType: 'FULL_TIME',
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
    officialEmail: '',
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
    initialLeaveBalance: 0,
    companyDesignations: [] as Array<{ companyId: string; designation: string; isPrimary: boolean }>,
    targets: {
        revenue: '',
        publication: '',
        development: ''
    },
    managerId: '',
    companyId: '',
    companyIds: [] as string[],
    departmentId: '',
    allowedModules: ['CORE'] as string[],
    skills: [] as string[],
    expertise: [] as string[]
};

export default function EmployeeForm({
    initialData,
    designations,
    managers,
    companies,
    departments,
    onSubmit,
    onCancel,
    saving,
    mode
}: EmployeeFormProps) {
    const [empForm, setEmpForm] = useState(initialFormState);

    useEffect(() => {
        if (initialData) {
            // Convert nulls to empty strings to avoid React controlled input warnings
            const sanitized = { ...initialData };
            Object.keys(sanitized).forEach(key => {
                if (sanitized[key] === null) {
                    sanitized[key] = '';
                }
            });

            setEmpForm({
                ...initialFormState,
                ...sanitized,
                targets: sanitized.targets || initialFormState.targets,
                companyIds: sanitized.companies?.map((c: any) => c.id) || sanitized.companyIds || [],
                allowedModules: sanitized.allowedModules && sanitized.allowedModules.length > 0 ? sanitized.allowedModules : ['CORE']
            });
        }
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(empForm);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal & Identity Section */}
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
                            title="Full Name"
                            placeholder="John Doe"
                            value={empForm.name}
                            onChange={e => setEmpForm({ ...empForm, name: e.target.value })}
                        />
                    </div>

                    {mode === 'create' ? (
                        <div>
                            <label className="label-premium">Account Email</label>
                            <input
                                type="email"
                                required
                                className="input-premium"
                                placeholder="staff@example.com"
                                value={empForm.email}
                                onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                            />
                            <p className="text-[10px] text-primary-600 font-bold mt-1">Used for system login.</p>
                        </div>
                    ) : (
                        <div>
                            <label className="label-premium">Account Email (System)</label>
                            <input
                                type="email"
                                disabled
                                className="input-premium bg-secondary-50 opacity-60 cursor-not-allowed"
                                title="System Email"
                                placeholder="Email"
                                value={empForm.email}
                            />
                        </div>
                    )}

                    {mode === 'create' && (
                        <div>
                            <label className="label-premium">Set Password</label>
                            <input
                                type="password"
                                required
                                className="input-premium"
                                placeholder="••••••••"
                                value={empForm.password}
                                onChange={e => setEmpForm({ ...empForm, password: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="label-premium">Official Email (Public)</label>
                        <input
                            type="email"
                            className="input-premium"
                            placeholder="official@company.com"
                            value={empForm.officialEmail}
                            onChange={e => setEmpForm({ ...empForm, officialEmail: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Office Extension / Phone</label>
                        <input
                            type="text"
                            className="input-premium"
                            placeholder="Ext 123"
                            value={empForm.officePhone}
                            onChange={e => setEmpForm({ ...empForm, officePhone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Personal Mobile</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="Personal Mobile"
                            placeholder="+1234567890"
                            value={empForm.phoneNumber}
                            onChange={e => setEmpForm({ ...empForm, phoneNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Personal Email (Private)</label>
                        <input
                            type="email"
                            className="input-premium"
                            title="Personal Email"
                            placeholder="john@personal.com"
                            value={empForm.personalEmail}
                            onChange={e => setEmpForm({ ...empForm, personalEmail: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Aadhar Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="Aadhar Number"
                            placeholder="0000 0000 0000"
                            value={empForm.aadharNumber}
                            onChange={e => setEmpForm({ ...empForm, aadharNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">PAN Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="PAN Number"
                            placeholder="ABCDE1234F"
                            value={empForm.panNumber}
                            onChange={e => setEmpForm({ ...empForm, panNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Blood Group</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="Blood Group"
                            placeholder="O+"
                            value={empForm.bloodGroup}
                            onChange={e => setEmpForm({ ...empForm, bloodGroup: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="label-premium">Current Address</label>
                        <textarea
                            className="input-premium h-20"
                            title="Current Address"
                            placeholder="Street, City, State, ZIP"
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
                            placeholder="e.g. JD, EMP-001"
                            value={empForm.employeeId}
                            onChange={e => setEmpForm({ ...empForm, employeeId: e.target.value })}
                        />
                        <p className="text-[10px] text-primary-600 font-bold mt-1">Can be used as a login username.</p>
                    </div>

                    <div>
                        <label className="label-premium">Initial Leave Balance</label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="input-premium"
                            placeholder="0"
                            title="Initial Leave Balance"
                            value={empForm.initialLeaveBalance}
                            onChange={e => setEmpForm({ ...empForm, initialLeaveBalance: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-[10px] text-secondary-400 mt-1 font-bold italic">Starting leave balance for this employee (default: 0)</p>
                    </div>

                    <div>
                        <label className="label-premium">Date of Joining</label>
                        <input
                            type="date"
                            className="input-premium"
                            title="Date of Joining"
                            value={empForm.dateOfJoining}
                            onChange={e => setEmpForm({ ...empForm, dateOfJoining: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">System Role</label>
                        <select
                            className="input-premium"
                            title="System Role"
                            value={empForm.role}
                            onChange={e => setEmpForm({ ...empForm, role: e.target.value })}
                        >
                            <option value="EXECUTIVE">Executive</option>
                            <option value="TEAM_LEADER">Team Leader</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                            <option value="HR_MANAGER">HR Manager</option>
                            <option value="FINANCE_ADMIN">Finance Admin</option>
                            <option value="EDITOR">Editor</option>
                            <option value="JOURNAL_MANAGER">Journal Manager</option>
                            <option value="EDITOR_IN_CHIEF">Editor-in-Chief</option>
                            <option value="PLAGIARISM_CHECKER">Plagiarism Checker</option>
                            <option value="QUALITY_CHECKER">Quality Checker</option>
                            <option value="SECTION_EDITOR">Section Editor</option>
                            <option value="REVIEWER">Reviewer</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Employee Type</label>
                        <select
                            className="input-premium"
                            title="Employee Type"
                            value={empForm.employeeType}
                            onChange={e => setEmpForm({ ...empForm, employeeType: e.target.value })}
                        >
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="CONTRACT">Contract</option>
                            <option value="GIG_WORKIE">GIG Worker</option>
                            <option value="FREELANCE">Freelance</option>
                            <option value="INTERN">Intern</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Department</label>
                        <select
                            className="input-premium"
                            title="Department"
                            value={empForm.departmentId}
                            onChange={e => setEmpForm({ ...empForm, departmentId: e.target.value })}
                        >
                            <option value="">No Department</option>
                            {departments && departments.length > 0 && departments
                                .filter(d => !empForm.companyId || d.companyId === empForm.companyId)
                                .map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Reports To (Manager)</label>
                        <select
                            className="input-premium"
                            title="Reports To"
                            value={empForm.managerId}
                            onChange={e => setEmpForm({ ...empForm, managerId: e.target.value })}
                        >
                            <option value="">No Manager (Top Level)</option>
                            {managers
                                .filter(m => !empForm.companyId || m.user.companyId === empForm.companyId)
                                .map(m => (
                                    <option key={m.id} value={m.user.id}>
                                        {m.user.name || m.user.email} ({m.designatRef?.name || m.designation || m.user.role})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="label-premium">Designation</label>
                        <select
                            className="input-premium"
                            title="Designation"
                            value={empForm.designationId}
                            onChange={e => {
                                const d = designations.find(x => x.id === e.target.value);
                                setEmpForm({
                                    ...empForm,
                                    designationId: e.target.value,
                                    designation: d?.name || ''
                                });
                            }}
                        >
                            <option value="">Select Designation...</option>
                            {designations
                                .filter(d => !empForm.companyId || d.companies?.some((c: any) => c.id === empForm.companyId))
                                .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label-premium">Account Status</label>
                        <select
                            className="input-premium"
                            title="Account Status"
                            value={empForm.isActive ? 'true' : 'false'}
                            onChange={e => setEmpForm({ ...empForm, isActive: e.target.value === 'true' })}
                        >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-secondary-100 mt-2">
                        <div>
                            <label className="label-premium">Skills (Comma separated)</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="React, Node.js, Project Management"
                                value={Array.isArray(empForm.skills) ? empForm.skills.join(', ') : empForm.skills || ''}
                                onChange={e => setEmpForm({ ...empForm, skills: e.target.value.split(',').map(s => s.trim()) })}
                            />
                            <p className="text-[10px] text-secondary-400 mt-1 font-bold italic">Technical or professional skills</p>
                        </div>
                        <div>
                            <label className="label-premium">Expertise (Comma separated)</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Frontend Architecture, Team Leadership"
                                value={Array.isArray(empForm.expertise) ? empForm.expertise.join(', ') : empForm.expertise || ''}
                                onChange={e => setEmpForm({ ...empForm, expertise: e.target.value.split(',').map(s => s.trim()) })}
                            />
                            <p className="text-[10px] text-secondary-400 mt-1 font-bold italic">Areas of deep knowledge or specialization</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Company & Module Access Section */}
            <div className="card-premium p-8">
                <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    Company & Module Access
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Company Selection */}
                    <div className="space-y-4">
                        <div>
                            <label className="label-premium">Primary Company</label>
                            <select
                                className="input-premium"
                                title="Primary Company"
                                value={empForm.companyId}
                                onChange={e => setEmpForm({ ...empForm, companyId: e.target.value })}
                            >
                                <option value="">Select Primary Company</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-secondary-400 mt-1 font-bold italic">The main company this employee is registered under.</p>
                        </div>

                        <div>
                            <label className="label-premium">Additional Authorized Companies</label>
                            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto p-3 bg-secondary-50/50 rounded-2xl border border-secondary-100">
                                {companies.map(c => (
                                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer border border-transparent hover:border-secondary-100 transition-all shadow-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                            checked={empForm.companyIds.includes(c.id)}
                                            onChange={e => {
                                                const ids = e.target.checked
                                                    ? [...empForm.companyIds, c.id]
                                                    : empForm.companyIds.filter(id => id !== c.id);
                                                setEmpForm({ ...empForm, companyIds: ids });
                                            }}
                                        />
                                        <span className="text-[11px] font-black text-secondary-700 truncate">{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Multi-Company Designations */}
                        {empForm.companyIds.length > 0 && (
                            <div className="mt-6">
                                <label className="label-premium mb-3">Company Designations</label>
                                <div className="space-y-3">
                                    {empForm.companyIds.map(companyId => {
                                        const company = companies.find(c => c.id === companyId);
                                        const designation = empForm.companyDesignations.find(d => d.companyId === companyId);

                                        return (
                                            <div key={companyId} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-secondary-200">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-secondary-900 mb-1">{company?.name}</p>
                                                    <select
                                                        className="input-premium text-sm"
                                                        value={designation?.designation || ''}
                                                        onChange={e => {
                                                            const selectedDes = designations.find(d => d.name === e.target.value || d.id === e.target.value);
                                                            const desName = selectedDes ? selectedDes.name : e.target.value;

                                                            const newDesignations = empForm.companyDesignations.filter(d => d.companyId !== companyId);
                                                            if (e.target.value) {
                                                                newDesignations.push({
                                                                    companyId,
                                                                    designation: desName,
                                                                    isPrimary: companyId === empForm.companyId
                                                                });
                                                            }
                                                            setEmpForm({ ...empForm, companyDesignations: newDesignations });
                                                        }}
                                                    >
                                                        <option value="">Select Designation...</option>
                                                        {designations.map(d => (
                                                            <option key={d.id} value={d.name}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {companyId === empForm.companyId && (
                                                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-[10px] font-black rounded-full">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-secondary-400 mt-2 font-bold italic">
                                    Specify different designations for each company this employee works with
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Module Access Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="label-premium">System Module Visibility</label>
                            {empForm.role === 'SUPER_ADMIN' && (
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 text-[10px] font-black uppercase rounded-full border border-primary-200 animate-pulse">
                                    Full Access Granted
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-3 bg-secondary-50/50 rounded-2xl border border-secondary-100">
                            {[
                                { id: 'CORE', label: 'Core Workspace', color: 'text-primary-600', locked: true },
                                { id: 'HR', label: 'HR Management', color: 'text-indigo-600' },
                                { id: 'FINANCE', label: 'Finance & Accounts', color: 'text-emerald-600' },
                                { id: 'PUBLICATION', label: 'Publishing & Editorial', color: 'text-purple-600' },
                                { id: 'LMS', label: 'LMS / Learning', color: 'text-orange-600' },
                                { id: 'CONFERENCE', label: 'Conferences & Events', color: 'text-rose-600' },
                                { id: 'LOGISTIC', label: 'Logistics & Supply', color: 'text-blue-600' },
                                { id: 'IT', label: 'IT Services / Assets', color: 'text-cyan-600' },
                                { id: 'WEB_MONITOR', label: 'Web Monitor', color: 'text-sky-600' },
                                { id: 'QUALITY', label: 'Quality Control', color: 'text-teal-600' },
                                { id: 'COMPANY', label: 'Company Management', color: 'text-slate-600' },
                                { id: 'CRM', label: 'CRM / Sales', color: 'text-pink-600' },
                            ].map(mod => (
                                <label
                                    key={mod.id}
                                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all shadow-sm ${empForm.role === 'SUPER_ADMIN' ? 'cursor-default opacity-100 bg-white border-secondary-200' : 'cursor-pointer ' + (empForm.allowedModules.includes(mod.id) ? 'bg-white border-primary-200 shadow-md ring-1 ring-primary-100' : 'bg-white/40 border-transparent hover:border-secondary-200 opacity-60 hover:opacity-100')}`}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={mod.locked || empForm.role === 'SUPER_ADMIN'}
                                        className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                        checked={empForm.role === 'SUPER_ADMIN' || empForm.allowedModules.includes(mod.id)}
                                        onChange={e => {
                                            const mods = e.target.checked
                                                ? [...empForm.allowedModules, mod.id]
                                                : empForm.allowedModules.filter(id => id !== mod.id);
                                            setEmpForm({ ...empForm, allowedModules: mods });
                                        }}
                                    />
                                    <div className="flex flex-col">
                                        <span className={`text-[11px] font-black uppercase tracking-tighter ${mod.color}`}>{mod.label}</span>
                                        {(mod.locked || empForm.role === 'SUPER_ADMIN') && <span className="text-[8px] font-bold text-secondary-400 uppercase italic">Mandatory</span>}
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-secondary-400 mt-1 font-bold italic">
                            {empForm.role === 'SUPER_ADMIN'
                                ? 'Super Admins automatically have access to all system modules.'
                                : 'Select which main modules are visible in the employee\'s navigation bar.'}
                        </p>
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
                            title="Base Salary"
                            placeholder="0.00"
                            value={empForm.baseSalary}
                            onChange={e => setEmpForm({ ...empForm, baseSalary: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Bank Name</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="Bank Name"
                            placeholder="HDFC Bank"
                            value={empForm.bankName}
                            onChange={e => setEmpForm({ ...empForm, bankName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">Account Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="Account Number"
                            placeholder="0000 0000 0000 00"
                            value={empForm.accountNumber}
                            onChange={e => setEmpForm({ ...empForm, accountNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">IFSC Code</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="IFSC Code"
                            placeholder="HDFC0001234"
                            value={empForm.ifscCode}
                            onChange={e => setEmpForm({ ...empForm, ifscCode: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">UAN Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="UAN Number"
                            placeholder="123456789012"
                            value={empForm.uanNumber}
                            onChange={e => setEmpForm({ ...empForm, uanNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">PF Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="PF Number"
                            placeholder="MH/PUN/12345/678"
                            value={empForm.pfNumber}
                            onChange={e => setEmpForm({ ...empForm, pfNumber: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="label-premium">ESIC Number</label>
                        <input
                            type="text"
                            className="input-premium"
                            title="ESIC Number"
                            placeholder="31000123450001101"
                            value={empForm.esicNumber}
                            onChange={e => setEmpForm({ ...empForm, esicNumber: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Removed KRA, Job Description, and Targets Sections as per new requirement */}

            {/* Action Bar */}
            <div className="sticky bottom-8 z-10">
                <div className="card-premium bg-white/80 backdrop-blur-xl border-primary-100 p-4 flex gap-4 shadow-2xl">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary flex-1 py-4 flex items-center justify-center gap-2 font-black uppercase tracking-widest"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Processing...' : mode === 'create' ? 'Onboard Employee' : 'Commit Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-secondary px-10 py-4"
                    >
                        Discard
                    </button>
                </div>
            </div>
        </form>
    );
}
