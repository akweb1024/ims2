import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { StorageService, FileCategory } from '@/lib/storage';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File;

        // Optional category and metadata
        const category = (formData.get('category') as FileCategory) || 'other';
        const journalId = formData.get('journalId') as string;
        const volumeNumber = formData.get('volumeNumber') ? parseInt(formData.get('volumeNumber') as string) : undefined;
        const issueNumber = formData.get('issueNumber') ? parseInt(formData.get('issueNumber') as string) : undefined;
        const articleId = formData.get('articleId') as string;

        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        const bytes = await file.arrayBuffer();

        const { url } = await StorageService.saveFile(
            bytes,
            file.name,
            category,
            { journalId, volumeNumber, issueNumber, articleId }
        );

        return NextResponse.json({ url });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

