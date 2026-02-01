'use client';

interface StaffOverviewProps {
    staffData: {
        totalEmployees: number;
        presentToday: number;
        onLeave: number;
        absent: number;
        totalSalary: number;
        pendingLeaves: number;
        approvedLeaves: number;
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
            color: 'bg-blue-500',
            change: '+12%',
            changeType: 'positive'
        },
        {
            name: 'Present Today',
            value: staffData.presentToday,
            icon: '✅',
            color: 'bg-green-500',
            change: `${staffData.totalEmployees > 0 ? Math.round((staffData.presentToday / staffData.totalEmployees) * 100) : 0}%`,
            changeType: 'positive'
        },
        {
            name: 'On Leave',
            value: staffData.onLeave,
            icon: '🏖️',
            color: 'bg-yellow-500',
            change: 'Fixed',
            changeType: 'neutral'
        },
        {
            name: 'Absent',
            value: staffData.absent,
            icon: '❌',
            color: 'bg-red-500',
            change: `${staffData.totalEmployees > 0 ? Math.round((staffData.absent / staffData.totalEmployees) * 100) : 0}%`,
            changeType: 'negative'
        },
        {
            name: 'Monthly Salary',
            value: `₹${(staffData.totalSalary || 0).toLocaleString()}`,
            icon: '💰',
            color: 'bg-emerald-500',
            change: '+8%',
            changeType: 'positive'
        },
        {
            name: 'Pending Leaves',
            value: staffData.pendingLeaves,
            icon: '⏳',
            color: 'bg-orange-500',
            change: 'Needs Review',
            changeType: 'neutral'
        },
        {
            name: 'Approved Leaves',
            value: staffData.approvedLeaves,
            icon: '🎉',
            color: 'bg-purple-500',
            change: 'This Month',
            changeType: 'positive'
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
                        <div className="mt-4 flex items-center">
                            <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' :
                                stat.changeType === 'negative' ? 'text-red-600' :
                                    'text-secondary-500'
                                }`}>
                                {stat.change}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

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
                    {[
                        { icon: '👤', text: 'New employee John Doe added to Engineering team', time: '2 hours ago', color: 'bg-blue-100 text-blue-600' },
                        { icon: '🏖️', text: 'Leave request approved for Jane Smith', time: '3 hours ago', color: 'bg-green-100 text-green-600' },
                        { icon: '💰', text: 'Salary processed for March 2024', time: '5 hours ago', color: 'bg-purple-100 text-purple-600' },
                        { icon: '🕒', text: 'Attendance marked for 45 employees', time: '6 hours ago', color: 'bg-yellow-100 text-yellow-600' },
                        { icon: '📝', text: 'Work report submitted by Mike Johnson', time: '8 hours ago', color: 'bg-red-100 text-red-600' },
                    ].map((activity, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary-50 transition-colors">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.color}`}>
                                <span className="text-lg">{activity.icon}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-secondary-900">{activity.text}</p>
                                <p className="text-xs text-secondary-500">{activity.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
