import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import TargetAchievementTable from './TargetAchievementTable';

export const dynamic = 'force-dynamic';

async function getTargetData() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    // Construct filter for strict type safety
    const whereClause: any = {
        endDate: { gte: new Date(new Date().getFullYear(), 0, 1) }, // Current year goals
        companyId: user.companyId || undefined,
    };

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR') {
        whereClause.OR = [
            { employee: { user: { managerId: user.id } } }, // Nested relation for manager check
            { employee: { userId: user.id } }
        ];
    }

    // Fetch goals and related data
    const goals = await prisma.employeeGoal.findMany({
        where: whereClause,
        include: {
            employee: {
                select: {
                    user: {
                        select: {
                            name: true,
                            manager: { select: { name: true } },
                        }
                    },
                    designatRef: { select: { name: true } } // Correct field: name
                }
            }
        },
        orderBy: { endDate: 'asc' }
    });

    return goals.map(goal => {
        const achieved = goal.currentValue;
        const target = goal.targetValue;
        const percentage = target > 0 ? (achieved / target) * 100 : 0;

        // Determine status
        let status = 'LAGGING';
        const progress = percentage;

        if (progress >= 100) status = 'ACHIEVED';
        else if (progress >= 80) status = 'ON_TRACK';
        else if (progress >= 50) status = 'AT_RISK';

        return {
            id: goal.id,
            employeeName: goal.employee?.user?.name || 'Unknown',
            managerName: goal.employee?.user?.manager?.name || 'N/A',
            title: goal.title,
            target: target,
            achievement: achieved,
            unit: goal.unit,
            percentage: percentage,
            status: status,
            endDate: goal.endDate
        };
    });
}

export default async function TargetReportPage() {
    const data = await getTargetData();

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Target Achievement Report</h1>
                        <p className="text-sm text-secondary-600 mt-1">Track employee goals vs actual performance</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    <TargetAchievementTable data={data} />
                </div>
            </div>
        </DashboardLayout>
    );
}
