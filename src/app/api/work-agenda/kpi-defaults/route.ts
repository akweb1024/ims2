import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/work-agenda/kpi-defaults?employeeId=xxx
 *
 * Fetches:
 *  1. KPI task templates from the employee's active salary increment
 *  2. Monthly revenue target + actual revenue earned this month
 *
 * These are used to display "default KPI items" and "revenue target" in the Work Agenda planner.
 */
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            // Resolve employee profile
            let profileId = employeeId;
            if (!profileId) {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id },
                    select: { id: true }
                });
                if (!profile) return createErrorResponse('Employee profile not found', 404);
                profileId = profile.id;
            }

            // 1. Fetch employee profile for revenue target
            const employeeProfile = await prisma.employeeProfile.findUnique({
                where: { id: profileId },
                select: {
                    monthlyTarget: true,
                    yearlyTarget: true,
                }
            });

            // 2. Fetch actual revenue earned this month (approved claims)
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const approvedClaims = await prisma.revenueClaim.findMany({
                where: {
                    employeeId: profileId,
                    status: 'APPROVED',
                    revenueTransaction: {
                        paymentDate: {
                            gte: startOfMonth,
                            lte: endOfMonth,
                        }
                    }
                },
                select: { claimAmount: true }
            });

            const actualRevenue = approvedClaims.reduce((sum, c) => sum + c.claimAmount, 0);
            const monthlyTarget = employeeProfile?.monthlyTarget || 0;
            const achievementPct = monthlyTarget > 0
                ? Math.min(100, Math.round((actualRevenue / monthlyTarget) * 100))
                : null;

            // 3. Fetch the latest approved increment for KPI tasks
            const increment = await prisma.salaryIncrementRecord.findFirst({
                where: {
                    employeeProfileId: profileId,
                    status: 'APPROVED',
                },
                orderBy: { effectiveDate: 'desc' },
                select: {
                    id: true,
                    newKPI: true,
                    fiscalYear: true,
                }
            });

            // Extract linkedTaskTemplates from the KPI JSON
            let kpiTasks: { id: string; title: string; points: number; designation?: string | null; calculationType?: string }[] = [];
            if (increment) {
                try {
                    const kpiData = increment.newKPI as any;
                    if (kpiData && typeof kpiData === 'object' && Array.isArray(kpiData.linkedTaskTemplates)) {
                        kpiTasks = kpiData.linkedTaskTemplates.map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            points: t.points || 0,
                            designation: t.designation || null,
                            calculationType: t.calculationType || 'FLAT',
                        }));
                    }
                } catch {
                    // Invalid JSON or no templates
                }
            }

            return NextResponse.json({
                incrementId: increment?.id || null,
                fiscalYear: increment?.fiscalYear || null,
                kpiTasks,
                revenueTarget: {
                    monthly: monthlyTarget,
                    yearly: employeeProfile?.yearlyTarget || 0,
                    actualThisMonth: actualRevenue,
                    achievementPct,
                    month: now.toLocaleString('default', { month: 'long' }),
                    year: now.getFullYear(),
                },
            });

        } catch (error: any) {
            console.error('Error fetching KPI defaults:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
