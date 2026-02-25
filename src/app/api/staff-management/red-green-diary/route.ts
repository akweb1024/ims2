import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        const entries = await prisma.redGreenDiary.findMany({
            include: {
                user: { select: { id: true, name: true, email: true } },
                recordedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Fetch Red-Green Diary Error:', error);
        return createErrorResponse(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, type, title, description, date } = body;

        if (!userId || !type || !title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get target user's company
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
        }

        const companyIdToUse = targetUser.companyId || (user as any).companyId;

        if (!companyIdToUse) {
            return NextResponse.json({ error: 'No company context found for this operation' }, { status: 400 });
        }

        const entry = await prisma.redGreenDiary.create({
            data: {
                companyId: companyIdToUse,
                userId,
                recordedById: user.id,
                type,
                title,
                description,
                date: date ? new Date(date) : new Date(),
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                recordedBy: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error('Create Red-Green Diary Error:', error);
        return createErrorResponse(error);
    }
}
