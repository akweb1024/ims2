import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/access-policy';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            // Prisma drops an undefined key rather than matching null, so
            // `companyId: user.companyId || undefined` returned every company's rows
            // to a null-company user (User.companyId is nullable).
            const where: any = {};
            if (!canAccessAllCompanies(user)) {
                if (!user.companyId) return NextResponse.json([]);
                where.companyId = user.companyId;
            }

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                where.employee = { userId: { in: [...subIds, user.id] } };
            }

            if (employeeId) {
                // If it's a manager, ensure the employee is in their downline
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const allowedIds = [...subIds, user.id];
                    const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { userId: true } });
                    if (!targetEmp || !allowedIds.includes(targetEmp.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }
                where.employeeId = employeeId;
            }

            const advances = await prisma.salaryAdvance.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true } } }
                    },
                    emis: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(advances);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { employeeId, amount, totalEmis, reason, startDate } = await req.json();

            if (!employeeId || !amount || !totalEmis) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            const emiAmount = parseFloat(amount) / parseInt(totalEmis);

            const advance = await prisma.salaryAdvance.create({
                data: {
                    employeeId,
                    amount: parseFloat(amount),
                    totalEmis: parseInt(totalEmis),
                    emiAmount: parseFloat(emiAmount.toFixed(2)),
                    reason,
                    startDate: startDate ? new Date(startDate) : new Date(),
                    companyId: user.companyId,
                    status: 'APPROVED' // Auto-approved for admin actions
                }
            });

            // Generate skeleton EMIs
            const startStr = startDate ? new Date(startDate) : new Date();
            const emis = [];
            for (let i = 0; i < parseInt(totalEmis); i++) {
                const emiDate = new Date(startStr);
                emiDate.setMonth(emiDate.getMonth() + i);

                emis.push({
                    advanceId: advance.id,
                    amount: parseFloat(emiAmount.toFixed(2)),
                    month: emiDate.getMonth() + 1,
                    year: emiDate.getFullYear(),
                    status: 'PENDING'
                });
            }

            await prisma.advanceEMI.createMany({
                data: emis
            });

            return NextResponse.json(advance);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
