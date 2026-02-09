import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/hr/leave-ledger/[employeeId]
 * 
 * Fetch leave ledger history with filtering and attendance behavior analysis
 * 
 * Query params:
 * - year (optional): Filter by specific year
 * - month (optional): Filter by specific month (1-12)
 * - limit (optional): Limit number of records (default: 12)
 */
export const GET = authorizedRoute(
    ['HR', 'MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user, { params }: { params: { employeeId: string } }) => {
        try {
            const { employeeId } = params;
            const { searchParams } = new URL(req.url);

            const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
            const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 12;

            // Build where clause for filtering
            const where: any = { employeeId };

            if (year) {
                where.year = year;
            }

            if (month) {
                where.month = month;
            }

            // Fetch leave ledger entries
            const ledgerEntries = await prisma.leaveLedger.findMany({
                where,
                orderBy: [
                    { year: 'desc' },
                    { month: 'desc' }
                ],
                take: limit,
                include: {
                    employee: {
                        select: {
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            // Get latest balance
            const latestBalance = ledgerEntries.length > 0 ? ledgerEntries[0] : null;

            // Calculate attendance behavior metrics
            const attendanceMetrics = await calculateAttendanceBehavior(employeeId, year, month);

            // Calculate summary statistics
            const summary = {
                totalCredits: ledgerEntries.reduce((sum, entry) => sum + (entry.autoCredit || 0), 0),
                totalTaken: ledgerEntries.reduce((sum, entry) => sum + entry.takenLeaves, 0),
                totalLateDeductions: ledgerEntries.reduce((sum, entry) => sum + entry.lateDeductions, 0),
                totalShortLeaveDeductions: ledgerEntries.reduce((sum, entry) => sum + entry.shortLeaveDeductions, 0),
                currentBalance: latestBalance?.closingBalance || 0,
                totalLateArrivals: ledgerEntries.reduce((sum, entry) => sum + entry.lateArrivalCount, 0),
                totalShortLeaves: ledgerEntries.reduce((sum, entry) => sum + entry.shortLeaveCount, 0)
            };

            return NextResponse.json({
                ledgerEntries,
                latestBalance,
                attendanceMetrics,
                summary
            });
        } catch (error) {
            console.error('Error fetching leave ledger:', error);
            return createErrorResponse(error);
        }
    }
);

/**
 * Calculate attendance behavior metrics
 */
async function calculateAttendanceBehavior(
    employeeId: string,
    year?: number,
    month?: number
) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month;

    // Build date range
    let startDate: Date;
    let endDate: Date;

    if (targetMonth) {
        // Specific month
        startDate = new Date(targetYear, targetMonth - 1, 1);
        endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    } else {
        // Entire year
        startDate = new Date(targetYear, 0, 1);
        endDate = new Date(targetYear, 11, 31, 23, 59, 59);
    }

    // Fetch attendance records
    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            employeeId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { date: 'desc' }
    });

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
    const lateDays = attendanceRecords.filter(a => a.isLate).length;
    const shortDays = attendanceRecords.filter(a => a.isShort).length;
    const absentDays = attendanceRecords.filter(a => a.status === 'ABSENT').length;

    // Calculate scores
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    const punctualityScore = totalDays > 0 ? ((totalDays - lateDays) / totalDays) * 100 : 100;
    const regularityScore = totalDays > 0 ? ((totalDays - absentDays) / totalDays) * 100 : 100;

    // Calculate trends (compare with previous period)
    const previousPeriodStart = targetMonth
        ? new Date(targetYear, targetMonth - 2, 1)
        : new Date(targetYear - 1, 0, 1);
    const previousPeriodEnd = targetMonth
        ? new Date(targetYear, targetMonth - 1, 0, 23, 59, 59)
        : new Date(targetYear - 1, 11, 31, 23, 59, 59);

    const previousRecords = await prisma.attendance.findMany({
        where: {
            employeeId,
            date: {
                gte: previousPeriodStart,
                lte: previousPeriodEnd
            }
        }
    });

    const previousLateDays = previousRecords.filter(a => a.isLate).length;
    const previousTotalDays = previousRecords.length;
    const previousPunctualityScore = previousTotalDays > 0
        ? ((previousTotalDays - previousLateDays) / previousTotalDays) * 100
        : 100;

    const punctualityTrend = punctualityScore - previousPunctualityScore;

    return {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        shortDays,
        attendancePercentage: Math.round(attendancePercentage * 10) / 10,
        punctualityScore: Math.round(punctualityScore * 10) / 10,
        regularityScore: Math.round(regularityScore * 10) / 10,
        punctualityTrend: Math.round(punctualityTrend * 10) / 10,
        averageLateMinutes: lateDays > 0
            ? Math.round(attendanceRecords.filter(a => a.isLate).reduce((sum, a) => sum + a.lateMinutes, 0) / lateDays)
            : 0
    };
}
