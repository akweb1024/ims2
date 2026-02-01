'use client';

import { useState, useEffect } from 'react';

interface StaffAnalyticsProps {
    filters: any;
}

export default function StaffAnalytics({ filters }: StaffAnalyticsProps) {
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('attendance');

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);
                if (filters.employeeId !== 'all') params.append('employeeId', filters.employeeId);
                params.append('startDate', filters.dateRange.start);
                params.append('endDate', filters.dateRange.end);

                const res = await fetch(`/api/staff-management/analytics?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setAnalyticsData(data);
                }
            } catch (err) {
                console.error('Error fetching analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [filters]);

    // Mock chart data (would use a charting library like recharts in production)
    const AttendanceChart = () => {
        const data = [
            { month: 'Jan', present: 95, absent: 5 },
            { month: 'Feb', present: 92, absent: 8 },
            { month: 'Mar', present: 88, absent: 12 },
            { month: 'Apr', present: 90, absent: 10 },
            { month: 'May', present: 94, absent: 6 },
            { month: 'Jun', present: 96, absent: 4 }
        ];

        return (
            <div className="space-y-4">
                <div className="flex items-end justify-between h-64 px-4">
                    {data.map((item, index) => (
                        <div key={index} className="flex flex-col items-center w-16">
                            <div className="flex gap-1 items-end h-48">
                                <div
                                    className="w-6 bg-green-500 rounded-t"
                                    style={{ height: `${item.present}%` }}
                                ></div>
                                <div
                                    className="w-6 bg-red-500 rounded-t"
                                    style={{ height: `${item.absent}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-secondary-500 mt-2">{item.month}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="text-sm text-secondary-600">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm text-secondary-600">Absent</span>
                    </div>
                </div>
            </div>
        );
    };

    const LeaveChart = () => {
        const data = [
            { type: 'Annual', days: 120 },
            { type: 'Sick', days: 45 },
            { type: 'Casual', days: 30 },
            { type: 'Compensatory', days: 15 }
        ];

        const maxDays = Math.max(...data.map((d) => d.days));

        return (
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-secondary-600">{item.type}</span>
                            <span className="font-medium text-secondary-900">{item.days} days</span>
                        </div>
                        <div className="h-4 bg-secondary-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(item.days / maxDays) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const SalaryChart = () => {
        const data = [
            { department: 'Engineering', amount: 450000 },
            { department: 'Sales', amount: 320000 },
            { department: 'Marketing', amount: 280000 },
            { department: 'HR', amount: 150000 },
            { department: 'Finance', amount: 180000 }
        ];

        const maxAmount = Math.max(...data.map((d) => d.amount));

        return (
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-32 text-sm text-secondary-600 truncate">{item.department}</div>
                        <div className="flex-1 h-6 bg-secondary-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                            >
                                <span className="text-xs text-white font-medium">₹{(item.amount / 1000).toFixed(0)}K</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const PerformanceChart = () => {
        const data = [
            { rating: '5 Stars', count: 25 },
            { rating: '4 Stars', count: 45 },
            { rating: '3 Stars', count: 20 },
            { rating: '2 Stars', count: 5 },
            { rating: '1 Star', count: 2 }
        ];

        const total = data.reduce((sum, d) => sum + d.count, 0);

        return (
            <div className="space-y-4">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-secondary-600">{item.rating}</div>
                        <div className="flex-1 h-4 bg-secondary-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-yellow-500 rounded-full"
                                style={{ width: `${(item.count / total) * 100}%` }}
                            ></div>
                        </div>
                        <div className="w-12 text-sm font-medium text-secondary-900">{Math.round((item.count / total) * 100)}%</div>
                    </div>
                ))}
            </div>
        );
    };

    const tabs = [
        { id: 'attendance', name: 'Attendance', icon: '🕒' },
        { id: 'leave', name: 'Leave', icon: '🏖️' },
        { id: 'salary', name: 'Salary', icon: '💰' },
        { id: 'performance', name: 'Performance', icon: '📊' }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900">Staff Analytics & Graphs</h2>
                    <p className="text-sm text-secondary-500">Comprehensive analytics and insights</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-secondary-200">
                <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'}
                            `}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Analytics Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                    {activeTab === 'attendance' && (
                        <div>
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Attendance Overview</h3>
                            <AttendanceChart />

                            {/* Additional Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-green-50 rounded-lg p-4">
                                    <p className="text-sm text-green-600">Average Attendance</p>
                                    <p className="text-2xl font-bold text-green-700">92%</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <p className="text-sm text-red-600">Late Arrivals</p>
                                    <p className="text-2xl font-bold text-red-700">15</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <p className="text-sm text-blue-600">Early Departures</p>
                                    <p className="text-2xl font-bold text-blue-700">8</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'leave' && (
                        <div>
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Leave Analytics</h3>
                            <LeaveChart />

                            {/* Additional Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <p className="text-sm text-blue-600">Total Leave Taken</p>
                                    <p className="text-2xl font-bold text-blue-700">210 days</p>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <p className="text-sm text-yellow-600">Pending Requests</p>
                                    <p className="text-2xl font-bold text-yellow-700">12</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <p className="text-sm text-green-600">Available Balance</p>
                                    <p className="text-2xl font-bold text-green-700">890 days</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'salary' && (
                        <div>
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Salary Distribution</h3>
                            <SalaryChart />

                            {/* Additional Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-emerald-50 rounded-lg p-4">
                                    <p className="text-sm text-emerald-600">Total Monthly Salary</p>
                                    <p className="text-2xl font-bold text-emerald-700">₹1.38M</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <p className="text-sm text-blue-600">Average Salary</p>
                                    <p className="text-2xl font-bold text-blue-700">₹57.5K</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <p className="text-sm text-purple-600">Highest Paid</p>
                                    <p className="text-2xl font-bold text-purple-700">₹1.2L</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'performance' && (
                        <div>
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Performance Distribution</h3>
                            <PerformanceChart />

                            {/* Additional Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <p className="text-sm text-yellow-600">Average Rating</p>
                                    <p className="text-2xl font-bold text-yellow-700">4.2/5</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4">
                                    <p className="text-sm text-green-600">Top Performers</p>
                                    <p className="text-2xl font-bold text-green-700">25</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4">
                                    <p className="text-sm text-red-600">Needs Improvement</p>
                                    <p className="text-2xl font-bold text-red-700">7</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Export Options */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Export Reports</h3>
                <div className="flex flex-wrap gap-3">
                    <button className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors">
                        📊 Export as PDF
                    </button>
                    <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                        📈 Export as Excel
                    </button>
                    <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                        📧 Email Report
                    </button>
                </div>
            </div>
        </div>
    );
}
