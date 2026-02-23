'use client';
import Image from 'next/image';

interface StaffOverviewProps {
    staffData: {
        totalEmployees: number;
        presentToday: number;
        onLeave: number;
        absent: number;
        totalSalary: number;
        pendingLeaves: number;
        approvedLeaves: number;
        recentActivities?: any[];
        companyBreakdown?: {
            id: string;
            name: string;
            logo: string | null;
            totalEmployees: number;
            presentToday: number;
            presentPercentage: number;
            totalSalary: number;
        }[];
    };
    filters: any;
    onAction: (action: string) => void;
}

export default function StaffOverview({ staffData, filters, onAction }: StaffOverviewProps) {
    const stats = [
        {
            name: 'Total Employees',
            value: staffData.totalEmployees,
            icon: '👥',
            color: 'bg-blue-500'
        },
        {
            name: 'Present Today',
            value: staffData.presentToday,
            icon: '✅',
            color: 'bg-green-500'
        },
        {
            name: 'On Leave',
            value: staffData.onLeave,
            icon: '🏖️',
            color: 'bg-yellow-500'
        },
        {
            name: 'Absent',
            value: staffData.absent,
            icon: '❌',
            color: 'bg-red-500'
        },
        {
            name: 'Monthly Salary',
            value: `₹${(staffData.totalSalary || 0).toLocaleString()}`,
            icon: '💰',
            color: 'bg-emerald-500'
        },
        {
            name: 'Pending Leaves',
            value: staffData.pendingLeaves,
            icon: '⏳',
            color: 'bg-orange-500'
        },
        {
            name: 'Approved Leaves',
            value: staffData.approvedLeaves,
            icon: '🎉',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-secondary-500">{stat.name}</p>
                                <p className="text-2xl font-bold text-secondary-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Company Comparison (only visible if companyBreakdown exists i.e. 'All Companies' is active) */}
            {staffData.companyBreakdown && staffData.companyBreakdown.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 overflow-hidden">
                    <h2 className="text-lg font-semibold text-secondary-900 mb-4">Company Comparison</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-secondary-200 text-secondary-500 text-sm">
                                    <th className="py-3 px-4 font-semibold">Company</th>
                                    <th className="py-3 px-4 font-semibold text-center">Employees</th>
                                    <th className="py-3 px-4 font-semibold text-center">Attendance</th>
                                    <th className="py-3 px-4 font-semibold text-right">Monthly Salary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffData.companyBreakdown.map((company) => (
                                    <tr key={company.id} className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors last:border-0">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                {company.logo ? (
                                                    <Image src={company.logo} alt={company.name} width={32} height={32} className="w-8 h-8 rounded object-contain border border-secondary-200 bg-white" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs uppercase">
                                                        {company.name.substring(0, 2)}
                                                    </div>
                                                )}
                                                <span className="font-medium text-secondary-900">{company.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-secondary-700 font-medium">
                                            {company.totalEmployees}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-secondary-700 font-medium">{company.presentPercentage}%</span>
                                                <div className="w-16 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${company.presentPercentage >= 90 ? 'bg-green-500' : company.presentPercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${company.presentPercentage}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                                            ₹{(company.totalSalary / 1000).toFixed(0)}K
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => onAction('add_employee')}
                        className="flex flex-col items-center p-4 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
                    >
                        <span className="text-3xl mb-2">👤</span>
                        <span className="text-sm font-medium text-primary-700">Add Employee</span>
                    </button>
                    <button
                        onClick={() => onAction('view_attendance')}
                        className="flex flex-col items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                    >
                        <span className="text-3xl mb-2">🕒</span>
                        <span className="text-sm font-medium text-green-700">View Attendance</span>
                    </button>
                    <button
                        onClick={() => onAction('approve_leave')}
                        className="flex flex-col items-center p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                        <span className="text-3xl mb-2">🏖️</span>
                        <span className="text-sm font-medium text-yellow-700">Approve Leave</span>
                    </button>
                    <button
                        onClick={() => onAction('generate_salary')}
                        className="flex flex-col items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                        <span className="text-3xl mb-2">💰</span>
                        <span className="text-sm font-medium text-purple-700">Generate Salary</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    {staffData.recentActivities && staffData.recentActivities.length > 0 ? (
                        staffData.recentActivities.map((activity: any) => (
                            <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary-50 transition-colors">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'ATTENDANCE' ? 'bg-green-100 text-green-600' :
                                    activity.type === 'LEAVE' ? 'bg-yellow-100 text-yellow-600' :
                                        activity.type === 'WORK_REPORT' ? 'bg-blue-100 text-blue-600' :
                                            'bg-purple-100 text-purple-600'
                                    }`}>
                                    <span className="text-lg">
                                        {activity.type === 'ATTENDANCE' ? '🕒' :
                                            activity.type === 'LEAVE' ? '🏖️' :
                                                activity.type === 'WORK_REPORT' ? '📝' : '📌'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-secondary-900">{activity.description}</p>
                                    <p className="text-xs text-secondary-500">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-secondary-500 text-center py-4">No recent activity</p>
                    )}
                </div>
            </div>
        </div >
    );
}
