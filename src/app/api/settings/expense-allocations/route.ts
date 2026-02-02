import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const rules = await prisma.expenseAllocationRule.findMany({
            where: { companyId: user.companyId as string },
            include: { department: { select: { id: true, name: true } } }
        });
        return NextResponse.json(rules);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

interface AllocationRuleInput {
    departmentId: string;
    percentage: number;
}

export const POST = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { rules } = body; // Array of AllocationRuleInput

        if (!Array.isArray(rules)) {
            return NextResponse.json({ error: 'Rules must be an array' }, { status: 400 });
        }

        const companyId = user.companyId as string;

        // Using transaction to update all rules
        const results = await prisma.$transaction(
            rules.map((rule: AllocationRuleInput) => prisma.expenseAllocationRule.upsert({
                where: {
                    companyId_departmentId: {
                        companyId,
                        departmentId: rule.departmentId
                    }
                },
                update: {
                    percentage: Number(rule.percentage),
                    isActive: true
                },
                create: {
                    companyId,
                    departmentId: rule.departmentId,
                    percentage: Number(rule.percentage),
                    isActive: true
                }
            }))
        );

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
