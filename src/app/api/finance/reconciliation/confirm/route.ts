import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { journalEntryId } = await req.json();

        const entry = await prisma.journalEntry.findUnique({
            where: { id: journalEntryId }
        });

        if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        if (entry.companyId !== user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

        const updated = await prisma.journalEntry.update({
            where: { id: journalEntryId },
            data: { status: 'RECONCILED' }
        });

        return NextResponse.json(updated);

    } catch (error: any) {
        console.error('Reconciliation Confirm Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
