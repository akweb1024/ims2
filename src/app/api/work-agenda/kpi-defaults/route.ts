import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/work-agenda/kpi-defaults?employeeId=xxx
 *
 * Fetches the KPI task templates from the employee's active salary increment.
 * These are used to display "default KPI items" in the Work Agenda planner,
 * allowing employees to quickly add their daily KPI tasks without re-typing them.
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

            // Fetch the latest approved increment for this employee
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

            if (!increment) {
                return NextResponse.json({ kpiTasks: [], message: 'No active approved increment found.' });
            }

            // Extract linkedTaskTemplates from the KPI JSON
            let kpiTasks: { id: string; title: string; points: number; designation?: string | null; calculationType?: string }[] = [];
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

            return NextResponse.json({
                incrementId: increment.id,
                fiscalYear: increment.fiscalYear,
                kpiTasks,
            });

        } catch (error: any) {
            console.error('Error fetching KPI defaults:', error);
            return createErrorResponse(error.message, 500);
        }
    }
);
