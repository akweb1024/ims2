
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'HR_MANAGER', 'EXECUTIVE', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const scope = searchParams.get('scope') || 'SELF'; // 'SELF', 'TEAM', 'COMPANY'
            const startDateStr = searchParams.get('startDate');
            const endDateStr = searchParams.get('endDate');
            const departmentId = searchParams.get('departmentId');

            // Default Date Range: Current Month
            const now = new Date();
            const startDate = startDateStr ? new Date(startDateStr) : startOfMonth(now);
            const endDate = endDateStr ? new Date(endDateStr) : endOfMonth(now);

            // 1. Determine User Scope & Filters
            let employeeFilter: any = {};
            let isTeamOrCompany = false;

            if (scope === 'COMPANY') {
                // Only Admins/HR can see Company view
                if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'].includes(user.role)) {
                    return NextResponse.json({ error: 'Unauthorized for COMPANY scope' }, { status: 403 });
                }
                employeeFilter = {
                    companyId: user.companyId
                };
                if (departmentId && departmentId !== 'ALL') {
                    employeeFilter.departmentId = departmentId;
                }
                isTeamOrCompany = true;
            } else if (scope === 'TEAM') {
                // Managers see their direct reports
                // Also Admins can view "Team" view if they want really, but usually for Manager role
                employeeFilter = {
                    managerId: user.id, // Users who report to this user
                    companyId: user.companyId
                };
                isTeamOrCompany = true;
            } else {
                // SELF (Default)
                // Filter by the specific Employee Profile linked to this User
                // We need to fetch the EmployeeProfile ID first because Attendance is linked to EmployeeProfile, not User directly (usually)
                // Checking schema: Attendance -> employeeId (Reference to EmployeeProfile)
                const employeeProfile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });

                if (!employeeProfile) {
                    return NextResponse.json({ summary: {}, trends: [], leaveBalances: [] });
                }

                employeeFilter = {
                    id: employeeProfile.id
                };
            }

            // 2. Fetch Aggregated Attendance Data
            // We need to fetch 'Attendance' records that match the employeeFilter

            const attendanceWhere: any = {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                employee: employeeFilter
            };

            const attendanceRecords = await prisma.attendance.findMany({
                where: attendanceWhere,
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: { select: { name: true } },
                            designatRef: {
                                select: {
                                    name: true,
                                    departments: {
                                        select: { name: true }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { date: 'asc' }
            });

            // 3. Process Summary Stats
            // Better to count distinct dates if multiple people, or just sum of records for simplicity in admin view (Total Man-Days)
            // For SELF: totalDays is simple count.
            // For TEAM/COMPANY: totalDays is sum of all attendance records.

            let present = 0;
            let absent = 0;
            let late = 0;
            let halfDay = 0;
            let totalLateMinutes = 0;
            let short = 0;
            let totalShortMinutes = 0;

            // For Trends
            const trendsMap = new Map<string, { date: string, present: number, absent: number, late: number, short: number }>();

            attendanceRecords.forEach(record => {
                const dateKey = format(record.date, 'yyyy-MM-dd');

                // Init trend entry
                if (!trendsMap.has(dateKey)) {
                    trendsMap.set(dateKey, { date: dateKey, present: 0, absent: 0, late: 0, short: 0 });
                }
                const trend = trendsMap.get(dateKey)!;

                // Status Check
                const status = record.status.toUpperCase();
                if (status === 'PRESENT' || status === 'WORK_FROM_HOME') {
                    present++;
                    trend.present++;
                } else if (status === 'ABSENT') {
                    absent++;
                    trend.absent++;
                } else if (status === 'HALF_DAY') {
                    halfDay++;
                    // Treat as 0.5 present? simple count for now
                }

                if (record.lateMinutes > 0) {
                    late++;
                    trend.late++;
                    totalLateMinutes += record.lateMinutes;
                }

                if (record.isShort) {
                    short++;
                    trend.short++;
                    totalShortMinutes += record.shortMinutes;
                }
            });

            const summary = {
                totalRecords: attendanceRecords.length,
                present,
                absent,
                late,
                short,
                halfDay,
                avgLateMinutes: late > 0 ? Math.round(totalLateMinutes / late) : 0,
                avgShortMinutes: short > 0 ? Math.round(totalShortMinutes / short) : 0
            };

            const trends = Array.from(trendsMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // 4. Leave Balances Logic
            // Fetch LeaveLedger for the relevant employees. 
            // We usually want the *latest* balance.
            // LeaveLedger is unique by [employeeId, month, year].

            const currentMonth = now.getMonth() + 1; // 1-12
            const currentYear = now.getFullYear();

            // Fetch latest ledgers for the filtered employees
            const leaveLedgers = await prisma.leaveLedger.findMany({
                where: {
                    employee: employeeFilter,
                    month: currentMonth,
                    year: currentYear
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            user: { select: { name: true, email: true } }
                        }
                    }
                },
                take: isTeamOrCompany ? 100 : undefined // Limit for team/company views to avoid massive payloads
            });

            const balances = leaveLedgers.map(l => ({
                id: l.id,
                employeeName: l.employee.user.name || l.employee.user.email,
                opening: l.openingBalance,
                used: l.takenLeaves,
                closing: l.closingBalance,
                lateCount: l.lateArrivalCount
            }));

            // If SELF, maybe looking for history of balances? 
            // For now, returning the current month's breakdown is good.

            return NextResponse.json({
                scope,
                summary,
                trends,
                balances
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
