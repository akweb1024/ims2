import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IncrementClientWrapper from './IncrementClientWrapper';
import IncrementDashboardSkeleton from './IncrementDashboardSkeleton';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-core';

export const dynamic = 'force-dynamic';

async function getIncrements() {
    try {
        let user = await getAuthenticatedUser();

        if (!user) {
            const cookieStore = await cookies();
            const token = cookieStore.get('token')?.value;
            if (token) {
                user = verifyToken(token);
            }
        }

        if (!user) {
            redirect('/login');
        }

        const authorizedRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];
        const role = user.role?.toString().toUpperCase();
        if (!authorizedRoles.includes(role)) {
            redirect('/dashboard');
        }

        const where: any = {};

        if (user.role === 'MANAGER') {
            const directReports = await prisma.user.findMany({
                where: { managerId: user.id },
                select: { id: true }
            });

            const managedUserIds = directReports.map(u => u.id);

            const managedProfiles = await prisma.employeeProfile.findMany({
                where: { userId: { in: managedUserIds } },
                select: { id: true }
            });

            where.employeeProfileId = {
                in: managedProfiles.map(p => p.id)
            };
        }

        const increments = await prisma.salaryIncrementRecord.findMany({
            where,
            include: {
                employeeProfile: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                company: {
                                    select: {
                                        name: true
                                    }
                                },
                                department: {
                                    select: {
                                        name: true
                                    }
                                },
                                manager: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return increments;
    } catch (error: any) {
        if (error.digest?.includes('NEXT_REDIRECT')) {
            throw error;
        }
        console.error('Error fetching increments:', error.message || error);
        redirect('/login');
    }
}

async function IncrementData() {
    const increments = await getIncrements();
    return <IncrementClientWrapper initialIncrements={increments || []} />;
}

export default async function IncrementManagementPage() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">
                        Salary Increments
                    </h1>
                    <p className="text-secondary-600 mt-1">
                        Track and manage employee salary increments and compensation pivots
                    </p>
                </div>

                <Suspense fallback={<IncrementDashboardSkeleton />}>
                    <IncrementData />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
