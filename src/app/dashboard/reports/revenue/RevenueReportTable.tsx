'use client';

import { useState } from 'react';

interface RevenueReportTableProps {
    data: any[];
    isYearly?: boolean;
}

export default function RevenueReportTable({ data, isYearly = false }: RevenueReportTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (data.length === 0) {
        return <div className="p-8 text-center text-secondary-500 italic">No financial records found.</div>;
    }

    return (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                        <th className="px-6 py-3 w-1/3">Period</th>
                        <th className="px-6 py-3 w-1/3">Category</th>
                        <th className="px-6 py-3 w-1/3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-primary-50 transition-colors">
                            <td className="px-6 py-3 font-medium text-secondary-900">
                                {row.period}
                            </td>
                            <td className="px-6 py-3 text-secondary-600">
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${row.type === 'REVENUE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {row.category}
                            </td>
                            <td className={`px-6 py-3 text-right font-bold ${row.type === 'REVENUE' ? 'text-green-700' : 'text-red-700'}`}>
                                {row.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(row.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
