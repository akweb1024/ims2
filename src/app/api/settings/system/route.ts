import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const settings = await prisma.systemSettings.upsert({
            where: { id: 'singleton' },
            update: {},
            create: {
                id: 'singleton',
                companyName: 'STM Journal Solutions',
                supportEmail: 'support@stm.com',
                defaultCurrency: 'INR'
            }
        });

        return NextResponse.json(settings);
    } catch (error: any) {
        console.error('System Settings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { companyName, supportEmail, defaultCurrency, maintenanceMode } = body;

        const settings = await prisma.systemSettings.update({
            where: { id: 'singleton' },
            data: {
                ...(companyName && { companyName }),
                ...(supportEmail && { supportEmail }),
                ...(defaultCurrency && { defaultCurrency }),
                ...(maintenanceMode !== undefined && { maintenanceMode })
            }
        });

        return NextResponse.json(settings);
    } catch (error: any) {
        console.error('System Settings PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
