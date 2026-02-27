import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId') || (decoded as any).companyId;

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        const brands = await prisma.brand.findMany({
            where: { companyId },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(brands);
    } catch (error) {
        logger.error('Fetch Brands Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, companyId, logoUrl, companyLogoUrl, tagline, address, email, website } = body;

        if (!name || !companyId) {
            return NextResponse.json({ error: 'Name and Company ID are required' }, { status: 400 });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                companyId,
                logoUrl,
                companyLogoUrl,
                tagline,
                address,
                email,
                website
            }
        });

        return NextResponse.json(brand);
    } catch (error) {
        logger.error('Create Brand Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
