import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { ensureDefaultCouriers } from '@/lib/dispatch';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        // Public? Probably not.
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureDefaultCouriers();

        const couriers = await prisma.courier.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(couriers);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, website, apiEndpoint } = body;

        const courier = await prisma.courier.create({
            data: {
                name,
                website,
                apiEndpoint,
                isActive: true
            }
        });

        return NextResponse.json(courier);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
