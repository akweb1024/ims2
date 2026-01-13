import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'EXECUTIVE', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch original subscription
        const original = await prisma.subscription.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!original) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

        // 3. Prepare renewal data
        const startDate = new Date(original.endDate);
        startDate.setDate(startDate.getDate() + 1); // Start the day after

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year duration by default

        // 4. Create renewal in transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create new subscription
            const renewal = await tx.subscription.create({
                data: {
                    customerProfileId: original.customerProfileId,
                    salesChannel: original.salesChannel,
                    agencyId: original.agencyId,
                    salesExecutiveId: decoded.id,
                    startDate,
                    endDate,
                    autoRenew: original.autoRenew,
                    status: 'PENDING_PAYMENT',
                    subtotal: original.subtotal,
                    discount: original.discount,
                    tax: original.tax,
                    total: original.total,
                    parentSubscriptionId: original.id,
                    items: {
                        create: original.items.map(item => ({
                            journalId: item.journalId,
                            planId: item.planId,
                            quantity: item.quantity,
                            seats: item.seats,
                            price: item.price
                        }))
                    }
                }
            });

            // Create Invoice
            const invoiceNumber = `REN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await tx.invoice.create({
                data: {
                    subscriptionId: renewal.id,
                    invoiceNumber,
                    amount: renewal.total,
                    tax: 0,
                    total: renewal.total,
                    status: 'UNPAID',
                    dueDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000)
                }
            });

            // Log Audit
            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'renew',
                    entity: 'subscription',
                    entityId: renewal.id,
                    changes: JSON.stringify({ parentId: original.id })
                }
            });

            return renewal;
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Subscription Renewal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
