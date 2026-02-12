import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceService } from '@/lib/services/finance';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId && user.role !== 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'No company context' }, { status: 403 });
            }

            const entries = await prisma.journalEntry.findMany({
                where: companyId ? { companyId } : {},
                include: { lines: true },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(entries);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const data = await req.json();
            const companyId = user.companyId;
            if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 404 });

            // Validate data
            if (!data.date || !data.description || !data.lines || data.lines.length < 2) {
                return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
            }

            const entry = await FinanceService.createJournalEntry(companyId, {
                date: new Date(data.date),
                description: data.description,
                reference: data.reference,
                lines: data.lines,
                postedBy: user.id
            });

            return NextResponse.json(entry);
        } catch (error: any) {
            return createErrorResponse(error);
        }
    }
);
