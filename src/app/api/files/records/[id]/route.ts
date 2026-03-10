import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StorageService } from '@/lib/storage';
import { authorizedRoute } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';

// DELETE /api/files/records/[id] — delete a file record and its disk file
export const DELETE = authorizedRoute([], async (
    req: NextRequest,
    user: any,
    context: { params: Promise<{ id: string }> }
) => {
    try {
        const { id } = await context.params;

        const record = await prisma.fileRecord.findUnique({ where: { id } });
        if (!record) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
        if (!isAdmin && record.uploadedById !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await StorageService.deleteFile(record.url, record.id);

        return NextResponse.json({ success: true, deleted: id });
    } catch (error) {
        console.error('File delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
