import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET - Get tasks assigned to current user
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');

            const assignments = await prisma.stageAssignment.findMany({
                where: {
                    assigneeId: user.id,
                    ...(status ? { status } : {})
                },
                include: {
                    article: {
                        select: {
                            id: true,
                            title: true,
                            manuscriptId: true,
                            journal: { select: { name: true } }
                        }
                    },
                    assignedBy: {
                        select: { name: true }
                    }
                },
                orderBy: { assignedAt: 'desc' }
            });

            return NextResponse.json(assignments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
