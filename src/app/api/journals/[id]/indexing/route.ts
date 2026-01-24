import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch tracking info for this journal
        const trackings = await prisma.journalIndexingTracking.findMany({
            where: { journalId: id },
            include: { indexingMaster: true }
        });

        return NextResponse.json(trackings);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();

        // Only Editors/Managers can update indexing
        if (!user || !['SUPER_ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { indexingId, status, auditData, auditScore, ...dates } = body;

        const tracking = await prisma.journalIndexingTracking.upsert({
            where: {
                journalId_indexingId: {
                    journalId: id,
                    indexingId: indexingId
                }
            },
            create: {
                journalId: id,
                indexingId,
                status: status || 'PLANNED',
                auditData,
                auditScore,
                ...dates
            },
            update: {
                status,
                auditData,
                auditScore,
                ...dates
            }
        });

        return NextResponse.json(tracking);
    } catch (error) {
        console.error('Indexing Update Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
