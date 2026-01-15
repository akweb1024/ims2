import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/it/projects/[id]/milestones - Fetch milestones for a project
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const projectId = params.id;
        const milestones = await (prisma as any).iTProjectMilestone.findMany({
            where: { projectId },
            orderBy: { dueDate: 'asc' }
        });

        return NextResponse.json(milestones);
    } catch (error) {
        console.error('Fetch Milestones Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/projects/[id]/milestones - Create a milestone
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const projectId = params.id;
        const body = await req.json();

        const milestone = await (prisma as any).iTProjectMilestone.create({
            data: {
                projectId,
                name: body.name,
                description: body.description,
                dueDate: new Date(body.dueDate),
                paymentAmount: body.paymentAmount || 0,
                status: body.status || 'PENDING'
            }
        });

        return NextResponse.json(milestone);
    } catch (error) {
        console.error('Create Milestone Error:', error);
        return createErrorResponse(error);
    }
}
