'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import SafeHTML from '@/components/common/SafeHTML';
import {
    DollarSign, TrendingUp, User, Calendar, CheckCircle, XCircle,
    Clock, AlertCircle, ArrowLeft, ThumbsUp, ThumbsDown, Edit
} from 'lucide-react';
import Link from 'next/link';

export default function IncrementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [increment, setIncrement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showManagerReview, setShowManagerReview] = useState(false);
    const [showAdminReview, setShowAdminReview] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        action: 'approve',
        comments: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        }
    }, []);

    const fetchIncrement = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${params.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setIncrement(data);
            } else {
                alert('Increment not found');
                router.push('/dashboard/hr-management/increments');
            }
        } catch (error) {
            console.error('Error fetching increment:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => {
        fetchIncrement();
    }, [fetchIncrement]);

    const handleManagerReview = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${params.id}/manager-review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewForm)
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchIncrement();
                setShowManagerReview(false);
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdminApproval = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/hr/increments/${params.id}/admin-approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewForm)
            });

            if (res.ok) {
                const data = await res.json();
                alert(data.message);
                fetchIncrement();
                setShowAdminReview(false);
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error submitting approval:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-secondary-600 mt-4">Loading increment details...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!increment) {
        return null;
    }

    const isManager = increment.employeeProfile?.user?.managerId === currentUser?.id;
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);
    const canManagerReview = (isManager || isAdmin) && increment.status === 'DRAFT';
    const canAdminApprove = isAdmin && increment.status === 'MANAGER_APPROVED';

    const getStatusBadge = (status: string) => {
        const badges: any = {
            'DRAFT': { color: 'bg-secondary-100 text-secondary-700 border-secondary-300', icon: Clock, text: 'Draft' },
            'MANAGER_APPROVED': { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: AlertCircle, text: 'Awaiting Admin Approval' },
            'APPROVED': { color: 'bg-success-100 text-success-700 border-success-300', icon: CheckCircle, text: 'Approved & Applied' },
            'REJECTED': { color: 'bg-danger-100 text-danger-700 border-danger-300', icon: XCircle, text: 'Rejected' }
        };

        const badge = badges[status] || badges['DRAFT'];
        const Icon = badge.icon;

        return (
            <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 ${badge.color}`}>
                <Icon size={20} />
                <span className="font-bold">{badge.text}</span>
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div className="p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <Link
                                href="/dashboard/hr-management/increments"
                                className="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-2 mb-2"
                            >
                                <ArrowLeft size={20} />
                                Back to Increments
                            </Link>
                            <h1 className="text-3xl font-black text-secondary-900">
                                Increment Details
                            </h1>
                            <p className="text-secondary-600 mt-1">
                                Review and approve salary increment
                            </p>
                        </div>
                        {getStatusBadge(increment.status)}
                    </div>

                    {/* Employee Info */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                            <User className="text-primary-500" size={20} />
                            Employee Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-secondary-500 font-bold uppercase">Name</p>
                                <p className="font-bold text-secondary-900">{increment.employeeProfile?.user?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 font-bold uppercase">Email</p>
                                <p className="text-secondary-700">{increment.employeeProfile?.user?.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-secondary-500 font-bold uppercase">Current Designation</p>
                                <p className="font-bold text-secondary-900">{increment.previousDesignation || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Salary Comparison */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                            <DollarSign className="text-success-500" size={20} />
                            Salary Breakdown
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Old Salary */}
                            <div className="p-4 bg-secondary-50 rounded-xl">
                                <p className="text-sm font-bold text-secondary-600 mb-3">Current Salary</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-secondary-600">Fixed:</span>
                                        <span className="font-bold">₹{(increment.oldFixed || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-600">Variable:</span>
                                        <span className="font-bold">₹{(increment.oldVariable || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-600">Incentive:</span>
                                        <span className="font-bold">₹{(increment.oldIncentive || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 border-t border-secondary-200 flex justify-between">
                                        <span className="font-bold text-secondary-900">Total:</span>
                                        <span className="font-black text-lg text-secondary-900">₹{increment.oldSalary.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* New Salary */}
                            <div className="p-4 bg-gradient-to-br from-primary-50 to-success-50 rounded-xl border-2 border-primary-200">
                                <p className="text-sm font-bold text-primary-700 mb-3">Proposed Salary</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-secondary-700">Fixed:</span>
                                        <span className="font-bold text-primary-700">₹{(increment.newFixed || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-700">Variable:</span>
                                        <span className="font-bold text-primary-700">₹{(increment.newVariable || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-700">Incentive:</span>
                                        <span className="font-bold text-primary-700">₹{(increment.newIncentive || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 border-t border-primary-300 flex justify-between">
                                        <span className="font-bold text-primary-900">Total:</span>
                                        <span className="font-black text-lg text-primary-600">₹{increment.newSalary.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Increment Summary */}
                        <div className="mt-6 p-4 bg-success-50 rounded-xl border border-success-200">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Increment Amount</p>
                                    <p className="text-2xl font-black text-success-600">+₹{increment.incrementAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Percentage</p>
                                    <p className="text-2xl font-black text-success-600">{increment.percentage.toFixed(2)}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Effective Date</p>
                                    <p className="text-lg font-black text-secondary-900">
                                        <FormattedDate date={increment.effectiveDate} />
                                    </p>
                                </div>
                            </div>
                        </div>

                        {increment.newDesignation && increment.newDesignation !== increment.previousDesignation && (
                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                                <p className="text-sm font-bold text-indigo-900 mb-2">Designation Change</p>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-secondary-200 rounded-lg font-bold text-secondary-700">
                                        {increment.previousDesignation}
                                    </span>
                                    <TrendingUp className="text-indigo-600" />
                                    <span className="px-3 py-1 bg-indigo-200 rounded-lg font-bold text-indigo-700">
                                        {increment.newDesignation}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Visual Salary Comparison Analytics */}
                    <div className="card-premium p-6">
                        <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                            <TrendingUp className="text-indigo-500" size={20} />
                            Visual Salary Analytics
                        </h2>

                        {/* Component-wise Comparison Chart */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-secondary-700 mb-4">Component-wise Comparison</h3>
                            <div className="space-y-4">
                                {/* Fixed Salary Bar */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-secondary-600">Fixed Salary</span>
                                        <div className="flex gap-4">
                                            <span className="text-xs text-secondary-500">Old: ₹{(increment.oldFixed || 0).toLocaleString()}</span>
                                            <span className="text-xs font-bold text-primary-600">New: ₹{(increment.newFixed || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="relative h-8 bg-secondary-100 rounded-lg overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-secondary-300 transition-all"
                                            style={{ width: `${(increment.oldFixed / increment.newSalary) * 100}%` }}
                                        />
                                        <div
                                            className="absolute top-0 left-0 h-full bg-primary-500 transition-all"
                                            style={{ width: `${(increment.newFixed / increment.newSalary) * 100}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white drop-shadow">
                                                {increment.oldFixed > 0
                                                    ? `${((increment.newFixed - increment.oldFixed) / increment.oldFixed * 100).toFixed(1)}%`
                                                    : 'New'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Variable Salary Bar */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-secondary-600">Variable Salary</span>
                                        <div className="flex gap-4">
                                            <span className="text-xs text-secondary-500">Old: ₹{(increment.oldVariable || 0).toLocaleString()}</span>
                                            <span className="text-xs font-bold text-blue-600">New: ₹{(increment.newVariable || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="relative h-8 bg-secondary-100 rounded-lg overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-secondary-300 transition-all"
                                            style={{ width: `${(increment.oldVariable / increment.newSalary) * 100}%` }}
                                        />
                                        <div
                                            className="absolute top-0 left-0 h-full bg-blue-500 transition-all"
                                            style={{ width: `${(increment.newVariable / increment.newSalary) * 100}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white drop-shadow">
                                                {increment.oldVariable > 0
                                                    ? `${((increment.newVariable - increment.oldVariable) / increment.oldVariable * 100).toFixed(1)}%`
                                                    : 'New'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Incentive Bar */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs font-bold text-secondary-600">Incentive</span>
                                        <div className="flex gap-4">
                                            <span className="text-xs text-secondary-500">Old: ₹{(increment.oldIncentive || 0).toLocaleString()}</span>
                                            <span className="text-xs font-bold text-purple-600">New: ₹{(increment.newIncentive || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="relative h-8 bg-secondary-100 rounded-lg overflow-hidden">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-secondary-300 transition-all"
                                            style={{ width: `${(increment.oldIncentive / increment.newSalary) * 100}%` }}
                                        />
                                        <div
                                            className="absolute top-0 left-0 h-full bg-purple-500 transition-all"
                                            style={{ width: `${(increment.newIncentive / increment.newSalary) * 100}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white drop-shadow">
                                                {increment.oldIncentive > 0
                                                    ? `${((increment.newIncentive - increment.oldIncentive) / increment.oldIncentive * 100).toFixed(1)}%`
                                                    : 'New'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Salary Distribution Pie Chart Representation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Old Salary Distribution */}
                            <div className="p-4 bg-secondary-50 rounded-xl">
                                <h4 className="text-sm font-bold text-secondary-700 mb-4 text-center">Current Salary Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-secondary-400 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Fixed</span>
                                                <span className="font-bold">{increment.oldSalary > 0 ? ((increment.oldFixed / increment.oldSalary) * 100).toFixed(1) : 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-blue-400 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Variable</span>
                                                <span className="font-bold">{increment.oldSalary > 0 ? ((increment.oldVariable / increment.oldSalary) * 100).toFixed(1) : 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-purple-400 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Incentive</span>
                                                <span className="font-bold">{increment.oldSalary > 0 ? ((increment.oldIncentive / increment.oldSalary) * 100).toFixed(1) : 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* New Salary Distribution */}
                            <div className="p-4 bg-gradient-to-br from-primary-50 to-success-50 rounded-xl border-2 border-primary-200">
                                <h4 className="text-sm font-bold text-primary-700 mb-4 text-center">New Salary Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-primary-500 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Fixed</span>
                                                <span className="font-bold">{((increment.newFixed / increment.newSalary) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Variable</span>
                                                <span className="font-bold">{((increment.newVariable / increment.newSalary) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Incentive</span>
                                                <span className="font-bold">{((increment.newIncentive / increment.newSalary) * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Overall Comparison Stats */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-gradient-to-br from-success-50 to-success-100 rounded-xl text-center">
                                <p className="text-xs text-success-700 font-bold uppercase mb-1">Total Increase</p>
                                <p className="text-2xl font-black text-success-600">₹{increment.incrementAmount.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl text-center">
                                <p className="text-xs text-indigo-700 font-bold uppercase mb-1">Percentage</p>
                                <p className="text-2xl font-black text-indigo-600">{increment.percentage.toFixed(2)}%</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl text-center">
                                <p className="text-xs text-orange-700 font-bold uppercase mb-1">Monthly Impact</p>
                                <p className="text-2xl font-black text-orange-600">+₹{increment.incrementAmount.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl text-center">
                                <p className="text-xs text-pink-700 font-bold uppercase mb-1">Annual Impact</p>
                                <p className="text-2xl font-black text-pink-600">+₹{(increment.incrementAmount * 12).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Sec-10 Exemp / Perks Comparison */}
                    {(increment.oldHealthCare || increment.newHealthCare || increment.oldTravelling || increment.newTravelling ||
                        increment.oldMobile || increment.newMobile || increment.oldInternet || increment.newInternet ||
                        increment.oldBooksAndPeriodicals || increment.newBooksAndPeriodicals) && (
                            <div className="card-premium p-6">
                                <h2 className="text-lg font-black text-secondary-900 mb-6 flex items-center gap-2">
                                    <TrendingUp className="text-success-500" size={20} />
                                    Sec-10 Exemp / Perks Breakdown
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Old Perks */}
                                    <div className="p-4 bg-secondary-50 rounded-xl">
                                        <p className="text-sm font-bold text-secondary-600 mb-3">Current Perks</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-secondary-600">Health Care:</span>
                                                <span className="font-bold">₹{(increment.oldHealthCare || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-600">Travelling:</span>
                                                <span className="font-bold">₹{(increment.oldTravelling || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-600">Mobile:</span>
                                                <span className="font-bold">₹{(increment.oldMobile || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-600">Internet:</span>
                                                <span className="font-bold">₹{(increment.oldInternet || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-600">Books & Periodicals:</span>
                                                <span className="font-bold">₹{(increment.oldBooksAndPeriodicals || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-secondary-200 flex justify-between">
                                                <span className="font-bold text-secondary-900">Total Perks:</span>
                                                <span className="font-black text-lg text-secondary-900">
                                                    ₹{((increment.oldHealthCare || 0) + (increment.oldTravelling || 0) +
                                                        (increment.oldMobile || 0) + (increment.oldInternet || 0) +
                                                        (increment.oldBooksAndPeriodicals || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* New Perks */}
                                    <div className="p-4 bg-gradient-to-br from-success-50 to-green-50 rounded-xl border-2 border-success-200">
                                        <p className="text-sm font-bold text-success-700 mb-3">Proposed Perks</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-secondary-700">Health Care:</span>
                                                <span className="font-bold text-success-700">₹{(increment.newHealthCare || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-700">Travelling:</span>
                                                <span className="font-bold text-success-700">₹{(increment.newTravelling || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-700">Mobile:</span>
                                                <span className="font-bold text-success-700">₹{(increment.newMobile || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-700">Internet:</span>
                                                <span className="font-bold text-success-700">₹{(increment.newInternet || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-secondary-700">Books & Periodicals:</span>
                                                <span className="font-bold text-success-700">₹{(increment.newBooksAndPeriodicals || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-success-300 flex justify-between">
                                                <span className="font-bold text-success-900">Total Perks:</span>
                                                <span className="font-black text-lg text-success-600">
                                                    ₹{((increment.newHealthCare || 0) + (increment.newTravelling || 0) +
                                                        (increment.newMobile || 0) + (increment.newInternet || 0) +
                                                        (increment.newBooksAndPeriodicals || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Perks Change Summary */}
                                {(() => {
                                    const oldTotal = (increment.oldHealthCare || 0) + (increment.oldTravelling || 0) +
                                        (increment.oldMobile || 0) + (increment.oldInternet || 0) +
                                        (increment.oldBooksAndPeriodicals || 0);
                                    const newTotal = (increment.newHealthCare || 0) + (increment.newTravelling || 0) +
                                        (increment.newMobile || 0) + (increment.newInternet || 0) +
                                        (increment.newBooksAndPeriodicals || 0);
                                    const perksChange = newTotal - oldTotal;
                                    const perksChangePercent = oldTotal > 0 ? (perksChange / oldTotal) * 100 : 0;

                                    return perksChange !== 0 && (
                                        <div className="mt-6 p-4 bg-gradient-to-r from-success-50 to-green-50 rounded-xl border border-success-200">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Perks Change</p>
                                                    <p className={`text-2xl font-black ${perksChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                        {perksChange >= 0 ? '+' : ''}₹{perksChange.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Change %</p>
                                                    <p className={`text-2xl font-black ${perksChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                        {perksChange >= 0 ? '+' : ''}{perksChangePercent.toFixed(2)}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-secondary-600 font-bold uppercase mb-1">Annual Impact</p>
                                                    <p className={`text-2xl font-black ${perksChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                                        {perksChange >= 0 ? '+' : ''}₹{(perksChange * 12).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                    {/* Justification */}
                    {(increment.reason || increment.performanceNotes) && (
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4">
                                Justification & Performance Notes
                            </h2>
                            {increment.reason && (
                                <div className="mb-4">
                                    <p className="text-sm font-bold text-secondary-600 mb-2">Reason for Increment:</p>
                                    <p className="text-secondary-900">{increment.reason}</p>
                                </div>
                            )}
                            {increment.performanceNotes && (
                                <div>
                                    <p className="text-sm font-bold text-secondary-600 mb-2">Performance Notes:</p>
                                    <p className="text-secondary-900 whitespace-pre-wrap">{increment.performanceNotes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* KRA/KPI */}
                    {/* Revenue Target & ROI */}
                    {(increment.newMonthlyTarget > 0) && (
                        <div className="card-premium p-6 border-l-4 border-indigo-500">
                            <h2 className="text-lg font-black text-secondary-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-indigo-500" size={20} />
                                Revenue Target & ROI Analysis
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                <div>
                                    <p className="label-premium">Current Monthly Target</p>
                                    <p className="text-xl font-bold text-secondary-900">₹{increment.currentMonthlyTarget?.toLocaleString() || 0}</p>
                                </div>
                                <div>
                                    <p className="label-premium">Proposed Monthly Target</p>
                                    <p className="text-xl font-black text-indigo-600">₹{increment.newMonthlyTarget?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-indigo-100">
                                <div>
                                    <p className="label-premium">Current Yearly Target</p>
                                    <p className="text-xl font-bold text-secondary-900">₹{increment.currentYearlyTarget?.toLocaleString() || 0}</p>
                                </div>
                                <div>
                                    <p className="label-premium">Proposed Yearly Target</p>
                                    <p className="text-xl font-black text-indigo-600">₹{increment.newYearlyTarget?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            {/* ROI Stats */}
                            <div className="mt-4 p-4 bg-indigo-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Cost Increase (Monthly)</p>
                                    <p className="text-lg font-black text-danger-600">+₹{Math.round(increment.incrementAmount / 12).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Target Comparison</p>
                                    <p className="text-lg font-black text-success-600">
                                        +₹{Math.max(0, increment.newMonthlyTarget - (increment.currentMonthlyTarget || 0)).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-secondary-500">Revenue Multiplier</p>
                                    <p className="text-lg font-black text-primary-600">
                                        {increment.incrementAmount > 0 && (increment.newMonthlyTarget - (increment.currentMonthlyTarget || 0)) > 0
                                            ? ((increment.newMonthlyTarget - (increment.currentMonthlyTarget || 0)) / (increment.incrementAmount / 12)).toFixed(1)
                                            : '0'}x
                                    </p>
                                    <p className="text-[10px] text-secondary-400">Target Incr. / Cost Incr.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {(increment.newKRA || increment.newKPI || increment.oldKRA || increment.oldKPI) && (
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-6">
                                KRA & KPI Comparison
                            </h2>

                            {/* KRA Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <p className="text-sm font-bold text-secondary-600 mb-2 uppercase">Previous KRA</p>
                                    <div className="prose prose-sm max-w-none">
                                        <SafeHTML html={increment.oldKRA || '<p class="text-secondary-400 italic">No previous KRA defined.</p>'} />
                                    </div>
                                </div>
                                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                                    <p className="text-sm font-bold text-primary-700 mb-2 uppercase">New KRA (Proposed)</p>
                                    <div className="prose prose-sm max-w-none">
                                        <SafeHTML html={increment.newKRA || '<p class="text-secondary-400 italic">No KRA changes proposed.</p>'} />
                                    </div>
                                </div>
                            </div>

                            {/* KPI Comparison */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <p className="text-sm font-bold text-secondary-600 mb-2 uppercase">Previous KPI Metrics</p>
                                    {increment.oldKPI && Object.keys(increment.oldKPI).length > 0 ? (
                                        <ul className="space-y-2">
                                            {Object.entries(increment.oldKPI).map(([key, value]) => (
                                                <li key={key} className="flex justify-between items-center text-sm border-b border-secondary-200 pb-1 last:border-0">
                                                    <span className="font-semibold text-secondary-700 capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className="font-black text-secondary-900">{String(value)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-secondary-400 italic text-sm">No previous KPIs defined.</p>
                                    )}
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <p className="text-sm font-bold text-purple-700 mb-2 uppercase">New KPI Metrics (Proposed)</p>
                                    {increment.newKPI && Object.keys(increment.newKPI).length > 0 ? (
                                        <ul className="space-y-2">
                                            {Object.entries(increment.newKPI).map(([key, value]) => (
                                                <li key={key} className="flex justify-between items-center text-sm border-b border-purple-200 pb-1 last:border-0">
                                                    <span className="font-semibold text-purple-800 capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className="font-black text-purple-900">{String(value)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-secondary-400 italic text-sm">No KPI changes proposed.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approval History */}
                    {(increment.managerComments || increment.adminComments) && (
                        <div className="card-premium p-6">
                            <h2 className="text-lg font-black text-secondary-900 mb-4">
                                Approval History
                            </h2>
                            <div className="space-y-4">
                                {increment.managerComments && (
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="text-blue-600" size={18} />
                                            <p className="font-bold text-blue-900">Manager Review</p>
                                            {increment.managerReviewDate && (
                                                <span className="text-xs text-blue-600">
                                                    <FormattedDate date={increment.managerReviewDate} />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-secondary-900">{increment.managerComments}</p>
                                    </div>
                                )}
                                {increment.adminComments && (
                                    <div className="p-4 bg-success-50 rounded-xl border border-success-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="text-success-600" size={18} />
                                            <p className="font-bold text-success-900">Admin Approval</p>
                                            {increment.adminReviewDate && (
                                                <span className="text-xs text-success-600">
                                                    <FormattedDate date={increment.adminReviewDate} />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-secondary-900">{increment.adminComments}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4">
                        {((increment.status === 'DRAFT' && (isManager || isAdmin)) || (increment.status === 'APPROVED' && currentUser?.role === 'SUPER_ADMIN')) && (
                            <Link
                                href={`/dashboard/hr-management/increments/${increment.id}/edit`}
                                className="btn btn-outline"
                            >
                                <Edit size={20} />
                                {increment.status === 'APPROVED' ? 'Edit Increment' : 'Edit Draft'}
                            </Link>
                        )}

                        {canManagerReview && !showManagerReview && (
                            <button
                                onClick={() => setShowManagerReview(true)}
                                className="btn btn-primary"
                            >
                                <ThumbsUp size={20} />
                                Review as Manager
                            </button>
                        )}

                        {canAdminApprove && !showAdminReview && (
                            <button
                                onClick={() => setShowAdminReview(true)}
                                className="btn btn-success"
                            >
                                <CheckCircle size={20} />
                                Final Approval
                            </button>
                        )}
                    </div>

                    {/* Manager Review Modal */}
                    {showManagerReview && (
                        <div className="card-premium p-6 border-2 border-primary-200">
                            <h3 className="text-lg font-black text-secondary-900 mb-4">
                                Manager Review
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="label-premium">Action *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="action"
                                                value="approve"
                                                checked={reviewForm.action === 'approve'}
                                                onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                                                className="w-4 h-4"
                                            />
                                            <span className="font-bold text-success-600">Approve</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="action"
                                                value="reject"
                                                checked={reviewForm.action === 'reject'}
                                                onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                                                className="w-4 h-4"
                                            />
                                            <span className="font-bold text-danger-600">Reject</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Comments</label>
                                    <textarea
                                        className="input-premium"
                                        rows={4}
                                        placeholder="Add your review comments..."
                                        value={reviewForm.comments}
                                        onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => setShowManagerReview(false)}
                                        className="btn btn-outline"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleManagerReview}
                                        className={`btn ${reviewForm.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Submitting...' : `${reviewForm.action === 'approve' ? 'Approve' : 'Reject'} Increment`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admin Approval Modal */}
                    {showAdminReview && (
                        <div className="card-premium p-6 border-2 border-success-200">
                            <h3 className="text-lg font-black text-secondary-900 mb-4">
                                Final Admin Approval
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="label-premium">Action *</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="adminAction"
                                                value="approve"
                                                checked={reviewForm.action === 'approve'}
                                                onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                                                className="w-4 h-4"
                                            />
                                            <span className="font-bold text-success-600">Approve & Apply</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="adminAction"
                                                value="reject"
                                                checked={reviewForm.action === 'reject'}
                                                onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                                                className="w-4 h-4"
                                            />
                                            <span className="font-bold text-danger-600">Reject</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Comments</label>
                                    <textarea
                                        className="input-premium"
                                        rows={4}
                                        placeholder="Add your approval comments..."
                                        value={reviewForm.comments}
                                        onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                                    />
                                </div>

                                {reviewForm.action === 'approve' && (
                                    <div className="p-4 bg-warning-50 rounded-xl border border-warning-200">
                                        <p className="text-sm font-bold text-warning-900">
                                            ⚠️ This will immediately update the employee&apos;s salary in the system.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={() => setShowAdminReview(false)}
                                        className="btn btn-outline"
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAdminApproval}
                                        className={`btn ${reviewForm.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Processing...' : `${reviewForm.action === 'approve' ? 'Approve & Apply' : 'Reject'}`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
