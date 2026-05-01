import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createAuditLog } from '@/lib/notifications';

const ALLOWED_STATUSES = new Set(['ACTIVE', 'INACTIVE']);

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const vendor = await prisma.vendor.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
            include: {
                _count: { select: { purchaseOrders: true } },
            },
        });

        if (!vendor) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }

        return NextResponse.json(vendor);
    } catch (error: any) {
        console.error('Fetch vendor error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const data = await req.json();

        const existing = await prisma.vendor.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }

        if (data.status && !ALLOWED_STATUSES.has(String(data.status).toUpperCase())) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (data.name !== undefined && !String(data.name).trim()) {
            return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
        }

        const updated = await prisma.vendor.update({
            where: { id: existing.id },
            data: {
                name: data.name !== undefined ? String(data.name).trim() : undefined,
                contactName: data.contactName !== undefined ? (data.contactName ? String(data.contactName).trim() : null) : undefined,
                email: data.email !== undefined ? (data.email ? String(data.email).trim() : null) : undefined,
                phone: data.phone !== undefined ? (data.phone ? String(data.phone).trim() : null) : undefined,
                address: data.address !== undefined ? (data.address ? String(data.address).trim() : null) : undefined,
                taxId: data.taxId !== undefined ? (data.taxId ? String(data.taxId).trim() : null) : undefined,
                status: data.status ? String(data.status).toUpperCase() : undefined,
            },
        });

        await createAuditLog({
            userId: user.id,
            action: 'UPDATE',
            entity: 'VENDOR',
            entityId: updated.id,
            changes: {
                from: {
                    name: existing.name,
                    contactName: existing.contactName,
                    email: existing.email,
                    phone: existing.phone,
                    address: existing.address,
                    taxId: existing.taxId,
                    status: existing.status,
                },
                to: {
                    name: updated.name,
                    contactName: updated.contactName,
                    email: updated.email,
                    phone: updated.phone,
                    address: updated.address,
                    taxId: updated.taxId,
                    status: updated.status,
                },
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'API',
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update vendor error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

