import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, context: { params: Promise<{ mid: string }> }) => {
        try {
            const params = await context.params;
            const { mid: moduleId } = params;

            const lessons = await prisma.courseLesson.findMany({
                where: { moduleId },
                orderBy: { order: 'asc' }
            });

            return NextResponse.json(lessons);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ mid: string }> }) => {
        try {
            const params = await context.params;
            const { mid: moduleId } = params;
            const body = await req.json();
            const { title, description, type, contentUrl, textContent, duration, isFree } = body;

            // Get the highest order number
            const lastLesson = await prisma.courseLesson.findFirst({
                where: { moduleId },
                orderBy: { order: 'desc' }
            });

            const newOrder = (lastLesson?.order || 0) + 1;

            const lesson = await prisma.courseLesson.create({
                data: {
                    moduleId,
                    title,
                    description,
                    type: type || 'VIDEO',
                    contentUrl,
                    textContent,
                    duration: duration ? parseInt(duration) : null,
                    isFree: isFree || false,
                    order: newOrder
                }
            });

            return NextResponse.json(lesson);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
