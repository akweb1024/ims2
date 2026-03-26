import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { releaseInvoiceStockReservations } from '@/lib/invoice-stock-reservation';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { status } = body;

        // Only allow status update to CANCELLED or PAID (if Manual?)
        // For now, let's just allow toggling status for admins if needed, mostly Void/Cancel.

        const updatedInvoice = await prisma.$transaction(async (tx: any) => {
            if (status === 'CANCELLED' || status === 'VOID') {
                await releaseInvoiceStockReservations(tx, {
                    invoiceId: id,
                    userId: decoded.id,
                    reason: `Invoice marked ${status}`,
                });
            }

            return tx.invoice.update({
                where: { id },
                data: { status }
            });
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'update_status',
                entity: 'invoice',
                entityId: id,
                changes: JSON.stringify({ status })
            }
        });

        return NextResponse.json(updatedInvoice);

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }
}
