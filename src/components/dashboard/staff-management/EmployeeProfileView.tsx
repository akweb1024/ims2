'use client';

import { useState, useEffect } from 'react';
import { X, User, Briefcase, DollarSign, FileText, Monitor, Clock, Calendar } from 'lucide-react';

interface EmployeeProfileViewProps {
    employeeId: string;
    onClose: () => void;
}

export default function EmployeeProfileView({ employeeId, onClose }: EmployeeProfileViewProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/staff-management/employees/${employeeId}/full-profile`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [employeeId]);

    if (loading) return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl">Loading full profile...</div>
        </div>
    );

    if (!data) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'personal', label: 'Personal', icon: Calendar },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'financial', label: 'Financial', icon: DollarSign },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'assets', label: 'Assets', icon: Monitor },
        { id: 'attendance', label: 'Attendance', icon: Clock },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-secondary-200 bg-secondary-50 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg">
                            {data.name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-secondary-900">{data.name}</h2>
                            <p className="text-secondary-600 flex items-center gap-2">
                                <span>{data.employeeProfile?.designatRef?.name || 'No Designation'}</span>
                                <span className="w-1 h-1 rounded-full bg-secondary-400"></span>
                                <span>{data.email}</span>
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${data.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {data.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {data.id}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-lg transition-colors">
                        <X className="w-6 h-6 text-secondary-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-secondary-200 px-6 bg-white shrink-0 overflow-x-auto">
                    <div className="flex gap-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-secondary-50 scrollbar-thin">
                    <div className="max-w-5xl mx-auto space-y-6">

                        {/* Dynamic Tab Content */}
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InfoCard title="Reporting To" value={data.manager?.name || 'Top Level'} sub={data.manager?.email} />
                                <InfoCard title="Department" value={data.department?.name || '-'} sub={data.department?.code} />
                                <InfoCard title="Date Joined" value={new Date(data.employeeProfile?.dateOfJoining).toLocaleDateString()} sub="Full Time" />

                                <div className="col-span-full md:col-span-2 bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
                                    {/* Placeholder for timeline/activity */}
                                    <p className="text-secondary-500 text-sm">No recent system notifications.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'personal' && (
                            <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm space-y-6">
                                <SectionHeader title="Contact Information" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Phone" value={data.employeeProfile?.phoneNumber} />
                                    <Field label="Official Email" value={data.email} />
                                    <Field label="Employee Code" value={data.employeeProfile?.employeeCode || data.employeeProfile?.employeeId} />
                                </div>

                                <SectionHeader title="Identity Documents" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Aadhar" value={data.employeeProfile?.aadharNumber || 'Not provided'} />
                                    <Field label="PAN / Tax ID" value={data.taxDeclarations?.[0]?.pan || 'Not provided'} />
                                    <Field label="UAN (PF)" value={data.employeeProfile?.uanNumber || 'Not provided'} />
                                    <Field label="ESIC" value={data.employeeProfile?.esicNumber || 'Not provided'} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'professional' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <SectionHeader title="Current Position" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Company" value={data.company?.name} />
                                        <Field label="Designation" value={data.employeeProfile?.designatRef?.name} />
                                        <Field label="Department" value={data.department?.name} />
                                        <Field label="Reporting Manager" value={data.manager?.name} />
                                    </div>
                                </div>


                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <SectionHeader title="Current Salary Structure" />
                                        <span className="text-2xl font-bold text-green-600">
                                            {formatCurrency(data.employeeProfile?.salaryStructure?.netSalary || 0)}/mo
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <Field label="Basic" value={formatCurrency(data.employeeProfile?.salaryStructure?.basicSalary)} />
                                        <Field label="HRA" value={formatCurrency(data.employeeProfile?.salaryStructure?.hra)} />
                                        <Field label="Special Allowance" value={formatCurrency(data.employeeProfile?.salaryStructure?.specialAllowance)} />
                                        <Field label="PF (Employee)" value={formatCurrency(data.employeeProfile?.salaryStructure?.pfEmployee)} />
                                        <Field label="Professional Tax" value={formatCurrency(data.employeeProfile?.salaryStructure?.professionalTax)} />
                                        <Field label="Total Deductions" value={formatCurrency(data.employeeProfile?.salaryStructure?.totalDeductions)} />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <SectionHeader title="Recent Increments" />
                                    <Table
                                        headers={['Effective Date', 'Old Salary', 'New Salary', 'Increment Amount', 'Status']}
                                        rows={data.employeeProfile?.incrementHistory?.map((h: any) => [
                                            new Date(h.effectiveDate).toLocaleDateString(),
                                            formatCurrency(h.oldSalary),
                                            formatCurrency(h.newSalary),
                                            `+${formatCurrency(h.incrementAmount)}`,
                                            <IncrementStatusBadge status={h.status} key={h.id} />
                                        ])}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                <SectionHeader title="Employee Documents" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {data.employeeProfile?.documents?.length > 0 ? (
                                        data.employeeProfile.documents.map((doc: any) => (
                                            <div key={doc.id} className="p-4 border border-secondary-200 rounded-lg flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-secondary-900">{doc.name}</p>
                                                        <p className="text-xs text-secondary-500 uppercase">{doc.fileType || 'DOC'}</p>
                                                    </div>
                                                </div>
                                                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">View</a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-secondary-500">No documents uploaded.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                <SectionHeader title="Assigned IT Assets" />
                                <Table
                                    headers={['Asset Name', 'Model', 'Serial Number', 'Date Assigned']}
                                    rows={data.assignedAssets?.map((a: any) => [
                                        a.name,
                                        a.modelNumber || '-',
                                        a.serialNumber || '-',
                                        new Date(a.createdAt).toLocaleDateString() // Using createdAt as assigned date proxy
                                    ])}
                                />
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <SectionHeader title="Leave Balance" />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-green-50 rounded-xl">
                                            <p className="text-sm text-secondary-600 mb-1">Current Balance</p>
                                            <p className="text-2xl font-bold text-green-700">{data.employeeProfile?.currentLeaveBalance || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
                                    <SectionHeader title="Recent Attendance Logs" />
                                    <Table
                                        headers={['Date', 'Check In', 'Check Out', 'Status', 'Location']}
                                        rows={data.employeeProfile?.attendance?.map((a: any) => [
                                            new Date(a.date).toLocaleDateString(),
                                            a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '-',
                                            a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '-',
                                            <StatusBadge status={a.status} key={a.id} />,
                                            a.workFrom
                                        ])}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="text-lg font-semibold text-secondary-900 border-b border-secondary-100 pb-2 mb-4">{title}</h3>
);

const Field = ({ label, value }: { label: string, value: any }) => (
    <div>
        <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-secondary-900 mt-1">{value || '-'}</p>
    </div>
);

const InfoCard = ({ title, value, sub }: { title: string, value: string, sub?: string }) => (
    <div className="bg-white p-6 rounded-xl border border-secondary-200 shadow-sm">
        <p className="text-secondary-500 text-sm font-medium mb-2">{title}</p>
        <p className="text-xl font-bold text-secondary-900">{value}</p>
        {sub && <p className="text-sm text-secondary-400 mt-1">{sub}</p>}
    </div>
);

const Table = ({ headers, rows }: { headers: string[], rows: any[] }) => {
    if (!rows || rows.length === 0) return <p className="text-secondary-500 text-sm italic">No records found.</p>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-secondary-50 text-secondary-500 font-semibold uppercase text-xs">
                    <tr>
                        {headers.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                    {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-secondary-50">
                            {row.map((cell: any, j: number) => <td key={j} className="px-4 py-3 text-secondary-700">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const colors: any = {
        PRESENT: 'bg-green-100 text-green-700',
        ABSENT: 'bg-red-100 text-red-700',
        HALF_DAY: 'bg-yellow-100 text-yellow-700',
        LATE: 'bg-orange-100 text-orange-700'
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

const IncrementStatusBadge = ({ status }: { status: string }) => {
    const colors: any = {
        DRAFT: 'bg-secondary-100 text-secondary-600',
        PENDING_MANAGER: 'bg-amber-100 text-amber-600',
        PENDING_ADMIN: 'bg-blue-100 text-blue-600',
        APPROVED: 'bg-emerald-100 text-emerald-600',
        COMPLETED: 'bg-green-100 text-green-600',
        REJECTED: 'bg-rose-100 text-rose-600'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${colors[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {status?.replace('_', ' ') || 'UNKNOWN'}
        </span>
    );
};

const formatCurrency = (amount: number) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};
