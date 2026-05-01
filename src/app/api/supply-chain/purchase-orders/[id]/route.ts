import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createAuditLog } from '@/lib/notifications';

const ALLOWED_STATUSES = new Set(['DRAFT', 'ISSUED', 'PARTIAL', 'COMPLETED']);

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
            include: {
                vendor: { select: { name: true, contactName: true, email: true, status: true } },
                items: true,
            },
        });

        if (!purchaseOrder) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        return NextResponse.json(purchaseOrder);
    } catch (error: any) {
        console.error('Fetch PO error:', error);
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
        const body = await req.json();

        const existing = await prisma.purchaseOrder.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
            select: { id: true, poNumber: true, status: true, expectedDate: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        const nextStatus = body.status ? String(body.status).toUpperCase() : undefined;
        if (nextStatus && !ALLOWED_STATUSES.has(nextStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const expectedDate =
            body.expectedDate === undefined
                ? undefined
                : body.expectedDate
                    ? new Date(body.expectedDate)
                    : null;

        const updated = await prisma.purchaseOrder.update({
            where: { id: existing.id },
            data: {
                status: nextStatus,
                expectedDate,
            },
            include: {
                vendor: { select: { name: true, contactName: true, email: true, status: true } },
                items: true,
            },
        });

        await createAuditLog({
            userId: user.id,
            action: 'UPDATE',
            entity: 'PURCHASE_ORDER',
            entityId: updated.id,
            changes: {
                poNumber: existing.poNumber,
                from: { status: existing.status, expectedDate: existing.expectedDate },
                to: { status: updated.status, expectedDate: updated.expectedDate },
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'API',
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update PO error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

