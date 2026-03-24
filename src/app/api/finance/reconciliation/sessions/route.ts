import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

        const sessions = await (prisma as any).bankReconciliationSession.findMany({
            where: {
                companyId: user.companyId,
            },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });

        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error('Reconciliation Sessions GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
