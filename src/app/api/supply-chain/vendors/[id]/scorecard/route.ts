import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { companyScopeWhere } from '@/lib/company-scope';
import { buildVendorScorecard, vendorGrade } from '@/lib/supply-chain/vendor-scorecard';

/**
 * Supplier performance, derived on read.
 *
 * Nothing is stored: on-time rate, fill rate and rejection rate all fall out of the vendor's
 * purchase orders and the receipts against them, so the scorecard cannot drift from the records
 * it describes.
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const vendor = await prisma.vendor.findFirst({
            where: { id, ...companyScopeWhere(user) },
            select: { id: true, name: true, status: true, email: true, phone: true },
        });

        if (!vendor) {
            return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
        }

        const orders = await prisma.purchaseOrder.findMany({
            where: { vendorId: id, ...companyScopeWhere(user) },
            select: {
                id: true,
                poNumber: true,
                status: true,
                expectedDate: true,
                totalAmount: true,
                items: { select: { quantity: true, quantityReceived: true } },
                goodsReceipts: {
                    select: {
                        receivedDate: true,
                        lines: { select: { quantityReceived: true, quantityRejected: true, unitCost: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const scorecard = buildVendorScorecard(
            orders.map((order) => ({
                id: order.id,
                status: order.status,
                expectedDate: order.expectedDate,
                orderedQuantity: order.items.reduce((t, i) => t + i.quantity, 0),
                receivedQuantity: order.items.reduce((t, i) => t + i.quantityReceived, 0),
                totalAmount: order.totalAmount,
                receipts: order.goodsReceipts,
            })),
        );

        return NextResponse.json({
            vendor,
            scorecard,
            grade: vendorGrade(scorecard.overallScore),
            orders: orders.map((order) => ({
                id: order.id,
                poNumber: order.poNumber,
                status: order.status,
                expectedDate: order.expectedDate,
                totalAmount: order.totalAmount,
                orderedQuantity: order.items.reduce((t, i) => t + i.quantity, 0),
                receivedQuantity: order.items.reduce((t, i) => t + i.quantityReceived, 0),
                receiptCount: order.goodsReceipts.length,
            })),
        });
    } catch (error: any) {
        console.error('Vendor scorecard error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
