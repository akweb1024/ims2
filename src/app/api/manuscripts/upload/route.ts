import { NextRequest, NextResponse } from 'next/server';
import { StorageService, FileCategory } from '@/lib/storage';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    [], // Allow any authenticated user
    async (req: NextRequest, user) => {
        try {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            const category = (formData.get('category') as FileCategory) || 'publications';
            const journalId = formData.get('journalId') as string;
            const articleId = formData.get('articleId') as string;

            if (!file) {
                return createErrorResponse('No file provided', 400);
            }

            // Convert File to Buffer
            const buffer = Buffer.from(await file.arrayBuffer());

            // Save file using StorageService
            const { url, path } = await StorageService.saveFile(
                buffer,
                file.name,
                category,
                { journalId, articleId }
            );

            return NextResponse.json({
                success: true,
                url,
                filename: file.name
            });
        } catch (error) {
            console.error('File upload error:', error);
            return createErrorResponse(error);
        }
    }
);
