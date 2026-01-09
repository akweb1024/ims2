
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

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

            // Fetch all employees in this company context
            const employees = await prisma.employeeProfile.findMany({
                where: {
                    user: { companyId: companyId || undefined }
                },
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
                    takenLeaves: ledger?.takenLeaves || 0,
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

            const { employeeId, month, year, openingBalance, takenLeaves, closingBalance, remarks } = body;

            if (!employeeId || !month || !year) {
                return createErrorResponse('Missing required fields (employeeId, month, year)', 400);
            }

            const parseNum = (v: any) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const safeOpening = parseNum(openingBalance);
            const safeTaken = parseNum(takenLeaves);
            const safeClosing = parseNum(closingBalance);

            const ledger = await prisma.leaveLedger.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId,
                        month,
                        year
                    }
                },
                update: {
                    openingBalance: safeOpening,
                    takenLeaves: safeTaken,
                    closingBalance: safeClosing,
                    remarks,
                    companyId: user.companyId
                },
                create: {
                    employeeId,
                    month,
                    year,
                    openingBalance: safeOpening,
                    takenLeaves: safeTaken,
                    closingBalance: safeClosing,
                    remarks,
                    companyId: user.companyId
                }
            });

            // Also update the main leaveBalance in EmployeeProfile if this is the latest closing balance
            // For simplicity, we update it whenever a ledger is saved
            await prisma.employeeProfile.update({
                where: { id: employeeId },
                data: { leaveBalance: safeClosing }
            });

            return NextResponse.json(ledger);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
