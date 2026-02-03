'use client';

import { FormattedNumber } from '@/components/common/FormattedNumber';

interface TopIncrementsTableProps {
    data: {
        id: string;
        name: string;
        designation: string;
        amount: number;
        percentage: number;
        newSalary: number;
    }[];
}

export default function TopIncrementsTable({ data }: TopIncrementsTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No records found.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
                <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="pb-3 pl-2">Employee</th>
                        <th className="pb-3 text-right">Increment</th>
                        <th className="pb-3 text-right">New Salary</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {data.map((inc) => (
                        <tr key={inc.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 pl-2">
                                <div className="text-sm font-medium text-gray-900">{inc.name}</div>
                                <div className="text-xs text-gray-500">{inc.designation}</div>
                            </td>
                            <td className="py-3 text-right">
                                <div className="text-sm font-bold text-green-600">
                                    +₹<FormattedNumber value={inc.amount} compact />
                                </div>
                                <div className="text-xs text-gray-500">{inc.percentage}%</div>
                            </td>
                            <td className="py-3 text-right text-sm text-gray-700">
                                ₹<FormattedNumber value={inc.newSalary} compact />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
