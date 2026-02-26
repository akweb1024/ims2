import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

function canManageSuggestions(role: string): boolean {
    return ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(role);
}

// PATCH /api/it/projects/[id]/suggestions/[suggestionId] - Update suggestion status
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string, suggestionId: string }> }
) {
    try {
        const { id: projectId, suggestionId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Check if suggestion exists
        const suggestion = await prisma.iTProjectSuggestion.findUnique({
            where: { id: suggestionId },
            include: { project: true }
        });

        if (!suggestion) {
            return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
        }

        // Check permissions: only admins or project managers can update status
        const canUpdate = canManageSuggestions(user.role) || 
                          suggestion.project.projectManagerId === user.id ||
                          suggestion.project.teamLeadId === user.id;

        if (!canUpdate) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const allowedFields = ['status', 'content'];
        const updateData: any = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const updatedSuggestion = await prisma.iTProjectSuggestion.update({
            where: { id: suggestionId },
            data: updateData,
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

        return NextResponse.json(updatedSuggestion);
    } catch (error) {
        console.error('Update Suggestion Error:', error);
        return createErrorResponse(error);
    }
}

// DELETE /api/it/projects/[id]/suggestions/[suggestionId] - Delete suggestion
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string, suggestionId: string }> }
) {
    try {
        const { id: projectId, suggestionId } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const suggestion = await prisma.iTProjectSuggestion.findUnique({
            where: { id: suggestionId },
            include: { project: true }
        });

        if (!suggestion) {
            return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
        }

        const canDelete = canManageSuggestions(user.role) || 
                          suggestion.project.projectManagerId === user.id ||
                          suggestion.userId === user.id;

        if (!canDelete) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.iTProjectSuggestion.delete({
            where: { id: suggestionId }
        });

        return NextResponse.json({ message: 'Suggestion deleted' });
    } catch (error) {
        console.error('Delete Suggestion Error:', error);
        return createErrorResponse(error);
    }
}
