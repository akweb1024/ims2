import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await prisma.journalIndexingTracking.findMany({
            select: {
                id: true,
                journalId: true,
                indexingId: true,
                status: true,
                auditScore: true,
                updatedAt: true,
                journal: {
                    select: {
                        id: true, // Needed for link
                        name: true,
                        abbreviation: true,
                        issnPrint: true,
                        issnOnline: true,
                        frequency: true,
                        subjectCategory: true
                    }
                },
                indexingMaster: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Indexing Report API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
