import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { authorizedRoute } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// POST /api/feedback/upload — upload attachment for a feedback message
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'EXECUTIVE', 'HR', 'EMPLOYEE'],
    async (req: NextRequest, user: any) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File | null;
            const context = formData.get('context') as string | null; // e.g. "feedback:threadId"

            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            if (file.size > MAX_SIZE) {
                return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
            }

            const bytes  = await file.arrayBuffer();
            const result = await StorageService.saveFileWithRecord(
                bytes,
                file.name,
                'feedback',
                {
                    uploadedById: user.id,
                    context: context ?? undefined,
                }
            );

            return NextResponse.json({
                url:      result.url,
                filename: file.name,
                size:     file.size,
                mimeType: file.type || result.record.mimeType,
                checksum: result.checksum,
            });
        } catch (error) {
            console.error('Feedback upload error:', error);
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }
    }
);
