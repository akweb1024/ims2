'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface SalaryManagementProps {
    filters: any;
}

interface SalaryRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string;
    month: string;
    year: number;
    basicSalary: number;
    hra: number;
    allowances?: number;
    otherAllowances?: number;
    deductions?: number;
    totalDeductions?: number;
    tax?: number;
    tds?: number;
    netSalary: number;
    status: string;
    paymentDate: string | null;
}

export default function SalaryManagement({ filters }: SalaryManagementProps) {
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showPayslipModal, setShowPayslipModal] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);

    useEffect(() => {
        const fetchSalaryRecords = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('month', selectedMonth);
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);

                const res = await fetch(`/api/staff-management/salary?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setSalaryRecords(data);
                }
            } catch (err) {
                console.error('Error fetching salary records:', err);
                toast.error('Failed to fetch salary records');
            } finally {
                setLoading(false);
            }
        };

        fetchSalaryRecords();
    }, [filters, selectedMonth]);

    const handleGenerateSalary = async () => {
        try {
            const res = await fetch('/api/staff-management/salary/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: selectedMonth,
                    companyId: filters.companyId !== 'all' ? filters.companyId : null,
                    departmentId: filters.teamId !== 'all' ? filters.teamId : null
                })
            });

            if (res.ok) {
                toast.success('Salary generated successfully');
                setShowGenerateModal(false);
                window.location.reload();
            } else {
                toast.error('Failed to generate salary');
            }
        } catch (err) {
            console.error('Error generating salary:', err);
            toast.error('An error occurred');
        }
    };

    const handleProcessPayment = async (salaryId: string) => {
        try {
            const res = await fetch(`/api/staff-management/salary/${salaryId}/process`, {
                method: 'POST'
            });

            if (res.ok) {
                toast.success('Payment processed successfully');
                setSalaryRecords(salaryRecords.map(s =>
                    s.id === salaryId ? { ...s, status: 'PAID', paymentDate: new Date().toISOString() } : s
                ));
            } else {
                toast.error('Failed to process payment');
            }
        } catch (err) {
            console.error('Error processing payment:', err);
            toast.error('An error occurred');
        }
    };

    const summary = {
        totalNetSalary: salaryRecords.reduce((sum, s) => sum + (s.netSalary || 0), 0),
        pending: salaryRecords.filter(s => s.status === 'PENDING').length,
        paid: salaryRecords.filter(s => s.status === 'PAID').length,
        totalEmployees: salaryRecords.length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Salary Management</h2>
                    <p className="text-sm text-secondary-500">Manage employee salaries and payments</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                        Generate Salary
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Total Net Salary</p>
                            <p className="text-xl font-bold text-secondary-900">₹{summary.totalNetSalary.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">💰</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Pending</p>
                            <p className="text-xl font-bold text-orange-600">{summary.pending}</p>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">⏳</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Paid</p>
                            <p className="text-xl font-bold text-green-600">{summary.paid}</p>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">✅</div>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-secondary-500 uppercase">Employees</p>
                            <p className="text-xl font-bold text-secondary-900">{summary.totalEmployees}</p>
                        </div>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">👥</div>
                    </div>
                </div>
            </div>

            {/* Salary Records Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Employee</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Basic Salary</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">HRA</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Allowances</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Deductions</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Net Salary</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                                {salaryRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-sm">
                                                    {record.employeeName?.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-2">
                                                    <p className="text-sm font-medium text-secondary-900">{record.employeeName}</p>
                                                    <p className="text-xs text-secondary-500">{record.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600 font-medium">
                                            ₹{(record.basicSalary || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            ₹{(record.hra || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            ₹{(record.allowances || record.otherAllowances || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-600">
                                            ₹{(record.deductions || record.totalDeductions || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-secondary-900 font-bold">
                                            ₹{(record.netSalary || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                record.status === 'GENERATED' ? 'bg-blue-100 text-blue-700' :
                                                    record.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedSalary(record);
                                                        setShowPayslipModal(true);
                                                    }}
                                                    className="text-primary-600 hover:text-primary-800 text-sm"
                                                >
                                                    View
                                                </button>
                                                {record.status === 'GENERATED' && (
                                                    <button
                                                        onClick={() => handleProcessPayment(record.id)}
                                                        className="text-green-600 hover:text-green-800 text-sm"
                                                    >
                                                        Process
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {salaryRecords.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-secondary-500">No salary records found for this month</p>
                        </div>
                    )}
                </div>
            )}

            {/* Generate Salary Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-secondary-200">
                            <h3 className="text-lg font-semibold text-secondary-900">Generate Salary</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-secondary-600">
                                This will generate salary records for all eligible employees for{' '}
                                <span className="font-semibold">
                                    {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                            </p>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-700">
                                    ⚠️ Make sure attendance and leave data is finalized before generating salary.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowGenerateModal(false)}
                                    className="flex-1 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateSalary}
                                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payslip Modal */}
            {showPayslipModal && selectedSalary && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-secondary-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-secondary-900">Payslip</h3>
                            <button
                                onClick={() => setShowPayslipModal(false)}
                                className="text-secondary-400 hover:text-secondary-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="border-b border-secondary-200 pb-4 mb-4">
                                <h4 className="font-bold text-secondary-900">{selectedSalary.employeeName}</h4>
                                <p className="text-sm text-secondary-500">{selectedSalary.employeeEmail}</p>
                                <p className="text-sm text-secondary-500">{selectedSalary.department}</p>
                                <p className="text-sm text-secondary-500">
                                    {new Date(selectedSalary.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-secondary-600">Basic Salary</span>
                                    <span className="font-medium">₹{(selectedSalary.basicSalary || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-600">HRA</span>
                                    <span className="font-medium">₹{(selectedSalary.hra || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-600">Allowances</span>
                                    <span className="font-medium">₹{(selectedSalary.allowances || selectedSalary.otherAllowances || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>Deductions</span>
                                    <span>-₹{(selectedSalary.deductions || selectedSalary.totalDeductions || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                    <span>Tax</span>
                                    <span>-₹{(selectedSalary.tax || selectedSalary.tds || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-t border-secondary-200 pt-2 mt-2">
                                    <span className="font-bold text-secondary-900">Net Salary</span>
                                    <span className="font-bold text-green-600">₹{(selectedSalary.netSalary || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
