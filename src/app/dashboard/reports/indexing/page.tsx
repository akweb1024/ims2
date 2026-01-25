'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { Target, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function IndexingReportPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/reports/indexing', { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) setData(await res.json());
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // Helper to check critical missing data
    const getMissingPoints = (journal: any) => {
        const missing = [];
        if (!journal.issnPrint && !journal.issnOnline) missing.push('ISSN');
        if (!journal.frequency) missing.push('Frequency');
        if (!journal.subjectCategory) missing.push('Category');
        if (!journal.abbreviation) missing.push('Abbreviation');
        return missing;
    };

    // Stats
    const totalApplications = data.length;
    const indexed = data.filter(d => d.status === 'INDEXED').length;
    const ready = data.filter(d => d.status === 'READY_TO_SUBMIT').length;
    const avgScore = totalApplications > 0
        ? Math.round(data.reduce((acc, curr) => acc + (curr.auditScore || 0), 0) / totalApplications)
        : 0;

    return (
        <DashboardLayout userRole="ADMIN"> {/* Adjust Role as needed */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">Indexing Progress Report</h1>
                    <p className="text-secondary-500">Track readiness and application status across all journals.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card-premium p-6 flex items-center justify-between border-l-4 border-blue-500">
                        <div>
                            <p className="text-secondary-500 font-bold text-xs uppercase">Total Applications</p>
                            <p className="text-3xl font-black text-secondary-900">{totalApplications}</p>
                        </div>
                        <Target className="w-10 h-10 text-blue-100" />
                    </div>
                    <div className="card-premium p-6 flex items-center justify-between border-l-4 border-green-500">
                        <div>
                            <p className="text-secondary-500 font-bold text-xs uppercase">Successfully Indexed</p>
                            <p className="text-3xl font-black text-secondary-900">{indexed}</p>
                        </div>
                        <CheckCircle className="w-10 h-10 text-green-100" />
                    </div>
                    <div className="card-premium p-6 flex items-center justify-between border-l-4 border-orange-500">
                        <div>
                            <p className="text-secondary-500 font-bold text-xs uppercase">Ready to Submit</p>
                            <p className="text-3xl font-black text-secondary-900">{ready}</p>
                        </div>
                        <Clock className="w-10 h-10 text-orange-100" />
                    </div>
                    <div className="card-premium p-6 flex items-center justify-between border-l-4 border-purple-500">
                        <div>
                            <p className="text-secondary-500 font-bold text-xs uppercase">Avg. Readiness</p>
                            <p className="text-3xl font-black text-secondary-900">{avgScore}%</p>
                        </div>
                        <div className="radial-progress text-purple-600 text-xs font-bold" style={{ "--value": avgScore, "--size": "3rem" } as any}>{avgScore}%</div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="card-premium p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-secondary-50 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Journal</th>
                                    <th className="p-4">Indexing Body</th>
                                    <th className="p-4">Readiness Audit</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Missing Components</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading && (
                                    <tr><td colSpan={6} className="p-8 text-center text-secondary-400">Loading data...</td></tr>
                                )}
                                {!loading && data.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-secondary-400">No indexing data found.</td></tr>
                                )}
                                {data.map((row) => {
                                    const missing = getMissingPoints(row.journal);
                                    const score = row.auditScore || 0;
                                    const isScopus = row.indexingMaster.name.toLowerCase().includes('scopus');

                                    return (
                                        <tr key={row.id} className="hover:bg-secondary-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-secondary-900">{row.journal.name}</div>
                                                <div className="text-xs text-secondary-500">{row.journal.abbreviation || 'No Abbr.'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isScopus ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {row.indexingMaster.name}
                                                </span>
                                            </td>
                                            <td className="p-4 max-w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold w-8">{score}%</span>
                                                    <div className="w-full h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${score === 100 ? 'bg-green-500' : score > 70 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                            style={{ width: `${score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`badge ${row.status === 'READY_TO_SUBMIT' || row.status === 'INDEXED' ? 'badge-success' : 'badge-warning'}`}>
                                                    {row.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {missing.length > 0 ? (
                                                    <div className="flex items-center gap-1 text-danger-600 text-xs font-bold">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Missing: {missing.slice(0, 2).join(', ')}{missing.length > 2 && '...'}
                                                    </div>
                                                ) : (
                                                    <div className="text-success-600 text-xs font-bold flex items-center gap-1">
                                                        <CheckCircle className="w-4 h-4" /> Data Complete
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Link
                                                    href={`/dashboard/journals/${row.journalId}/edit`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    Manage
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
