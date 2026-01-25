
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Download, RefreshCw, TrendingUp, DollarSign, Mail } from 'lucide-react';
import EmailLogModal from '@/components/lms/EmailLogModal';

export default function LMSFinancialsPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    useEffect(() => {
        fetchFinancials();
    }, []);

    const fetchFinancials = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/lms/financials');
            if (res.ok) {
                const apiData = await res.json();
                setData(apiData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenue = data.reduce((acc, item) => acc + item.totalRevenue, 0);
    const totalFinalRevenue = data.reduce((acc, item) => acc + item.finalRevenue, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">LMS Financial Report</h1>
                        <p className="text-secondary-500">Revenue, expenses, and final earnings breakdown</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEmailModalOpen(true)} className="btn btn-primary flex gap-2">
                            <Mail size={18} /> Log Emails
                        </button>
                        <button onClick={fetchFinancials} className="btn btn-secondary flex gap-2">
                            <RefreshCw size={18} /> Refresh
                        </button>
                    </div>
                </div>

                <EmailLogModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    products={data}
                    onSuccess={fetchFinancials}
                />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card-dashboard p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary-100 rounded-xl text-primary-600">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Gross Revenue</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{totalRevenue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="card-dashboard p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-success-100 rounded-xl text-success-600">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-secondary-500 uppercase">Net Earnings</p>
                                <h3 className="text-2xl font-black text-secondary-900">
                                    ₹{totalFinalRevenue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card-dashboard overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-200 text-xs font-black text-secondary-500 uppercase tracking-widest">
                                    <th className="p-4">Product Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Mentor</th>
                                    <th className="p-4 text-right">Total Revenue</th>
                                    <th className="p-4 text-right">Sent Mails</th>
                                    <th className="p-4 text-right">Mentor Cut</th>
                                    <th className="p-4 text-right">Email Charge</th>
                                    <th className="p-4 text-right">Platform Expense</th>
                                    <th className="p-4 text-right">Final Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center">Loading data...</td></tr>
                                ) : data.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-secondary-500">No data found</td></tr>
                                ) : (
                                    data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-secondary-50/50 transition-colors">
                                            <td className="p-4 font-bold text-secondary-900">{item.productName}</td>
                                            <td className="p-4">
                                                <span className={`badge ${item.type === 'Course' ? 'bg-blue-50 text-blue-600' :
                                                    item.type === 'Workshop' ? 'bg-purple-50 text-purple-600' :
                                                        'bg-orange-50 text-orange-600'
                                                    } text-xs uppercase`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm">
                                                    <div className="font-semibold text-secondary-900">{item.mentorName}</div>
                                                    <div className="text-xs text-secondary-400">{item.mentorEmail}</div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-secondary-700">₹{item.totalRevenue}</td>
                                            <td className="p-4 text-right font-mono text-secondary-700">{item.totalSentMail}</td>
                                            <td className="p-4 text-right font-mono text-danger-600">-₹{item.mentorCut}</td>
                                            <td className="p-4 text-right font-mono text-danger-600">-₹{item.emailCharge}</td>
                                            <td className="p-4 text-right font-mono text-danger-600">-₹{item.platformExpense?.toLocaleString() || 0}</td>
                                            <td className="p-4 text-right font-mono font-bold text-success-600">₹{item.finalRevenue}</td>
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
