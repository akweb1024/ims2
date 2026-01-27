import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// GET - Fetch expense configurations
export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const referenceId = searchParams.get('referenceId');

        const where: any = {};
        if (type) where.type = type;
        if (referenceId) where.referenceId = referenceId;

        const configs = await prisma.lMSExpenseConfig.findMany({ where });

        return NextResponse.json(configs);
    } catch (error: any) {
        console.error('Expense Config GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST - Create or update expense configuration
export const POST = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { type, referenceId, minExpense, expensePercentage } = body;

        if (!type || !referenceId) {
            return NextResponse.json({ error: 'Missing required fields: type, referenceId' }, { status: 400 });
        }

        // Validate type
        if (!['COURSE', 'WORKSHOP', 'INTERNSHIP'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type. Must be COURSE, WORKSHOP, or INTERNSHIP' }, { status: 400 });
        }

        // Upsert (create or update)
        const config = await prisma.lMSExpenseConfig.upsert({
            where: {
                type_referenceId: { type, referenceId }
            },
            create: {
                type,
                referenceId,
                minExpense: minExpense !== undefined ? parseFloat(minExpense) : 30000,
                expensePercentage: expensePercentage !== undefined ? parseFloat(expensePercentage) : 0.30
            },
            update: {
                ...(minExpense !== undefined && { minExpense: parseFloat(minExpense) }),
                ...(expensePercentage !== undefined && { expensePercentage: parseFloat(expensePercentage) })
            }
        });

        return NextResponse.json(config);
    } catch (error: any) {
        console.error('Expense Config POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// DELETE - Delete expense configuration
export const DELETE = authorizedRoute(['ADMIN', 'SUPER_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing config ID' }, { status: 400 });
        }

        await prisma.lMSExpenseConfig.delete({ where: { id } });

        return NextResponse.json({ message: 'Configuration deleted successfully' });
    } catch (error: any) {
        console.error('Expense Config DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
