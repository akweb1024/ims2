import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const interviewId = params.id;

        const screening = await prisma.interviewScreening.findUnique({
            where: { interviewId },
            include: { template: true, responses: true }
        });

        if (!screening) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json(screening);
    } catch (error) {
        console.error('Fetch Screening Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: any) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const interviewId = params.id;
        const data = await request.json(); // { questionId, rating, checkboxStatus, notes, flags }

        const screening = await prisma.interviewScreening.findUnique({ where: { interviewId } });
        if (!screening) return NextResponse.json({ error: 'Screening not found' }, { status: 404 });
        if (screening.status === 'SUBMITTED') {
            return NextResponse.json({ error: 'Screening already submitted' }, { status: 400 });
        }

        // Upsert response
        const { questionId, ...responseFields } = data;

        const existingResponse = await prisma.screeningResponse.findFirst({
            where: { screeningId: screening.id, questionId }
        });

        let savedResponse;
        if (existingResponse) {
            savedResponse = await prisma.screeningResponse.update({
                where: { id: existingResponse.id },
                data: responseFields
            });
        } else {
            savedResponse = await prisma.screeningResponse.create({
                data: {
                    screeningId: screening.id,
                    questionId,
                    ...responseFields
                }
            });
        }

        return NextResponse.json(savedResponse);
    } catch (error) {
        console.error('Update Screening Response Error:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
