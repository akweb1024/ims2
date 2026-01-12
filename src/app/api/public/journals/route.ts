import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

// Public endpoint to list all active journals
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        const journals = await prisma.journal.findMany({
            where: {
                isActive: true,
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
            },
            select: {
                id: true,
                name: true,
                issnPrint: true,
                issnOnline: true,
                subjectCategory: true,
                frequency: true
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(journals);
    } catch (error) {
        return createErrorResponse(error);
    }
}
