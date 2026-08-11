import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createAuditLog } from '@/lib/notifications';
import { companyScopeWhere } from '@/lib/company-scope';
import { planReceipt, ReceivingError } from '@/lib/supply-chain/receiving';
import { applyReceiptToPosition } from '@/lib/supply-chain/valuation';

/**
 * Record a delivery against a purchase order.
 *
 * This is the seam that was missing: a PO used to be "received" by flipping its status string,
 * which moved no stock and captured no cost. One call now does the whole thing atomically —
 * writes the receipt, moves inventory, updates each item's weighted average cost, leaves a
 * stock-movement ledger entry, and advances the order to PARTIALLY_RECEIVED or RECEIVED.
 *
 * Everything is inside a single transaction. A receipt that half-applied would leave stock and
 * the order permanently disagreeing, with no way to tell which was right.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await req.json();

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id, ...companyScopeWhere(user) },
            include: { items: true, vendor: { select: { name: true } } },
        });

        if (!purchaseOrder) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
        }

        let plan;
        try {
            plan = planReceipt(purchaseOrder.items, body.lines ?? [], purchaseOrder.status);
        } catch (err) {
            if (err instanceof ReceivingError) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
            throw err;
        }

        const receipt = await prisma.$transaction(async (tx) => {
            // Receipt numbers are sequential per company, counted inside the transaction so two
            // concurrent receipts cannot land on the same number.
            const count = await tx.goodsReceipt.count({ where: { companyId: purchaseOrder.companyId } });
            const receiptNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

            const created = await tx.goodsReceipt.create({
                data: {
                    companyId: purchaseOrder.companyId,
                    purchaseOrderId: purchaseOrder.id,
                    receiptNumber,
                    receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
                    receivedBy: user.id,
                    warehouseId: body.warehouseId || null,
                    notes: body.notes || null,
                    lines: {
                        create: plan.lines.map((line) => ({
                            purchaseOrderItemId: line.purchaseOrderItemId,
                            inventoryItemId: line.inventoryItemId,
                            quantityReceived: line.quantityReceived,
                            quantityRejected: line.quantityRejected,
                            unitCost: line.unitCost,
                            notes: line.notes,
                        })),
                    },
                },
                include: { lines: true },
            });

            for (const line of plan.lines) {
                await tx.purchaseOrderItem.update({
                    where: { id: line.purchaseOrderItemId },
                    data: { quantityReceived: line.newQuantityReceived },
                });

                // A PO line need not point at a stocked item — services and one-off purchases
                // are received for the record without moving inventory.
                if (!line.inventoryItemId || line.quantityReceived <= 0) continue;

                const item = await tx.inventoryItem.findUnique({
                    where: { id: line.inventoryItemId },
                    select: { id: true, quantity: true, averageCost: true },
                });
                if (!item) continue;

                const next = applyReceiptToPosition(
                    { quantity: item.quantity, averageCost: item.averageCost },
                    line.quantityReceived,
                    line.unitCost,
                );

                await tx.inventoryItem.update({
                    where: { id: item.id },
                    data: { quantity: next.quantity, averageCost: next.averageCost },
                });

                await tx.stockMovement.create({
                    data: {
                        inventoryItemId: item.id,
                        type: 'PURCHASE_RECEIPT',
                        quantity: line.quantityReceived,
                        unitCost: line.unitCost,
                        referenceId: created.id,
                        notes: `${receiptNumber} · PO ${purchaseOrder.poNumber}`,
                        createdBy: user.id,
                    },
                });
            }

            await tx.purchaseOrder.update({
                where: { id: purchaseOrder.id },
                data: { status: plan.nextStatus },
            });

            return created;
        });

        await createAuditLog({
            userId: user.id,
            action: 'CREATE',
            entity: 'GOODS_RECEIPT',
            entityId: receipt.id,
            changes: {
                receiptNumber: receipt.receiptNumber,
                poNumber: purchaseOrder.poNumber,
                vendor: purchaseOrder.vendor.name,
                quantityReceived: plan.totalQuantityReceived,
                quantityRejected: plan.totalQuantityRejected,
                value: plan.totalReceivedValue,
                orderStatus: { from: purchaseOrder.status, to: plan.nextStatus },
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'API',
        });

        return NextResponse.json(
            { receipt, orderStatus: plan.nextStatus, totalReceivedValue: plan.totalReceivedValue },
            { status: 201 },
        );
    } catch (error: any) {
        console.error('Goods receipt error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/** Receipts already recorded against this order. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const receipts = await prisma.goodsReceipt.findMany({
            where: { purchaseOrderId: id, ...companyScopeWhere(user) },
            include: {
                lines: { include: { inventoryItem: { select: { name: true, sku: true } } } },
                receiver: { select: { name: true, email: true } },
                warehouse: { select: { name: true } },
            },
            orderBy: { receivedDate: 'desc' },
        });

        return NextResponse.json(receipts);
    } catch (error: any) {
        console.error('List goods receipts error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
