
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
                // We only have one employee in 'employees' array usually
                employees.forEach(emp => {
                    // Start with empty months 1-12 to ensure gaps are filled? 
                    // Or just return what is DB. 
                    // Let's return what is in DB, UI can handle gaps or we fill them here.
                    // Better to fill gaps so UI receives clean 12 months.

                    const filledLedgers = [];
                    for (let m = 1; m <= 12; m++) {
                        const existing = emp.leaveLedgers.find(l => l.month === m);
                        filledLedgers.push({
                            id: existing?.id || `temp_${m}`,
                            employeeId: emp.id,
                            email: emp.user.email,
                            name: emp.user.name,
                            month: m,
                            year,
                            openingBalance: existing?.openingBalance || 0,
                            autoCredit: existing?.autoCredit || 1.5,
                            takenLeaves: existing?.takenLeaves || 0,
                            lateArrivalCount: existing?.lateArrivalCount || 0,
                            shortLeaveCount: existing?.shortLeaveCount || 0,
                            lateDeductions: existing?.lateDeductions || 0,
                            shortLeaveDeductions: existing?.shortLeaveDeductions || 0,
                            closingBalance: existing?.closingBalance || 0,
                            remarks: existing?.remarks || ''
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

            const safeOpening = parseNum(openingBalance);
            const safeAllotted = parseNum(autoCredit || 1.5);
            const safeTaken = parseNum(takenLeaves);
            const safeLateDeds = parseNum(lateDeductions);
            const safeShortDeds = parseNum(shortLeaveDeductions);
            const safeClosing = parseNum(closingBalance);

            const result = await prisma.$transaction(async (tx) => {
                const ledger = await tx.leaveLedger.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId,
                            month,
                            year
                        }
                    },
                    update: {
                        openingBalance: safeOpening,
                        autoCredit: safeAllotted,
                        takenLeaves: safeTaken,
                        lateDeductions: safeLateDeds,
                        shortLeaveDeductions: safeShortDeds,
                        closingBalance: safeClosing,
                        remarks,
                        companyId: user.companyId
                    },
                    create: {
                        employeeId,
                        month,
                        year,
                        openingBalance: safeOpening,
                        autoCredit: safeAllotted,
                        takenLeaves: safeTaken,
                        lateDeductions: safeLateDeds,
                        shortLeaveDeductions: safeShortDeds,
                        closingBalance: safeClosing,
                        remarks,
                        companyId: user.companyId
                    }
                });

                // RECURSIVE CARRY FORWARD: Update all future months for this employee in the same year
                // This ensures if you update Jan, it flows to Feb -> Mar -> Apr...
                const updateFutureMonths = async (currentMonth: number, currentYear: number, currentClosingBalance: number) => {
                    // Stop if we go beyond December
                    if (currentMonth >= 12) return;

                    const nextMonth = currentMonth + 1;
                    const nextYear = currentYear; // Keeping it simple to current year for now to avoid infinite complexity

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
                        // Calculate new closing for next month
                        // New Opening = Previous Closing
                        const newOpening = currentClosingBalance;

                        // New Closing = New Opening + AutoCredit - Taken - Deductions
                        const nextActual = newOpening + (nextLedger.autoCredit || 1.5) - nextLedger.takenLeaves - nextLedger.lateDeductions - nextLedger.shortLeaveDeductions;
                        const nextClosing = Math.max(0, nextActual);

                        // Update the next ledger
                        await tx.leaveLedger.update({
                            where: { id: nextLedger.id },
                            data: {
                                openingBalance: newOpening,
                                closingBalance: nextClosing
                            }
                        });

                        // Recursively update the month after that
                        await updateFutureMonths(nextMonth, nextYear, nextClosing);
                    }
                };

                // Trigger recursive update starting from next month
                await updateFutureMonths(month, year, safeClosing);

                // Sync with EmployeeProfile
                await tx.employeeProfile.update({
                    where: { id: employeeId },
                    data: {
                        currentLeaveBalance: safeClosing,
                        leaveBalance: safeClosing
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
