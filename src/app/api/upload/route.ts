import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { StorageService, FileCategory } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Categories this generic endpoint may write to. Publicly-served categories
// (publications, profile_pictures) have their own dedicated endpoints — letting
// callers pick them here would allow dumping arbitrary files onto public URLs.
const ALLOWED_CATEGORIES: FileCategory[] = ['general', 'documents'];

// Extension allowlist for attachments (receipts, resumes, request docs).
// Actively-rendered types (svg, html, js) are deliberately excluded — an SVG
// served inline can run script in the viewer's session.
const ALLOWED_EXTENSIONS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'zip',
]);

// POST /api/upload — unified upload endpoint using StorageService + FileRecord
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50') * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `File exceeds ${process.env.UPLOAD_MAX_SIZE_MB || '50'}MB limit` },
                { status: 400 }
            );
        }

        const extension = (file.name.split('.').pop() || '').toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return NextResponse.json(
                { error: `File type .${extension || 'unknown'} is not allowed` },
                { status: 400 }
            );
        }

        // Optional metadata
        const requestedCategory = (formData.get('category') as FileCategory) || 'general';
        if (!ALLOWED_CATEGORIES.includes(requestedCategory)) {
            return NextResponse.json(
                { error: `Category '${requestedCategory}' is not allowed on this endpoint` },
                { status: 400 }
            );
        }
        const category = requestedCategory;
        const context       = formData.get('context') as string | null;
        const journalId     = formData.get('journalId') as string | null;
        const volumeNumber  = formData.get('volumeNumber') ? parseInt(formData.get('volumeNumber') as string) : undefined;
        const issueNumber   = formData.get('issueNumber')  ? parseInt(formData.get('issueNumber')  as string) : undefined;
        const articleId     = formData.get('articleId')    as string | null;

        const bytes  = await file.arrayBuffer();
        const result = await StorageService.saveFileWithRecord(
            bytes,
            file.name,
            category,
            {
                uploadedById: user.id,
                context:      context ?? undefined,
                meta: journalId ? { journalId, volumeNumber, issueNumber, articleId: articleId ?? undefined } : undefined,
            }
        );

        return NextResponse.json({
            id:          result.record.id,
            url:         result.url,
            filename:    file.name,
            storedName:  result.storedName,
            size:        file.size,
            mimeType:    file.type,
            checksum:    result.checksum,
            category,
        });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
