import { ReactNode } from 'react';
import Link from 'next/link';
import {
    Users,
    Calendar,
    ClipboardCheck,
    DollarSign,
    BarChart,
    FileText
} from 'lucide-react';

const sidebarItems = [
    { name: 'Team Overview', href: '/dashboard/manager/team', icon: Users },
    { name: 'Attendance', href: '/dashboard/manager/team/attendance', icon: Calendar },
    { name: 'Leave Requests', href: '/dashboard/manager/team/leaves', icon: ClipboardCheck },
    { name: 'Work Reports', href: '/dashboard/manager/team/work-reports', icon: FileText },
    { name: 'Performance', href: '/dashboard/manager/team/performance', icon: BarChart },
    { name: 'Salary & Increments', href: '/dashboard/manager/team/salary', icon: DollarSign },
];

export default function ManagerDashboardLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:block fixed h-full z-10">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
                        Manager Portal
                    </span>
                </div>

                <div className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
                    <div className="mb-6">
                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Cross-Company Management
                        </h3>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-primary-700 transition-colors group"
                                >
                                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </div>
                            Back to Main Dashboard
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
