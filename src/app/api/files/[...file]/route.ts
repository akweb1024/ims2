import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

// Path prefixes that are consumed by PUBLIC pages and must stay fetchable
// without a session:
// - publications/…            article PDFs on the public journal pages
// - users/profile_pictures/…  editorial-board / author photos on public pages
// Everything else (hr/proofs, feedback, think-tank, documents, general, …)
// is dashboard-only content and requires an authenticated user.
const PUBLIC_PREFIXES = ['publications/', 'users/profile_pictures/'];

// Types that are safe to render inline in a browser. Everything else is
// forced to download — this blocks stored-XSS via uploaded SVG/HTML.
const INLINE_SAFE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
]);

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ file: string[] }> }
) {
    try {
        const { file } = await context.params;
        const filePath = file.join('/');

        const isPublic = PUBLIC_PREFIXES.some((prefix) => filePath.startsWith(prefix));

        if (!isPublic) {
            const user = await getAuthenticatedUser();
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const { buffer, contentType } = await StorageService.readFile(filePath);

        const headers: Record<string, string> = {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': isPublic
                ? 'public, max-age=31536000, immutable'
                : 'private, max-age=0, no-store',
        };
        if (!INLINE_SAFE_TYPES.has(contentType)) {
            headers['Content-Disposition'] = 'attachment';
        }

        return new Response(new Uint8Array(buffer), { headers });
    } catch (error: any) {
        console.error('File Server Error:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
