import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { authorizedRoute } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';

// POST /api/files/sync — reconcile disk files with DB FileRecord table
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user: any) => {
        try {
            const result = await StorageService.syncScan(user.id);

            return NextResponse.json({
                success: true,
                message: `Sync complete. Found ${result.found} files on disk, inserted ${result.inserted} new records, ${result.missing} missing from disk.`,
                ...result,
            });
        } catch (error) {
            console.error('Sync error:', error);
            return NextResponse.json({ error: 'Sync failed', detail: String(error) }, { status: 500 });
        }
    }
);
