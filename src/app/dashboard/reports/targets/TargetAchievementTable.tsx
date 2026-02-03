'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function TargetAchievementTable({ data }: { data: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = data.filter(item =>
        item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.managerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'ACHIEVED': 'bg-green-100 text-green-700 border-green-200',
            'ON_TRACK': 'bg-blue-100 text-blue-700 border-blue-200',
            'AT_RISK': 'bg-orange-100 text-orange-700 border-orange-200',
            'LAGGING': 'bg-red-100 text-red-700 border-red-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-secondary-100 bg-secondary-50">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employee or goal..."
                        className="input-premium pl-10 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Employee Details</th>
                            <th className="px-6 py-4">Goal / Target</th>
                            <th className="px-6 py-4">Achievement</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {filteredData.map((row) => (
                            <tr key={row.id} className="hover:bg-primary-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-secondary-900">{row.employeeName}</div>
                                    <div className="text-xs text-secondary-500">Rep: {row.managerName}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-secondary-900">{row.title}</div>
                                    <div className="text-xs text-secondary-500 font-mono">
                                        Target: {row.target} {row.unit}
                                    </div>
                                    <div className="text-xs text-secondary-400 mt-1">
                                        Due: {new Date(row.endDate).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-secondary-900">
                                        {row.achievement} <span className="text-xs font-normal text-secondary-500">{row.unit}</span>
                                    </div>
                                    {/* Progress Bar */}
                                    <div className="w-24 h-1.5 bg-secondary-200 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${row.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-secondary-500 mt-1">{row.percentage.toFixed(1)}%</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(row.status)}`}>
                                        {row.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
