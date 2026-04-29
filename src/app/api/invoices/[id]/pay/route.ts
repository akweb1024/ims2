import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { consumeInvoiceStockReservations } from '@/lib/invoice-stock-reservation';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

const paymentSchema = z.object({
  amount: z.number().finite().positive('Payment amount must be greater than zero'),
  paymentMethod: z.string().trim().min(1, 'paymentMethod is required'),
  transactionId: z.string().trim().max(255).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
  async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { amount, paymentMethod, transactionId, notes } = paymentSchema.parse(body);

      const result = await prisma.$transaction(async (tx: any) => {
        const invoice = await tx.invoice.findFirst({
          where: {
            id,
            ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
          },
          include: {
            payments: true,
            subscription: true,
          },
        });

        if (!invoice) throw new ValidationError('Invoice not found');
        if (invoice.status === 'PAID') throw new ValidationError('Invoice is already paid');

        const payment = await tx.payment.create({
          data: {
            invoiceId: id,
            amount,
            paymentMethod,
            paymentDate: new Date(),
            transactionId: transactionId || null,
            notes: notes || null,
          },
        });

        const totalPaid = [...invoice.payments.map((p: any) => p.amount), amount].reduce((a, b) => a + b, 0);
        const newStatus = totalPaid >= invoice.total ? 'PAID' : 'PARTIALLY_PAID';

        const updatedInvoice = await tx.invoice.update({
          where: { id },
          data: {
            status: newStatus,
            paidDate: newStatus === 'PAID' ? new Date() : null,
          },
        });

        if (newStatus === 'PAID') {
          await consumeInvoiceStockReservations(tx, id);
        }

        if (newStatus === 'PAID' && invoice.subscription?.status === 'PENDING_PAYMENT') {
          const subscriptionId = invoice.subscriptionId;
          await tx.subscription.update({
            where: { id: subscriptionId },
            data: { status: 'ACTIVE' },
          });

          const subItems = await tx.subscriptionItem.findMany({
            where: { subscriptionId },
            include: { subscription: { select: { customerProfileId: true } } },
          });

          const customer = await tx.customerProfile.findUnique({
            where: { id: subItems[0]?.subscription?.customerProfileId },
            select: { userId: true },
          });

          if (customer?.userId) {
            for (const item of subItems) {
              if (item.courseId) {
                await tx.courseEnrollment.upsert({
                  where: {
                    courseId_userId: {
                      courseId: item.courseId,
                      userId: customer.userId,
                    },
                  },
                  update: {},
                  create: {
                    courseId: item.courseId,
                    userId: customer.userId,
                  },
                });
              }
              if (item.workshopId) {
                await tx.workshopEnrollment.upsert({
                  where: {
                    workshopId_userId: {
                      workshopId: item.workshopId,
                      userId: customer.userId,
                    },
                  },
                  update: {},
                  create: {
                    workshopId: item.workshopId,
                    userId: customer.userId,
                  },
                });
              }
            }
          }
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'payment_recorded',
            entity: 'invoice',
            entityId: id,
            changes: JSON.stringify({ amount, status: newStatus, transactionId: transactionId || null }),
          },
        });

        return { payment, invoice: updatedInvoice };
      });

      const customerProfileId = result.invoice.customerProfileId;

      if (customerProfileId) {
        const customer = await prisma.customerProfile.findUnique({
          where: { id: customerProfileId },
          select: { userId: true, name: true, primaryEmail: true },
        });

        if (customer?.userId) {
          const { createNotification } = await import('@/lib/notifications');
          await createNotification({
            userId: customer.userId,
            title: result.invoice.status === 'PAID' ? 'Payment Received' : 'Partial Payment Recorded',
            message: `A payment of ${result.invoice.currency} ${amount.toLocaleString()} has been recorded for invoice ${result.invoice.invoiceNumber}.`,
            type: result.invoice.status === 'PAID' ? 'SUCCESS' : 'INFO',
            link: `/dashboard/crm/invoices/${id}`,
          });
        }

        if (customer?.primaryEmail) {
          const { sendEmail, EmailTemplates } = await import('@/lib/email');
          const template = EmailTemplates.paymentReceived(
            customer.name,
            `${result.invoice.currency} ${amount.toLocaleString()}`,
            result.invoice.invoiceNumber,
          );

          await sendEmail({
            to: customer.primaryEmail,
            ...template,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Payment recorded successfully',
        data: result,
      });
    } catch (error: any) {
      logger.error('Payment API Error', error, { path: req.nextUrl.pathname });
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
