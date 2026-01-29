import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs are required' }, { status: 400 });
        }

        // Delete agencies (CustomerProfiles and their Users)
        await prisma.$transaction(async (tx) => {
            const profiles = await tx.customerProfile.findMany({
                where: {
                    id: { in: ids },
                    customerType: 'AGENCY'
                },
                select: { userId: true }
            });

            const userIds = profiles.map(p => p.userId);

            if (userIds.length > 0) {
                await tx.user.deleteMany({
                    where: { id: { in: userIds } }
                });
            }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('Bulk Delete Agencies Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
