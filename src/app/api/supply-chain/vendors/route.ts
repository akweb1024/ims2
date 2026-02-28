import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createAuditLog } from '@/lib/notifications';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        const where: any = {};
        if (user.companyId) {
            where.companyId = user.companyId;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const vendors = await prisma.vendor.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { purchaseOrders: true }
                }
            }
        });

        return NextResponse.json(vendors);
    } catch (error: any) {
        console.error('Fetch vendors error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const companyId = user.companyId || data.companyId;

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        if (!data.name) {
            return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
        }

        const vendor = await prisma.vendor.create({
            data: {
                companyId,
                name: data.name,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                address: data.address,
                taxId: data.taxId,
                status: data.status || 'ACTIVE'
            }
        });

        await createAuditLog({
            userId: user.id,
            action: 'CREATE',
            entity: 'VENDOR',
            entityId: vendor.id,
            changes: { name: vendor.name },
            ipAddress: req.headers.get('x-forwarded-for') || 'API'
        });

        return NextResponse.json(vendor, { status: 201 });
    } catch (error: any) {
        console.error('Create vendor error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
