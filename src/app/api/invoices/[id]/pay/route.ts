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
        if (!decoded || !decoded.role) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const { amount, paymentMethod, transactionId, notes } = body;

        // 3. Process Payment in Transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Fetch Invoice and its current payments
            const invoice = await tx.invoice.findUnique({
                where: { id },
                include: {
                    payments: true,
                    subscription: true
                }
            });

            if (!invoice) throw new Error('Invoice not found');
            if (invoice.status === 'PAID') throw new Error('Invoice is already paid');

            // Record new payment
            const payment = await tx.payment.create({
                data: {
                    invoiceId: id,
                    amount,
                    paymentMethod,
                    paymentDate: new Date(),
                    transactionId,
                    notes
                }
            });

            // Calculate new total paid
            const totalPaid = [...invoice.payments.map((p: any) => p.amount), amount].reduce((a, b) => a + b, 0);

            // Update Invoice Status
            let newStatus = 'PARTIALLY_PAID';
            if (totalPaid >= invoice.total) {
                newStatus = 'PAID';
            }

            const updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    status: newStatus,
                    paidDate: newStatus === 'PAID' ? new Date() : null
                }
            });

            // Update Subscription Status if fully paid and currently pending
            if (newStatus === 'PAID' && invoice.subscription?.status === 'PENDING_PAYMENT') {
                await tx.subscription.update({
                    where: { id: invoice.subscriptionId },
                    data: { status: 'ACTIVE' }
                });
            }

            // Audit Log
            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'payment_recorded',
                    entity: 'invoice',
                    entityId: id,
                    changes: JSON.stringify({ amount, status: newStatus, transactionId })
                }
            });

            return { payment, invoice: updatedInvoice };
        });

        // 4. Notify Customer
        const customerProfileId = result.invoice.customerProfileId;
        
        if (customerProfileId) {
            const customer = await prisma.customerProfile.findUnique({
                where: { id: customerProfileId },
                select: { userId: true, name: true, primaryEmail: true }
            });

            if (customer?.userId) {
                const { createNotification } = await import('@/lib/notifications');
                await createNotification({
                    userId: customer.userId,
                    title: result.invoice.status === 'PAID' ? 'Payment Received' : 'Partial Payment Recorded',
                    message: `A payment of ${result.invoice.currency} ${amount.toLocaleString()} has been recorded for invoice ${result.invoice.invoiceNumber}.`,
                    type: result.invoice.status === 'PAID' ? 'SUCCESS' : 'INFO',
                    link: `/dashboard/crm/invoices/${id}`
                });
            }

            if (customer?.primaryEmail) {
                const { sendEmail, EmailTemplates } = await import('@/lib/email');
                const template = EmailTemplates.paymentReceived(
                    customer.name,
                    `${result.invoice.currency} ${amount.toLocaleString()}`,
                    result.invoice.invoiceNumber
                );

                await sendEmail({
                    to: customer.primaryEmail,
                    ...template
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Payment recorded successfully',
            data: result
        });

    } catch (error: any) {
        console.error('Payment API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
