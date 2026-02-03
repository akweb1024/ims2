import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { Download, Search, TrendingUp } from 'lucide-react';
import IncrementReportTable from './IncrementReportTable';

export const dynamic = 'force-dynamic';

async function getIncrementData() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    // Construct filter for strict type safety
    const whereClause: any = {
        isActive: true,
    };

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'HR') {
        whereClause.OR = [
            { managerId: user.id },
            { id: user.id }
        ];
    }

    // Fetch users with their profile, current salary structure, and last increment
    const employees = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            company: { select: { name: true } },
            manager: { select: { name: true } },
            // designation: { select: { name: true } }, // User does not have designation relation, it's on Profile
            employeeProfile: {
                select: {
                    dateOfJoining: true,
                    designatRef: { select: { name: true } }, // Correct relation on EmployeeProfile
                    salaryStructure: {
                        select: {
                            salaryFixed: true,
                            salaryVariable: true,
                            salaryIncentive: true,
                            otherAllowances: true,
                            ctc: true
                        }
                    },
                    incrementHistory: {
                        take: 1,
                        orderBy: { effectiveDate: 'desc' },
                        select: {
                            incrementAmount: true,
                            percentage: true,
                            newSalary: true,
                            effectiveDate: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return employees.map(emp => {
        const salary = emp.employeeProfile?.salaryStructure;
        const lastInc = emp.employeeProfile?.incrementHistory?.[0]; // Access first item

        // Calculate experience
        const doj = emp.employeeProfile?.dateOfJoining ? new Date(emp.employeeProfile.dateOfJoining) : new Date();
        const diff = Date.now() - doj.getTime();
        const expYears = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        const expMonths = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30));

        return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            manager: emp.manager?.name || 'N/A',
            company: emp.company?.name || 'N/A',
            designation: emp.employeeProfile?.designatRef?.name || 'N/A', // Correct access
            experience: `${expYears}y ${expMonths}m`,
            salary: {
                fixed: salary?.salaryFixed || 0,
                variable: salary?.salaryVariable || 0,
                incentive: salary?.salaryIncentive || 0,
                perks: salary?.otherAllowances || 0,
                total: salary?.ctc || 0
            },
            lastIncrement: lastInc ? {
                date: lastInc.effectiveDate,
                amount: lastInc.incrementAmount,
                percent: lastInc.percentage
            } : null,
            kras: []
        };
    });
}

export default async function IncrementReportPage() {
    const data = await getIncrementData();

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Increment Report</h1>
                        <p className="text-sm text-secondary-600 mt-1">Detailed salary breakdown and increment history</p>
                    </div>
                    {/* Placeholder for export functionality */}
                    <button className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
                        <Download size={16} /> Export CSV
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    <IncrementReportTable data={data} />
                </div>
            </div>
        </DashboardLayout>
    );
}
