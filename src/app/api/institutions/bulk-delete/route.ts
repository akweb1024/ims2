import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs are required' }, { status: 400 });
        }

        const result = await prisma.institution.updateMany({
            where: {
                id: { in: ids },
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
                isActive: true
            },
            data: { isActive: false }
        });

        return NextResponse.json({ success: true, count: result.count, action: 'deactivated' });
    } catch (error: any) {
        console.error('Bulk Delete Institutions Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
