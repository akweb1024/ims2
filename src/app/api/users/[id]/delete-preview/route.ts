import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getUserDeletionPreview } from '@/lib/user-deletion';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (_req: NextRequest, _user, { params }: any) => {
        try {
            const { id } = await params;
            const preview = await getUserDeletionPreview(id);
            return NextResponse.json(preview);
        } catch (error: any) {
            return createErrorResponse(error?.message || 'Failed to build delete preview', 500);
        }
    }
);
