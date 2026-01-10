import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const fiscalYear = parseInt(searchParams.get('fiscalYear') || new Date().getFullYear().toString());
            const companyId = user.companyId;

            if (!companyId) return createErrorResponse('Company ID required', 400);

            const budgets = await prisma.departmentBudget.findMany({
                where: { companyId, fiscalYear },
                include: {
                    department: { select: { name: true } }
                }
            });

            return NextResponse.json(budgets);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { departmentId, fiscalYear, month, allocated, category } = body;

            if (!departmentId || !fiscalYear || !allocated) {
                return createErrorResponse('Missing required fields', 400);
            }

            const budget = await prisma.departmentBudget.upsert({
                where: {
                    // Note: In a real app we'd need a unique constraint or find first
                    // For now we'll simplified create/update logic
                    id: body.id || 'new-id'
                },
                update: {
                    allocated: parseFloat(allocated),
                    category: category || 'SALARY'
                },
                create: {
                    departmentId,
                    companyId: user.companyId!,
                    fiscalYear: parseInt(fiscalYear),
                    month: month ? parseInt(month) : null,
                    allocated: parseFloat(allocated),
                    category: category || 'SALARY'
                }
            });

            return NextResponse.json(budget);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
