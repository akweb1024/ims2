'use client';

import { useState } from 'react';
import { Search, Trophy, Medal } from 'lucide-react';

export default function PerformanceReportTable({ data }: { data: any[] }) {
    const [view, setView] = useState<'TEAM' | 'COMPANY'>('COMPANY');

    // In a real app, 'TEAM' filtering would require current user context or additional data
    // For now, simple toggles
    const filteredData = data; // Placeholder for scope filtering logic

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-secondary-100 bg-secondary-50 flex justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('COMPANY')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'COMPANY' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-100'
                            }`}
                    >
                        Company Wide
                    </button>
                    <button
                        onClick={() => setView('TEAM')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${view === 'TEAM' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-600 hover:bg-secondary-100'
                            }`}
                    >
                        My Team
                    </button>
                </div>
                <div className="text-sm text-secondary-500 font-medium">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            <th className="px-6 py-4 w-16">Rank</th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4 text-center">Score</th>
                            <th className="px-6 py-4 text-center">Revenue</th>
                            <th className="px-6 py-4 text-center">Tasks</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {filteredData.map((row, index) => (
                            <tr key={row.id} className={`hover:bg-primary-50 transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                                <td className="px-6 py-4 font-black text-secondary-400 text-center">
                                    {index === 0 ? <Trophy className="text-yellow-500 w-6 h-6 mx-auto" /> :
                                        index === 1 ? <Medal className="text-gray-400 w-6 h-6 mx-auto" /> :
                                            index === 2 ? <Medal className="text-orange-400 w-6 h-6 mx-auto" /> :
                                                `#${index + 1}`}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-secondary-900 flex items-center gap-2">
                                        {row.employeeName}
                                        {row.isTopPerformer && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">STAR</span>}
                                    </div>
                                    <div className="text-xs text-secondary-500">{row.designation}</div>
                                </td>
                                <td className="px-6 py-4 text-secondary-600 font-medium">
                                    {row.department}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                                        {row.overallScore.toFixed(1)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-secondary-600">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(row.revenueGenerated)}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-secondary-600">
                                    {row.tasksCompleted}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
