import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id } = params;

            const modules = await prisma.courseModule.findMany({
                where: { courseId: id },
                include: {
                    lessons: {
                        orderBy: { order: 'asc' }
                    },
                    _count: {
                        select: { lessons: true }
                    }
                },
                orderBy: { order: 'asc' }
            });

            return NextResponse.json(modules);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
        try {
            const params = await context.params;
            const { id: courseId } = params;
            const body = await req.json();
            const { title, description } = body;

            // Get the highest order number
            const lastModule = await prisma.courseModule.findFirst({
                where: { courseId },
                orderBy: { order: 'desc' }
            });

            const newOrder = (lastModule?.order || 0) + 1;

            const module = await prisma.courseModule.create({
                data: {
                    courseId,
                    title,
                    description,
                    order: newOrder
                }
            });

            return NextResponse.json(module);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
