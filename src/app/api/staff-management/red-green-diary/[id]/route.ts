import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        const entry = await prisma.redGreenDiary.findUnique({
            where: { id }
        });

        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        await prisma.redGreenDiary.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Entry deleted successfully' });
    } catch (error) {
        console.error('Delete Red-Green Diary Error:', error);
        return createErrorResponse(error);
    }
}
