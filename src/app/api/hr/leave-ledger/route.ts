
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
                    user: { select: { email: true } },
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
            const body = await req.json();
            const { employeeId, month, year, openingBalance, takenLeaves, closingBalance, remarks } = body;

            if (!employeeId || !month || !year) {
                return createErrorResponse('Missing required fields', 400);
            }

            const ledger = await prisma.leaveLedger.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId,
                        month,
                        year
                    }
                },
                update: {
                    openingBalance: parseFloat(openingBalance),
                    takenLeaves: parseFloat(takenLeaves),
                    closingBalance: parseFloat(closingBalance),
                    remarks,
                    companyId: user.companyId
                },
                create: {
                    employeeId,
                    month,
                    year,
                    openingBalance: parseFloat(openingBalance),
                    takenLeaves: parseFloat(takenLeaves),
                    closingBalance: parseFloat(closingBalance),
                    remarks,
                    companyId: user.companyId
                }
            });

            // Also update the main leaveBalance in EmployeeProfile if this is the latest closing balance
            // For simplicity, we update it whenever a ledger is saved
            await prisma.employeeProfile.update({
                where: { id: employeeId },
                data: { leaveBalance: parseFloat(closingBalance) }
            });

            return NextResponse.json(ledger);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
