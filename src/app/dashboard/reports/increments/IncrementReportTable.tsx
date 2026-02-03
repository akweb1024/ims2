'use client';

import { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';
import KRAKPIModal from '@/components/dashboard/reports/KRAKPIModal';

export default function IncrementReportTable({ data }: { data: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

    const filteredData = data.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-secondary-100 bg-secondary-50 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employee, manager, or designation..."
                        className="input-premium pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Add filters here if needed */}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            <th className="px-6 py-4 sticky left-0 bg-secondary-50 z-10">Employee</th>
                            <th className="px-6 py-4">Structure Breakdown</th>
                            <th className="px-6 py-4">Total CTC</th>
                            <th className="px-6 py-4">Experience</th>
                            <th className="px-6 py-4">Last Increment</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {filteredData.map((emp) => (
                            <tr key={emp.id} className="hover:bg-primary-50 transition-colors group">
                                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-primary-50">
                                    <div className="font-bold text-secondary-900">{emp.name}</div>
                                    <div className="text-xs text-secondary-500">{emp.designation}</div>
                                    <div className="text-xs text-secondary-400 mt-1">Reports to: {emp.manager}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between w-40"><span className="text-secondary-500">Fixed:</span> <span>{formatCurrency(emp.salary.fixed)}</span></div>
                                        <div className="flex justify-between w-40"><span className="text-secondary-500">Variable:</span> <span>{formatCurrency(emp.salary.variable)}</span></div>
                                        <div className="flex justify-between w-40"><span className="text-secondary-500">Incentive:</span> <span>{formatCurrency(emp.salary.incentive)}</span></div>
                                        {emp.salary.perks > 0 && <div className="flex justify-between w-40"><span className="text-secondary-500">Perks:</span> <span>{formatCurrency(emp.salary.perks)}</span></div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-secondary-900 text-base">{formatCurrency(emp.salary.total)}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                                        {emp.experience}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {emp.lastIncrement ? (
                                        <div>
                                            <div className="flex items-center gap-2 text-green-700 font-bold">
                                                <span>+{emp.lastIncrement.percent}%</span>
                                                <span className="text-xs font-normal text-secondary-500">({formatCurrency(emp.lastIncrement.amount)})</span>
                                            </div>
                                            <div className="text-xs text-secondary-400 mt-1">
                                                {new Date(emp.lastIncrement.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-secondary-400 italic">No history</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => setSelectedEmployee(emp)}
                                        className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1 ml-auto"
                                    >
                                        <Eye size={14} /> View KRAs
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <KRAKPIModal
                isOpen={!!selectedEmployee}
                onClose={() => setSelectedEmployee(null)}
                employeeName={selectedEmployee?.name}
                kras={selectedEmployee?.kras}
            />
        </div>
    );
}
