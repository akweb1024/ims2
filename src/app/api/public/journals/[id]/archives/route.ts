import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

// Public endpoint to browse archives (volumes/issues)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // journalId

        const volumes = await prisma.journalVolume.findMany({
            where: { journalId: id, isActive: true },
            orderBy: { volumeNumber: 'desc' },
            include: {
                issues: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { issueNumber: 'asc' },
                    select: {
                        id: true, issueNumber: true, month: true, title: true,
                        year: true, // If we added year to issue, otherwise use volume year
                        _count: { select: { articles: { where: { status: 'PUBLISHED' } } } }
                    }
                }
            }
        });

        return NextResponse.json(volumes);
    } catch (error) {
        return createErrorResponse(error);
    }
}
