'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Download, Plus, RefreshCw, FileText } from 'lucide-react';

export default function PayrollPage() {
    const [slips, setSlips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() === 0 ? 12 : today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear());

    // User role check
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }
        fetchSlips();
    }, [selectedMonth, selectedYear]);

    const fetchSlips = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/salary-slips?all=true&month=${selectedMonth}&year=${selectedYear}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSlips(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm(`Are you sure you want to generate salary slips for ${selectedMonth}/${selectedYear}? This will calculate payroll for all active employees.`)) return;

        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/salary-slips', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'BULK_GENERATE',
                    month: selectedMonth,
                    year: selectedYear
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchSlips();
            } else {
                alert('Failed to generate payroll');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (slipId: string, employeeName: string) => {
        const btn = document.getElementById(`btn-${slipId}`);
        if (btn) btn.innerHTML = '...';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/salary-slips/${slipId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Salary_Slip_${employeeName}_${selectedMonth}_${selectedYear}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert("Could not download PDF");
            }
        } catch (e) {
            alert("Download failed");
        } finally {
            if (btn) btn.innerHTML = 'PDF';
        }
    };

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900">Payroll Management</h1>
                        <p className="text-secondary-600 mt-1">Generate and manage monthly salary slips</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="input-premium py-2"
                        >
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="input-premium py-2 w-24"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="btn btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            {generating ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                            Generate Slip
                        </button>
                    </div>
                </div>

                {/* Payroll Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card-premium p-6 border-l-4 border-primary-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Total Payout</p>
                                <h3 className="text-3xl font-black text-secondary-900 mt-2">
                                    ₹{slips.reduce((acc, s) => acc + s.amountPaid, 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                                <span className="text-2xl">💰</span>
                            </div>
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-success-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Slips Generated</p>
                                <h3 className="text-3xl font-black text-secondary-900 mt-2">
                                    {slips.length}
                                </h3>
                            </div>
                            <div className="p-3 bg-success-100 text-success-600 rounded-xl">
                                <span className="text-2xl">📄</span>
                            </div>
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-warning-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-secondary-500 text-sm font-bold uppercase tracking-wider">Pending Deductions</p>
                                <h3 className="text-3xl font-black text-secondary-900 mt-2">
                                    ₹{slips.reduce((acc, s) => acc + (s.advanceDeduction || 0) + (s.lwpDeduction || 0), 0).toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-3 bg-warning-100 text-warning-600 rounded-xl">
                                <span className="text-2xl">📉</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Gross Salary</th>
                                    <th>Deductions</th>
                                    <th>Net Payable</th>
                                    <th>Generated On</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-10">Loading...</td></tr>
                                ) : slips.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-10 text-secondary-500">No salary slips found for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}. Click &quot;Generate Slip&quot; to process payroll.</td></tr>
                                ) : (
                                    slips.map((slip) => (
                                        <tr key={slip.id} className="hover:bg-secondary-50">
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                                        {slip.employee.user.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900">{slip.employee.user.name || slip.employee.user.email.split('@')[0]}</p>
                                                        <p className="text-[10px] uppercase font-bold text-secondary-400">{slip.employee.designation || 'Staff'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="font-mono text-secondary-600">
                                                ₹{(slip.amountPaid + (slip.advanceDeduction || 0) + (slip.lwpDeduction || 0)).toLocaleString()}
                                            </td>
                                            <td className="text-danger-600 font-mono text-xs">
                                                {((slip.advanceDeduction || 0) + (slip.lwpDeduction || 0)) > 0 ? (
                                                    <span>- ₹{((slip.advanceDeduction || 0) + (slip.lwpDeduction || 0)).toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-secondary-400">₹0</span>
                                                )}
                                            </td>
                                            <td className="font-black text-success-700 text-lg font-mono">
                                                ₹{slip.amountPaid.toLocaleString()}
                                            </td>
                                            <td className="text-xs text-secondary-500">
                                                <FormattedDate date={slip.generatedAt} />
                                            </td>
                                            <td>
                                                <button
                                                    id={`btn-${slip.id}`}
                                                    onClick={() => handleDownload(slip.id, slip.employee.user.name)}
                                                    className="btn btn-secondary py-1 px-3 text-xs flex items-center gap-2"
                                                >
                                                    <FileText size={14} /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
