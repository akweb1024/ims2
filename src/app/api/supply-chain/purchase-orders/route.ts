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
        const status = searchParams.get('status');

        const where: any = {};
        if (user.companyId) {
            where.companyId = user.companyId;
        }
        
        if (status && status !== 'ALL') {
             where.status = status;
        }

        if (search) {
            where.OR = [
                { poNumber: { contains: search, mode: 'insensitive' } },
                { vendor: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: { select: { name: true, contactName: true, email: true } },
                items: true,
            }
        });

        return NextResponse.json(purchaseOrders);
    } catch (error: any) {
        console.error('Fetch POs error:', error);
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

        if (!companyId || !data.vendorId || !data.items || data.items.length === 0) {
            return NextResponse.json({ error: 'Company ID, Vendor, and Items are required' }, { status: 400 });
        }

        // Auto-generate PO Number if missing
        const poNumber = data.poNumber || `PO-${Date.now().toString().slice(-6)}`;
        
        let calculatedTotal = 0;
        const formattedItems = data.items.map((item: any) => {
            const total = item.quantity * item.unitPrice;
            calculatedTotal += total;
            return {
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: total,
                inventoryItemId: item.inventoryItemId || null
            };
        });

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                companyId,
                vendorId: data.vendorId,
                poNumber: poNumber,
                status: data.status || 'DRAFT',
                expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
                totalAmount: calculatedTotal,
                items: {
                    create: formattedItems
                }
            },
            include: {
                vendor: true
            }
        });

        await createAuditLog({
            userId: user.id,
            action: 'CREATE',
            entity: 'PURCHASE_ORDER',
            entityId: purchaseOrder.id,
            changes: { poNumber: purchaseOrder.poNumber, total: calculatedTotal },
            ipAddress: req.headers.get('x-forwarded-for') || 'API'
        });

        return NextResponse.json(purchaseOrder, { status: 201 });
    } catch (error: any) {
        console.error('Create PO error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
