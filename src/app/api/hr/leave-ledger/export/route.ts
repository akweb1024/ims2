import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
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

            const employees = await prisma.employeeProfile.findMany({
                where: where,
                include: {
                    user: { select: { email: true, name: true } },
                    leaveLedgers: {
                        where: { month, year }
                    }
                }
            });

            const csvRows = [
                ['Employee ID', 'Email', 'Name', 'Month', 'Year', 'Last Bal Leave', 'Leave Allotted', 'Leave Taken', 'Delay Deductions', 'New Balance'].join(',')
            ];

            employees.forEach(emp => {
                const ledger = emp.leaveLedgers[0] || null;
                const row = [
                    emp.id,
                    emp.user.email,
                    emp.user.name || '',
                    month,
                    year,
                    ledger?.openingBalance || 0,
                    ledger?.autoCredit || 0,
                    ledger?.takenLeaves || 0,
                    (ledger?.lateDeductions || 0) + (ledger?.shortLeaveDeductions || 0),
                    ledger?.closingBalance || 0
                ].join(',');
                csvRows.push(row);
            });

            const csvContent = csvRows.join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="leave_ledger_${month}_${year}.csv"`
                }
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
