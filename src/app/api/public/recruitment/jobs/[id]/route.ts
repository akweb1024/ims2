import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

// Public job detail for the careers site — anonymous candidates must be able
// to read a posting before applying. Only OPEN postings are exposed.
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const job = await prisma.jobPosting.findFirst({
            where: { id, status: 'OPEN' },
            include: {
                department: { select: { name: true } },
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json(job);
    } catch (error) {
        return createErrorResponse(error);
    }
}
