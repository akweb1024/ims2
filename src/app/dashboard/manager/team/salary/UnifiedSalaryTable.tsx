'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import IncrementProposalModal from './IncrementProposalModal';

export default function UnifiedSalaryTable({ salaries }: { salaries: any[] }) {
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleProposeIncrement = (employee: any) => {
        if (!employee.employeeProfile) {
            alert('Employee profile incomplete');
            return;
        }
        setSelectedEmployee(employee);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Structure (Fixed / Var)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Increment</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salaries.map((user) => (
                                <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                {user.userName?.charAt(0) || 'U'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                                                <div className="text-xs text-gray-500">{user.employeeProfile?.designation || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            {user.companyName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {user.employeeProfile?.baseSalary
                                            ? `₹${user.employeeProfile.baseSalary.toLocaleString()}`
                                            : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>F: ₹{user.employeeProfile?.fixedSalary?.toLocaleString() || 0}</div>
                                        <div className="text-xs text-gray-400">V: ₹{user.employeeProfile?.variableSalary?.toLocaleString() || 0}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.employeeProfile?.lastIncrementDate ? (
                                            <div>
                                                {format(new Date(user.employeeProfile.lastIncrementDate), 'MMM yyyy')}
                                                {user.employeeProfile.lastIncrementPercentage && (
                                                    <span className="ml-2 text-green-600 font-medium">
                                                        +{user.employeeProfile.lastIncrementPercentage}%
                                                    </span>
                                                )}
                                            </div>
                                        ) : 'None'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleProposeIncrement(user)}
                                            className="text-primary-600 hover:text-primary-900 text-sm font-medium hover:underline"
                                        >
                                            Propose Increment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {salaries.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No team members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <IncrementProposalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                employee={selectedEmployee}
            />
        </>
    );
}
