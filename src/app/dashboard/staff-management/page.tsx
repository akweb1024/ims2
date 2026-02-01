'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import StaffFilters from '@/components/dashboard/staff-management/StaffFilters';
import StaffOverview from '@/components/dashboard/staff-management/StaffOverview';
import EmployeeManagement from '@/components/dashboard/staff-management/EmployeeManagement';
import AttendanceManagement from '@/components/dashboard/staff-management/AttendanceManagement';
import LeaveManagement from '@/components/dashboard/staff-management/LeaveManagement';
import SalaryManagement from '@/components/dashboard/staff-management/SalaryManagement';
import WorkReportManagement from '@/components/dashboard/staff-management/WorkReportManagement';
import StaffAnalytics from '@/components/dashboard/staff-management/StaffAnalytics';
import PunchInOut from '@/components/dashboard/staff-management/PunchInOut';
import BalanceLeave from '@/components/dashboard/staff-management/BalanceLeave';
import { toast } from 'react-hot-toast';

const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'employees', name: 'Employees', icon: '👥' },
    { id: 'attendance', name: 'Attendance', icon: '🕒' },
    { id: 'punch', name: 'Punch In/Out', icon: '⏱️' },
    { id: 'leave', name: 'Leave Management', icon: '🏖️' },
    { id: 'balance-leave', name: 'Balance Leave', icon: '📋' },
    { id: 'salary', name: 'Salary', icon: '💰' },
    { id: 'work-reports', name: 'Work Reports', icon: '📝' },
    { id: 'analytics', name: 'Analytics & Graphs', icon: '📈' },
];

function StaffManagementContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'overview';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [filters, setFilters] = useState({
        companyId: 'all',
        teamId: 'all',
        employeeId: 'all',
        dateRange: {
            start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        },
        status: 'all'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [staffData, setStaffData] = useState({
        totalEmployees: 0,
        presentToday: 0,
        onLeave: 0,
        absent: 0,
        totalSalary: 0,
        pendingLeaves: 0,
        approvedLeaves: 0
    });

    // Check user role and permissions
    useEffect(() => {
        const checkPermissions = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                const role = parsedUser.role;

                // Only allow SUPER_ADMIN, ADMIN, and HR_MANAGER
                const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'];

                if (!allowedRoles.includes(role)) {
                    toast.error('Access denied. This module is for Super Admin, Admin, and HR only.');
                    window.location.href = '/dashboard';
                    return;
                }

                setUserRole(role);
            } else {
                window.location.href = '/login';
            }
            setIsLoading(false);
        };

        checkPermissions();
    }, []);

    // Fetch staff data based on filters
    const fetchStaffData = useCallback(async () => {
        try {
            const queryParams = new URLSearchParams();
            if (filters.companyId !== 'all') queryParams.append('companyId', filters.companyId);
            if (filters.teamId !== 'all') queryParams.append('teamId', filters.teamId);
            if (filters.employeeId !== 'all') queryParams.append('employeeId', filters.employeeId);

            const res = await fetch(`/api/staff-management/stats?${queryParams.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setStaffData(data);
            }
        } catch (err) {
            console.error('Error fetching staff data:', err);
        }
    }, [filters]);

    useEffect(() => {
        if (!isLoading) {
            fetchStaffData();
        }
    }, [filters, isLoading, fetchStaffData]);

    if (isLoading) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900">Staff Management</h1>
                        <p className="text-secondary-500 text-sm">Manage all company employees, attendance, leaves, and salary</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                            {userRole.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                {/* Filters */}
                <StaffFilters filters={filters} setFilters={setFilters} />

                {/* Tabs */}
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

                {/* Tab Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'overview' && (
                        <StaffOverview staffData={staffData} filters={filters} />
                    )}
                    {activeTab === 'employees' && (
                        <EmployeeManagement filters={filters} />
                    )}
                    {activeTab === 'attendance' && (
                        <AttendanceManagement filters={filters} />
                    )}
                    {activeTab === 'punch' && (
                        <PunchInOut filters={filters} />
                    )}
                    {activeTab === 'leave' && (
                        <LeaveManagement filters={filters} />
                    )}
                    {activeTab === 'balance-leave' && (
                        <BalanceLeave filters={filters} />
                    )}
                    {activeTab === 'salary' && (
                        <SalaryManagement filters={filters} />
                    )}
                    {activeTab === 'work-reports' && (
                        <WorkReportManagement filters={filters} />
                    )}
                    {activeTab === 'analytics' && (
                        <StaffAnalytics filters={filters} />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function StaffManagementPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        }>
            <StaffManagementContent />
        </Suspense>
    );
}
