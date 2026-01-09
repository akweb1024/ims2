'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Download, Upload, Save, Search, DollarSign, FileText } from 'lucide-react';

export default function SalaryStructurePage() {
    const [structures, setStructures] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [structRes, empRes] = await Promise.all([
                fetch('/api/hr/payroll/structures', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hr/employees', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (structRes.ok && empRes.ok) {
                const sData = await structRes.json();
                const eData = await empRes.json();
                setStructures(sData);
                setEmployees(eData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ['Employee ID', 'Name', 'Email', 'Basic', 'HRA', 'Conveyance', 'Medical', 'Special Allowance', 'PF Employee', 'ESIC Employee', 'PT', 'TDS', 'Net Salary', 'CTC'];
        const rows = structures.map(s => [
            s.employee?.employeeId || s.employeeId,
            s.employee?.user?.name || '',
            s.employee?.user?.email || '',
            s.basicSalary,
            s.hra,
            s.conveyance,
            s.medical,
            s.specialAllowance,
            s.pfEmployee,
            s.esicEmployee,
            s.professionalTax,
            s.tds,
            s.netSalary,
            s.ctc
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `salary_structures_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            // Map header names to keys
            const mapIdx = (name: string) => headers.findIndex(h => h.includes(name));

            const idxEmail = mapIdx('email');
            const idxBasic = mapIdx('basic');

            if (idxEmail === -1 || idxBasic === -1) {
                return alert('CSV must have Email and Basic columns');
            }

            const payload = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                if (cols.length < headers.length) continue;

                const email = cols[idxEmail]?.trim();
                const emp = employees.find(e => e.user.email === email);

                if (emp) {
                    payload.push({
                        employeeId: emp.id,
                        basicSalary: parseFloat(cols[idxBasic]) || 0,
                        hra: parseFloat(cols[mapIdx('hra')]) || 0,
                        conveyance: parseFloat(cols[mapIdx('conveyance')]) || 0,
                        medical: parseFloat(cols[mapIdx('medical')]) || 0,
                        specialAllowance: parseFloat(cols[mapIdx('special')]) || 0,
                        pfEmployee: parseFloat(cols[mapIdx('pf employee')]) || 0,
                        esicEmployee: parseFloat(cols[mapIdx('esic employee')]) || 0,
                        professionalTax: parseFloat(cols[mapIdx('pt')]) || 0,
                        tds: parseFloat(cols[mapIdx('tds')]) || 0,
                        // Add more as needed
                    });
                }
            }

            if (payload.length > 0) {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/hr/payroll/structures', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert(`Imported ${payload.length} records successfully!`);
                    fetchData();
                } else {
                    alert('Import failed');
                }
            } else {
                alert('No matching employees found in CSV');
            }
        };
        reader.readAsText(file);
    };

    const filtered = structures.filter(s =>
        s.employee?.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.employee?.user?.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout userRole="HR_MANAGER">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Salary Structures</h1>
                        <p className="text-secondary-500">Manage CTC breakdowns and net pay definitions.</p>
                    </div>
                    <div className="flex gap-3">
                        <label className="btn btn-outline border-secondary-300 text-secondary-700 font-bold flex items-center gap-2 cursor-pointer hover:bg-secondary-50">
                            <Upload size={18} /> Import CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                        </label>
                        <button onClick={handleExport} className="btn btn-outline border-secondary-300 text-secondary-700 font-bold flex items-center gap-2 hover:bg-secondary-50">
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="card-premium p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                            <input
                                className="input pl-10"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full text-sm text-left">
                            <thead className="bg-secondary-50 text-secondary-500 uppercase font-black text-xs">
                                <tr>
                                    <th className="p-4 rounded-tl-xl">Employee</th>
                                    <th className="p-4 text-right">Basic</th>
                                    <th className="p-4 text-right">HRA</th>
                                    <th className="p-4 text-right">Allowances</th>
                                    <th className="p-4 text-right">Gross</th>
                                    <th className="p-4 text-right text-danger-600">Deductions</th>
                                    <th className="p-4 text-right text-success-600 rounded-tr-xl">Net Salary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="p-4 text-center">Loading...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="p-4 text-center text-secondary-400">No salary structures defined. Try Importing.</td></tr>
                                ) : filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-secondary-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-secondary-900">{s.employee?.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-secondary-500">{s.employee?.user?.email}</div>
                                            <div className="badge badge-secondary text-[10px] mt-1">{s.employee?.designation || 'Staff'}</div>
                                        </td>
                                        <td className="p-4 text-right font-mono">₹{s.basicSalary?.toLocaleString()}</td>
                                        <td className="p-4 text-right font-mono">₹{s.hra?.toLocaleString()}</td>
                                        <td className="p-4 text-right font-mono">₹{((s.specialAllowance || 0) + (s.conveyance || 0) + (s.medical || 0)).toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold text-secondary-700">₹{s.grossSalary?.toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold text-danger-600">-₹{s.totalDeductions?.toLocaleString()}</td>
                                        <td className="p-4 text-right font-black text-success-600 text-lg">₹{s.netSalary?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
