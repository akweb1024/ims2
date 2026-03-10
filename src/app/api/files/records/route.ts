import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const dynamic = 'force-dynamic';

// GET /api/files/records — list uploaded files with filter & pagination
export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        const { searchParams } = new URL(req.url);
        const page     = Math.max(1,   parseInt(searchParams.get('page')     || '1'));
        const limit    = Math.min(100, parseInt(searchParams.get('limit')    || '20'));
        const category = searchParams.get('category') || undefined;
        const search   = searchParams.get('search')   || undefined;
        const myOnly   = searchParams.get('myOnly') === 'true';

        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

        const where: any = {};
        if (category) where.category = category;
        if (search)   where.filename = { contains: search, mode: 'insensitive' };
        if (myOnly || !isAdmin) where.uploadedById = user.id;

        const [total, files] = await Promise.all([
            prisma.fileRecord.count({ where }),
            prisma.fileRecord.findMany({
                where,
                select: {
                    id: true, filename: true, storedName: true, url: true,
                    mimeType: true, size: true, category: true, context: true,
                    checksum: true, syncedAt: true, createdAt: true,
                    uploadedBy: { select: { id: true, name: true, email: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);

        return NextResponse.json({
            files,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Files list error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
