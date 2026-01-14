import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ file: string[] }> }
) {
    try {
        // Optional: Add authentication check here if you want to protect all files
        // For now, mirroring public behavior (public access if URL is known)
        // const user = await getAuthenticatedUser();
        // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const params = await context.params;
        const filePath = params.file.join('/');

        const { buffer, contentType } = await StorageService.readFile(filePath);

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });


    } catch (error: any) {
        console.error('File Server Error:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
