import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Razorpay from 'razorpay';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';
import { getRazorpaySyncAccounts } from '@/lib/razorpay';
import { settlementBreakdown } from '@/lib/finance/reconciliation';

export async function POST() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentSyncAt = new Date();
        let totalSynced = 0;

        const accountsToSync = await getRazorpaySyncAccounts();

        if (accountsToSync.length === 0) {
            return NextResponse.json({ error: 'No Razorpay credentials found' }, { status: 404 });
        }

        logger.info(`Starting Multi-Account Sync`, { accountCount: accountsToSync.length });

        // 2. Loop through each account and sync
        for (const account of accountsToSync) {
            try {
                // Determine last sync time for this account (or global)
                // Ideally we should track lastSync per account, but schema is simple.
                // We'll use the global RazorpaySync table for now, effectively syncing from the oldest common time or just overlap.
                // Better approach: sync from 1 day ago if nothing specified, or use the global last sync.

                const lastSync = await prisma.razorpaySync.findFirst({
                    where: { status: 'SUCCESS' },
                    orderBy: { createdAt: 'desc' },
                });

                const from = lastSync ? Math.floor(lastSync.lastSyncAt.getTime() / 1000) : undefined;

                // Initialize Razorpay instance manually for this account
                // We can't use the singleton 'razorpay' from lib here nicely
                const rpInstance = new Razorpay({
                    key_id: account.key_id,
                    key_secret: account.key_secret
                });

                let hasMore = true;
                let skip = 0;
                const count = 100;

                while (hasMore) {
                    const payments = await rpInstance.payments.all({
                        from,
                        count,
                        skip
                    });

                    if (!payments || !payments.items || payments.items.length === 0) {
                        hasMore = false;
                        break;
                    }

                    const batch = payments.items;
                    const batchIds = batch.map((p: any) => p.id);

                    // Bulk check existing payments
                    const existingPayments = await prisma.payment.findMany({
                        where: { razorpayPaymentId: { in: batchIds } },
                        select: { razorpayPaymentId: true }
                    });
                    const existingIdSet = new Set(existingPayments.map(p => p.razorpayPaymentId));

                    for (const rpPayment of batch) {
                        if (existingIdSet.has(rpPayment.id)) continue;

                        let companyId = account.companyId; // Default to config owner

                        // Override if payment notes specify otherwise
                        if (rpPayment.notes?.company_id || rpPayment.notes?.companyId) {
                            companyId = rpPayment.notes.company_id || rpPayment.notes.companyId;
                        }

                        // Fallback: Look up by email if no company yet
                        if (!companyId && rpPayment.email) {
                            const matchedUser = await prisma.user.findUnique({
                                where: { email: rpPayment.email },
                                select: { companyId: true }
                            });
                            if (matchedUser?.companyId) companyId = matchedUser.companyId;
                        }

                        // Final Verify
                        if (companyId) {
                            const company = await prisma.company.findUnique({ where: { id: companyId } });
                            if (!company) companyId = account.companyId; // Revert to account owner if invalid
                        }

                        // Save Payment
                        const savedPayment = await prisma.payment.create({
                            data: {
                                amount: Number(rpPayment.amount) / 100, // Standardizing to units (Rupees/etc)
                                currency: rpPayment.currency || 'INR',
                                paymentMethod: rpPayment.method,
                                paymentDate: new Date(Number(rpPayment.created_at) * 1000),
                                razorpayPaymentId: rpPayment.id,
                                razorpayOrderId: rpPayment.order_id,
                                status: rpPayment.status,
                                notes: rpPayment.notes ? JSON.stringify(rpPayment.notes) : null,
                                companyId: companyId || null,
                                metadata: JSON.stringify(rpPayment)
                            },
                        });
                        totalSynced++;

                        // Record the settlement side of reconciliation. Razorpay reports `fee`
                        // and `tax` (GST on the fee) in paise alongside the payment, and we were
                        // discarding both — they are exactly what is needed to explain why a
                        // ₹42,500 sale credits ₹41,320. Only captured payments are real money.
                        if (savedPayment.companyId && rpPayment.status === 'captured') {
                            try {
                                const feeInr = Number(rpPayment.fee || 0) / 100;
                                const taxInr = Number(rpPayment.tax || 0) / 100;
                                const originalAmount = Number(rpPayment.amount) / 100;
                                const originalCurrency = rpPayment.currency || 'INR';
                                // For foreign currency Razorpay bills in the presentment currency
                                // but settles INR; fee/tax come back in the settlement currency.
                                // Without an explicit conversion on the payment we cannot invent
                                // a rate, so leave it at 1 and let reconciliation flag it.
                                const fxRate = originalCurrency === 'INR' ? 1 : 0;
                                const { grossInr, netInr } = settlementBreakdown({
                                    originalAmount, originalCurrency, fxRate: fxRate || 1, feeInr, taxInr,
                                });

                                await prisma.settlementRecord.upsert({
                                    where: { source_externalRef: { source: 'RAZORPAY', externalRef: rpPayment.id } },
                                    update: { feeInr, taxInr, netInr, grossInr },
                                    create: {
                                        companyId: savedPayment.companyId,
                                        source: 'RAZORPAY',
                                        externalRef: rpPayment.id,
                                        captureDate: new Date(Number(rpPayment.created_at) * 1000),
                                        // Razorpay settles on its own cycle; until a settlement
                                        // report says otherwise this money is in transit.
                                        settlementDate: null,
                                        originalCurrency,
                                        originalAmount,
                                        fxRate: fxRate || 1,
                                        grossInr,
                                        feeInr,
                                        taxInr,
                                        netInr,
                                        paymentId: savedPayment.id,
                                        narration: `Razorpay ${rpPayment.method || ''} ${rpPayment.email || ''}`.trim(),
                                    },
                                });
                            } catch (setErr) {
                                logger.error('Failed to record settlement for payment', setErr, { paymentId: savedPayment.id });
                            }
                        }

                        // Journal Entry
                        if (savedPayment.companyId) {
                            try {
                                await FinanceService.postPaymentJournal(savedPayment.companyId, savedPayment.id);
                            } catch (finErr) {
                                logger.error(`Failed to post journal for payment`, finErr, { paymentId: savedPayment.id });
                            }
                        }
                    }

                    if (batch.length < count) {
                        hasMore = false;
                    } else {
                        skip += count;
                        if (skip > 5000) break; // Safety
                    }
                }

            } catch (err: any) {
                logger.error(`Error syncing account`, err, { alias: account.alias });
                // Continue to next account even if one fails
            }
        }

        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: currentSyncAt,
                status: 'SUCCESS',
                syncedCount: totalSynced,
            },
        });

        return NextResponse.json({ success: true, syncedCount: totalSynced });

    } catch (error: any) {
        logger.error('Razorpay Sync Fatal Error', error);
        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: new Date(),
                status: 'FAILED',
                error: error.message,
            },
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const lastSync = await prisma.razorpaySync.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ lastSync });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
