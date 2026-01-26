import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import IncrementList from './IncrementList';
import IncrementDashboardSkeleton from './IncrementDashboardSkeleton';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-core';


async function getIncrements() {
    try {
        // 1. Try unified auth (NextAuth / Headers)
        let user = await getAuthenticatedUser();

        // 2. Fallback to manual cookie check if unified auth failed
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

        const where: any = {};

        // Managers can only see their team's increments
        if (user.role === 'MANAGER') {
            const managedUsers = await prisma.user.findMany({
                where: { managerId: user.id },
                select: { id: true }
            });

            const managedUserIds = managedUsers.map(u => u.id);

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
                                email: true
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
    return <IncrementList initialIncrements={increments || []} />;
}

export default async function IncrementManagementPage() {
    return (
        <DashboardLayout>
            <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">
                            Salary Increments
                        </h1>
                        <p className="text-secondary-600 mt-1">
                            Manage employee salary increments with dual authentication
                        </p>
                    </div>
                    <Link href="/dashboard/hr-management/increments/new" className="btn btn-primary">
                        <Plus size={20} />
                        New Increment
                    </Link>
                </div>

                {/* Increment Data with Suspense */}
                <Suspense fallback={<IncrementDashboardSkeleton />}>
                    <IncrementData />
                </Suspense>
            </div>
        </DashboardLayout>
    );
}
