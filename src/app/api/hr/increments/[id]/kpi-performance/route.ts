import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/hr/increments/[id]/kpi-performance
 *
 * Aggregates work report task completion data for all KPI task templates
 * linked to the given salary increment record. Returns per-task stats:
 *  - totalCompletions (number of reports where this task was completed)
 *  - totalPointsEarned (sum of approved points for this task)
 *  - totalQuantity (for SCALED tasks)
 *  - achievementRate (0–100%, based on days worked vs taskId presence)
 */
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            // 1. Fetch the increment record
            const increment = await prisma.salaryIncrementRecord.findUnique({
                where: { id },
                select: {
                    id: true,
                    employeeProfileId: true,
                    effectiveDate: true,
                    date: true,
                    newKPI: true,
                }
            });

            if (!increment) {
                return NextResponse.json({ error: 'Increment not found' }, { status: 404 });
            }

            // 2. Extract linked task template IDs from newKPI JSON
            let linkedTemplates: { id: string; title: string; points: number; designation?: string; calculationType?: string }[] = [];
            try {
                const kpiData = increment.newKPI as any;
                if (kpiData && typeof kpiData === 'object' && Array.isArray(kpiData.linkedTaskTemplates)) {
                    linkedTemplates = kpiData.linkedTaskTemplates.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        points: t.points || 0,
                        designation: t.designation || null,
                        calculationType: t.calculationType || 'FLAT',
                    }));
                }
            } catch {
                // No linked templates or invalid JSON
            }

            if (linkedTemplates.length === 0) {
                return NextResponse.json({
                    incrementId: id,
                    period: { from: null, to: null },
                    totalWorkingDays: 0,
                    kpiStats: [],
                    message: 'No KPI task templates linked to this increment.'
                });
            }

            const templateIds = linkedTemplates.map(t => t.id);

            // 3. Determine the review period
            // From: the increment's creation date (or the previous increment's effective date)
            // To: now (or increment effective date if it's in the past)
            const periodFrom = increment.date;                        // increment was created on this date
            const periodTo = new Date();                              // up to now

            // 4. Fetch work reports for this employee in the period that mention these tasks
            const workReports = await prisma.workReport.findMany({
                where: {
                    employeeId: increment.employeeProfileId,
                    date: {
                        gte: periodFrom,
                        lte: periodTo,
                    },
                    status: { in: ['APPROVED', 'SUBMITTED'] },   // include submitted too for visibility
                },
                select: {
                    id: true,
                    date: true,
                    status: true,
                    tasksSnapshot: true,
                    pointsEarned: true,
                },
                orderBy: { date: 'asc' },
            });

            // 5. Aggregate per KPI task template
            const statsMap: Record<string, {
                taskId: string;
                title: string;
                points: number;
                designation: string | null;
                calculationType: string;
                completions: number;
                approvedCompletions: number;
                totalQuantity: number;
                totalPointsEarned: number;
                approvedPointsEarned: number;
                reportDates: string[];
            }> = {};

            // Initialize map for all linked templates
            for (const tpl of linkedTemplates) {
                statsMap[tpl.id] = {
                    taskId: tpl.id,
                    title: tpl.title,
                    points: tpl.points,
                    designation: tpl.designation || null,
                    calculationType: tpl.calculationType || 'FLAT',
                    completions: 0,
                    approvedCompletions: 0,
                    totalQuantity: 0,
                    totalPointsEarned: 0,
                    approvedPointsEarned: 0,
                    reportDates: [],
                };
            }

            // Walk through each work report and aggregate
            for (const report of workReports) {
                const snapshot = report.tasksSnapshot as any[];
                if (!Array.isArray(snapshot)) continue;

                for (const task of snapshot) {
                    if (!templateIds.includes(task.id)) continue;

                    const stat = statsMap[task.id];
                    if (!stat) continue;

                    stat.completions += 1;
                    stat.totalQuantity += task.quantity || 0;
                    stat.totalPointsEarned += task.points || 0;
                    stat.reportDates.push(new Date(report.date).toISOString().split('T')[0]);

                    if (report.status === 'APPROVED' && task.isApproved !== false) {
                        stat.approvedCompletions += 1;
                        stat.approvedPointsEarned += task.points || 0;
                    }
                }
            }

            // 6. Compute totals and achievement rate
            const totalWorkingDays = workReports.length;
            const kpiStats = Object.values(statsMap).map(stat => {
                const achievementRate = totalWorkingDays > 0
                    ? Math.round((stat.completions / totalWorkingDays) * 100)
                    : 0;

                return {
                    ...stat,
                    achievementRate,      // % of working days this KPI was completed
                    totalWorkingDays,
                };
            });

            // Sort by completions desc
            kpiStats.sort((a, b) => b.completions - a.completions);

            return NextResponse.json({
                incrementId: id,
                period: {
                    from: periodFrom.toISOString(),
                    to: periodTo.toISOString(),
                },
                totalWorkingDays,
                totalReports: workReports.length,
                approvedReports: workReports.filter(r => r.status === 'APPROVED').length,
                kpiStats,
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
