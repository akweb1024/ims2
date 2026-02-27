import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';
import { StorageService } from '@/lib/storage';

// GET /api/it/projects/[id]/documents - List project documents
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const projectId = id;
        const documents = await (prisma as any).iTProjectDocument.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error('Fetch Documents Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/projects/[id]/documents - Upload/Add a project document
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const projectId = id;
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const content = formData.get('content') as string | null;
        const category = formData.get('category') as string || 'GENERAL';

        if (!file && !content) {
            return NextResponse.json({ error: 'No file or text content provided' }, { status: 400 });
        }

        let url = null;
        let fileType = content ? 'text/html' : 'application/octet-stream';
        let fileSize = content ? content.length : 0;

        if (file && file.size > 0) {
            // Save file using StorageService
            const bytes = await file.arrayBuffer();
            const storageResult = await StorageService.saveFile(
                Buffer.from(bytes),
                file.name,
                'documents'
            );
            url = storageResult.url;
            fileType = file.type || originalFileType(file.name);
            fileSize = file.size;
        }

        const document = await (prisma as any).iTProjectDocument.create({
            data: {
                projectId,
                name: name || (file ? file.name : 'Untitled Text'),
                description,
                content,
                url,
                fileType,
                fileSize,
                category
            }
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error('Upload Document Error:', error);
        return createErrorResponse(error);
    }
}

function originalFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'doc':
        case 'docx': return 'application/msword';
        case 'xls':
        case 'xlsx': return 'application/vnd.ms-excel';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        default: return 'application/octet-stream';
    }
}
