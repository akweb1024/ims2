import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/it/tasks/[id]/comments - Get task comments
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const comments = await prisma.iTTaskComment.findMany({
            where: { taskId: params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                profilePicture: true,
                                designation: true,
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Fetch Task Comments Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/tasks/[id]/comments - Add task comment
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { content } = body;

        if (!content || content.trim() === '') {
            return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
        }

        // Verify task exists and user has access
        const task = await prisma.iTTask.findUnique({
            where: { id: id }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const companyId = (user as any).companyId;
        if (task.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const comment = await prisma.iTTaskComment.create({
            data: {
                taskId: params.id,
                userId: user.id,
                content: content.trim(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                profilePicture: true,
                                designation: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error('Create Task Comment Error:', error);
        return createErrorResponse(error);
    }
}
