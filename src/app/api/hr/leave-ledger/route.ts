
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
            const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
            const year = parseInt(searchParams.get('year') || (new Date().getFullYear()).toString());
            const companyId = user.companyId;

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

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, companyId || undefined);
                where.user.id = { in: subIds };
            }

            // Fetch all employees in this company context
            const employees = await prisma.employeeProfile.findMany({
                where: where,
                include: {
                    user: { select: { email: true, name: true } },
                    leaveLedgers: {
                        where: { month, year }
                    }
                }
            });

            const data = employees.map(emp => {
                const ledger = emp.leaveLedgers[0] || null;
                return {
                    employeeId: emp.id,
                    email: emp.user.email,
                    name: emp.user.name,
                    month,
                    year,
                    openingBalance: ledger?.openingBalance || 0,
                    autoCredit: ledger?.autoCredit || 1.5, // Default to 1.5
                    takenLeaves: ledger?.takenLeaves || 0,
                    lateDeductions: ledger?.lateDeductions || 0,
                    shortLeaveDeductions: ledger?.shortLeaveDeductions || 0,
                    closingBalance: ledger?.closingBalance || 0,
                    remarks: ledger?.remarks || ''
                };
            });

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

                // CASCADE: Update next month's opening balance if it exists
                const nextMonth = month === 12 ? 1 : month + 1;
                const nextYear = month === 12 ? year + 1 : year;

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
                    // Determine new closing for next month too
                    const nextActual = safeClosing + (nextLedger.autoCredit || 1.5) - nextLedger.takenLeaves - nextLedger.lateDeductions - nextLedger.shortLeaveDeductions;
                    const nextClosing = Math.max(0, nextActual);

                    await tx.leaveLedger.update({
                        where: { id: nextLedger.id },
                        data: {
                            openingBalance: safeClosing,
                            closingBalance: nextClosing
                        }
                    });
                }

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
