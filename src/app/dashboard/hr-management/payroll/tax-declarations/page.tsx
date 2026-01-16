'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    FileText,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Download,
    Eye
} from 'lucide-react';

interface TaxDeclarationRequest {
    id: string;
    employeeName: string;
    employeeId: string;
    fiscalYear: string;
    regime: string;
    totalDeductions: number;
    submissionDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export default function TaxDeclarationsAdminPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<TaxDeclarationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Mock data fetch
        setTimeout(() => {
            setRequests([
                {
                    id: '1',
                    employeeName: 'Rahul Sharma',
                    employeeId: 'EMP001',
                    fiscalYear: '2025-2026',
                    regime: 'OLD',
                    totalDeductions: 150000,
                    submissionDate: '2025-04-10',
                    status: 'PENDING'
                },
                {
                    id: '2',
                    employeeName: 'Priya Singh',
                    employeeId: 'EMP042',
                    fiscalYear: '2025-2026',
                    regime: 'NEW',
                    totalDeductions: 0,
                    submissionDate: '2025-04-12',
                    status: 'APPROVED'
                },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this tax declaration? Salary structure will be updated.')) return;
        // Mock API call
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        // Mock API call
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="h-6 w-6 text-purple-600" />
                            Tax Declarations Review
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                            Review and approve employee tax regime choices and investment proofs.
                        </p>
                    </div>
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export Report
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by employee name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Fiscal Year</th>
                                    <th className="px-6 py-4">Regime</th>
                                    <th className="px-6 py-4">Total Deductions</th>
                                    <th className="px-6 py-4">Submit Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                    6</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading requests...</td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No declarations found matching filters.</td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{req.employeeName}</div>
                                                <div className="text-xs text-gray-500">{req.employeeId}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{req.fiscalYear}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${req.regime === 'NEW' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {req.regime}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                ₹{req.totalDeductions.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(req.submissionDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex w-fit items-center gap-1 ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {req.status === 'APPROVED' && <CheckCircle className="h-3 w-3" />}
                                                    {req.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600" title="View Details">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {req.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(req.id)}
                                                            className="p-1.5 hover:bg-green-50 rounded text-gray-400 hover:text-green-600"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(req.id)}
                                                            className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
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
