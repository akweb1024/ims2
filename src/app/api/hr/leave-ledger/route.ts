
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = user.companyId;

            const year = parseInt(searchParams.get('year') || (new Date().getFullYear()).toString());
            const monthParam = searchParams.get('month');
            const targetEmployeeId = searchParams.get('employeeId');

            // Default to current month if not fetching history (no employeeId) and no month specified
            const month = monthParam ? parseInt(monthParam) : (targetEmployeeId ? undefined : new Date().getMonth() + 1);

            if (!companyId && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Company context required', 400);
            }

            const where: any = {
                user: {
                    isActive: true
                }
            };

            if (companyId) {
                where.user.companyId = companyId;
            }

            if (targetEmployeeId) {
                where.id = targetEmployeeId;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, companyId || undefined);
                where.user.id = { in: subIds };
            }

            // Ledger filter
            const ledgerWhere: any = { year };
            if (month) {
                ledgerWhere.month = month;
            }

            // Fetch employees
            const employees = await prisma.employeeProfile.findMany({
                where: where,
                include: {
                    user: { select: { email: true, name: true } },
                    leaveLedgers: {
                        where: ledgerWhere,
                        orderBy: { month: 'asc' }
                    }
                }
            });

            // Flatten data
            // If fetching history (targetEmployeeId present), we might return multiple rows per employee (one per month)
            // If fetching batch (default), we expect one row per employee (for the specific month)

            let data: any[] = [];

            if (targetEmployeeId && !month) {
                // History Mode: Return array of ledgers for this employee
                employees.forEach(emp => {
                    const filledLedgers: any[] = [];
                    for (let m = 1; m <= 12; m++) {
                        const existing = emp.leaveLedgers.find(l => l.month === m);

                        let opening = 0;
                        if (m === 1) {
                            opening = existing?.openingBalance || 0;
                        } else {
                            opening = filledLedgers[m - 2].closingBalance;
                        }

                        const auto = existing?.autoCredit ?? 1.5;
                        const taken = existing?.takenLeaves ?? 0;
                        const late = existing?.lateDeductions ?? 0;
                        const short = existing?.shortLeaveDeductions ?? 0;
                        const remarks = existing?.remarks || '';
                        const closing = opening + auto - taken - late - short;

                        filledLedgers.push({
                            id: existing?.id || `temp_${m}`,
                            employeeId: emp.id,
                            email: emp.user.email,
                            name: emp.user.name,
                            month: m,
                            year,
                            openingBalance: parseFloat(opening.toFixed(2)),
                            autoCredit: auto,
                            takenLeaves: taken,
                            lateArrivalCount: existing?.lateArrivalCount || 0,
                            shortLeaveCount: existing?.shortLeaveCount || 0,
                            lateDeductions: late,
                            shortLeaveDeductions: parseFloat(short.toFixed(2)),
                            closingBalance: parseFloat(closing.toFixed(2)),
                            remarks: remarks
                        });
                    }
                    data = filledLedgers;
                });
            } else {
                // Batch Mode
                data = employees.map(emp => {
                    const ledger = emp.leaveLedgers[0] || null; // Access 0 because we filtered by month
                    return {
                        employeeId: emp.id,
                        email: emp.user.email,
                        name: emp.user.name,
                        month: month || 0, // Should always be present in batch mode
                        year,
                        openingBalance: ledger?.openingBalance || 0,
                        autoCredit: ledger?.autoCredit || 1.5,
                        takenLeaves: ledger?.takenLeaves || 0,
                        lateArrivalCount: ledger?.lateArrivalCount || 0,
                        shortLeaveCount: ledger?.shortLeaveCount || 0,
                        lateDeductions: ledger?.lateDeductions || 0,
                        shortLeaveDeductions: ledger?.shortLeaveDeductions || 0,
                        closingBalance: ledger?.closingBalance || 0,
                        remarks: ledger?.remarks || ''
                    };
                });
            }

            return NextResponse.json(data);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            let body;
            try {
                body = await req.json();
            } catch (e) {
                return createErrorResponse('Invalid JSON', 400);
            }

            const { employeeId, month, year, openingBalance, autoCredit, takenLeaves, lateDeductions, shortLeaveDeductions, closingBalance, remarks } = body;

            if (!employeeId || !month || !year) {
                return createErrorResponse('Missing required fields (employeeId, month, year)', 400);
            }

            const parseNum = (v: any) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            // Prevent future updates
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;

            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                return createErrorResponse('Cannot update leave ledger for future months', 400);
            }

            const safeOpening = parseNum(openingBalance);
            const safeAllotted = parseNum(autoCredit || 1.5);
            const safeTaken = parseNum(takenLeaves);
            const safeLateDeds = parseNum(lateDeductions);
            const safeShortDeds = parseNum(shortLeaveDeductions);
            const result = await prisma.$transaction(async (tx) => {
                const finalOpening = safeOpening;
                const finalAuto = safeAllotted;
                const finalTaken = safeTaken;
                const finalLate = safeLateDeds;
                const finalShort = safeShortDeds;
                const rawClosing = finalOpening + finalAuto - finalTaken - finalLate - finalShort;

                const ledger = await tx.leaveLedger.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId,
                            month,
                            year
                        }
                    },
                    update: {
                        openingBalance: finalOpening,
                        autoCredit: finalAuto,
                        takenLeaves: finalTaken,
                        lateDeductions: finalLate,
                        shortLeaveDeductions: finalShort,
                        closingBalance: rawClosing,
                        remarks,
                        companyId: user.companyId
                    },
                    create: {
                        employeeId,
                        month,
                        year,
                        openingBalance: finalOpening,
                        autoCredit: finalAuto,
                        takenLeaves: finalTaken,
                        lateDeductions: finalLate,
                        shortLeaveDeductions: finalShort,
                        closingBalance: rawClosing,
                        remarks,
                        companyId: user.companyId
                    }
                });

                const updateFutureMonths = async (currentMonth: number, currentYear: number, currentClosingBalance: number) => {
                    if (currentMonth >= 12) return;

                    const nextMonth = currentMonth + 1;
                    const nextYear = currentYear;

                    const nextLedger = await tx.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId,
                                month: nextMonth,
                                year: nextYear
                            }
                        }
                    });

                    if (nextLedger) {
                        const newOpening = currentClosingBalance;
                        const nextAuto = nextLedger.autoCredit;
                        const nextTaken = nextLedger.takenLeaves;
                        const nextLate = nextLedger.lateDeductions;
                        const nextShort = nextLedger.shortLeaveDeductions;
                        const newClosing = newOpening + (nextAuto || 1.5) - nextTaken - nextLate - nextShort;

                        await tx.leaveLedger.update({
                            where: { id: nextLedger.id },
                            data: {
                                openingBalance: newOpening,
                                closingBalance: newClosing
                            }
                        });

                        await updateFutureMonths(nextMonth, nextYear, newClosing);
                    }
                };

                await updateFutureMonths(month, year, rawClosing);

                // Sync EmployeeProfile including metrics breakdown
                const profile = await tx.employeeProfile.findUnique({
                    where: { id: employeeId },
                    select: { metrics: true, leaveLedgers: { where: { month, year } } }
                });

                const oldLedger = profile?.leaveLedgers[0];
                const oldTaken = oldLedger?.takenLeaves || 0;
                const deltaTaken = safeTaken - oldTaken;

                const metrics = profile?.metrics as any || {};
                if (!metrics.leaveBalances) {
                    metrics.leaveBalances = {
                        sick: { total: 10, used: 0 },
                        casual: { total: 7, used: 0 },
                        annual: { total: 20, used: 0 },
                        compensatory: { total: 5, used: 0 }
                    };
                }

                // Apply delta to Annual bucket as the default for manual ledger adjustments
                if (metrics.leaveBalances.annual) {
                    metrics.leaveBalances.annual.used = Math.max(0, (metrics.leaveBalances.annual.used || 0) + deltaTaken);
                }

                await tx.employeeProfile.update({
                    where: { id: employeeId },
                    data: {
                        currentLeaveBalance: rawClosing,
                        leaveBalance: rawClosing,
                        metrics: metrics
                    }
                });

                return ledger;
            });

            return NextResponse.json(result);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
