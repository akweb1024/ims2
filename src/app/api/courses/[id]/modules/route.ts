import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id: courseId } = await props.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { title, order } = body;

        const courseModule = await (prisma as any).courseModule.create({
            data: {
                courseId,
                title,
                order: order || 0
            }
        });

        return NextResponse.json(courseModule);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
