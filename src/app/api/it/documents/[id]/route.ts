import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

// DELETE /api/it/documents/[id] - Remove a document
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const documentId = id;

        // Fetch to get URL for potential file deletion if needed
        const document = await prisma.iTProjectDocument.findUnique({
            where: { id: documentId }
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Check if user has access to company
        const companyId = (user as any).companyId;
        const project = await prisma.iTProject.findUnique({
            where: { id: document.projectId },
            select: { companyId: true }
        });

        if (!project || project.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete from DB (File cleanup could be added here later)
        await prisma.iTProjectDocument.delete({
            where: { id: documentId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Document Error:', error);
        return createErrorResponse(error);
    }
}
