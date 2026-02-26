import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// GET /api/it/projects/[id]/suggestions - Get suggestions for a project
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const project = await prisma.iTProject.findUnique({
            where: { id: projectId },
            select: { id: true, visibility: true, companyId: true }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Authentication is optional for PUBLIC projects, but we check company isolation if private
        const user = await getAuthenticatedUser().catch(() => null);
        
        if (project.visibility !== 'PUBLIC') {
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            if ((user as any).companyId !== project.companyId && project.visibility === 'PRIVATE') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const suggestions = await prisma.iTProjectSuggestion.findMany({
            where: { projectId: projectId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeProfile: { select: { profilePicture: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Fetch Suggestions Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/projects/[id]/suggestions - Add a new suggestion
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await context.params;
        const body = await req.json();
        
        const project = await prisma.iTProject.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const user = await getAuthenticatedUser().catch(() => null);

        // Validation
        if (!body.content || body.content.trim() === '') {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const suggestion = await prisma.iTProjectSuggestion.create({
            data: {
                projectId: projectId,
                content: body.content,
                authorName: body.authorName || ((user as any)?.name || user?.email || 'Guest'),
                authorEmail: body.authorEmail || (user?.email || null),
                userId: user?.id || null,
                status: 'PENDING'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeProfile: { select: { profilePicture: true } }
                    }
                }
            }
        });

        return NextResponse.json(suggestion, { status: 201 });
    } catch (error) {
        console.error('Create Suggestion Error:', error);
        return createErrorResponse(error);
    }
}
