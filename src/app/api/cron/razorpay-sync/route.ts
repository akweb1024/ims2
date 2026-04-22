import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Razorpay from 'razorpay';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // Check for authorization (Optional: CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    const authUser = await getAuthenticatedUser();

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Fallback: check if it's a valid user session for manual sync from UI
        if (!authUser && process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const currentSyncAt = new Date();
        let syncedCount = 0;
        let skippedCount = 0;

        // 1. Fetch ALL Razorpay Configurations (Company-specific)
        const allConfigs = await prisma.appConfiguration.findMany({
            where: {
                category: 'PAYMENT_GATEWAY',
                key: { startsWith: 'RAZORPAY_KEY_ID' },
                isActive: true
            }
        });

        const accountsToSync = [];

        if (allConfigs.length > 0) {
            for (const config of allConfigs) {
                const secretKey = config.key.replace('ID', 'SECRET');
                const secretConfig = await prisma.appConfiguration.findFirst({
                    where: {
                        companyId: config.companyId,
                        category: 'PAYMENT_GATEWAY',
                        key: secretKey,
                        isActive: true
                    }
                });

                if (secretConfig) {
                    accountsToSync.push({
                        key_id: config.value,
                        key_secret: secretConfig.value,
                        companyId: config.companyId,
                        alias: config.key
                    });
                }
            }
        } else if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            accountsToSync.push({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
                companyId: null,
                alias: 'ENV_DEFAULT'
            });
        }

        if (accountsToSync.length === 0) {
            return NextResponse.json({ error: 'No credentials found' }, { status: 404 });
        }

        // 2. Sync Logic
        for (const account of accountsToSync) {
            try {
                logger.info(`Processing Razorpay sync for account`, { alias: account.alias, companyId: account.companyId });

                // 2.1 Determine "From" point per account (Self-Correcting)
                // We look for the latest payment recorded in our DB for this account's company
                // This is much more robust than relying on a global sync timestamp.
                const latestPayment = await prisma.payment.findFirst({
                    where: { 
                        companyId: account.companyId,
                        razorpayPaymentId: { not: null }
                    },
                    orderBy: { paymentDate: 'desc' }
                });

                // Use 1-hour overlap for safety, or 30 days if no payments found
                const from = latestPayment 
                    ? Math.floor(latestPayment.paymentDate.getTime() / 1000) - 3600 
                    : Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

                const rpInstance = new Razorpay({
                    key_id: account.key_id,
                    key_secret: account.key_secret
                });

                let hasMore = true;
                let skip = 0;
                const count = 100;
                let accountSyncedCount = 0;

                while (hasMore) {
                    const payments: any = await rpInstance.payments.all({
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

                    const existingPayments = await prisma.payment.findMany({
                        where: { razorpayPaymentId: { in: batchIds } },
                        select: { razorpayPaymentId: true }
                    });
                    const existingIdSet = new Set(existingPayments.map(p => p.razorpayPaymentId));

                    for (const rpPayment of batch) {
                        if (existingIdSet.has(rpPayment.id)) {
                            skippedCount++;
                            continue;
                        }

                        let companyId = account.companyId;

                        if (rpPayment.notes?.company_id || rpPayment.notes?.companyId) {
                            companyId = rpPayment.notes.company_id || rpPayment.notes.companyId;
                        }

                        if (!companyId && rpPayment.email) {
                            const userMatch = await prisma.user.findUnique({
                                where: { email: rpPayment.email },
                                select: { companyId: true }
                            });
                            if (userMatch?.companyId) companyId = userMatch.companyId;
                        }

                        if (companyId) {
                            const companyMatch = await prisma.company.findUnique({ where: { id: companyId } });
                            if (!companyMatch) companyId = account.companyId;
                        }

                        const savedPayment = await prisma.payment.create({
                            data: {
                                amount: rpPayment.amount / 100,
                                currency: rpPayment.currency || 'INR',
                                paymentMethod: rpPayment.method,
                                paymentDate: new Date(rpPayment.created_at * 1000),
                                razorpayPaymentId: rpPayment.id,
                                razorpayOrderId: rpPayment.order_id,
                                status: rpPayment.status,
                                notes: rpPayment.notes ? JSON.stringify(rpPayment.notes) : null,
                                metadata: JSON.stringify(rpPayment),
                                companyId: companyId || null,
                            },
                        });
                        syncedCount++;
                        accountSyncedCount++;

                        // Post Journal
                        if (savedPayment.companyId) {
                            try {
                                await FinanceService.postPaymentJournal(savedPayment.companyId, savedPayment.id);
                            } catch (finErr) {
                                logger.error(`Failed to post journal`, finErr, { paymentId: savedPayment.id });
                            }
                        }
                    }

                    if (batch.length < count) {
                        hasMore = false;
                    } else {
                        skip += count;
                        if (skip > 5000) break;
                    }
                }
                
                logger.info(`Account sync completed`, { alias: account.alias, synced: accountSyncedCount });
            } catch (accErr) {
                logger.error(`Failed to sync account`, accErr, { alias: account.alias });
            }
        }

        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: currentSyncAt,
                status: 'SUCCESS',
                syncedCount,
            },
        });

        logger.info('Razorpay sync completed', { syncedCount, skippedCount });

        return NextResponse.json({
            success: true,
            syncedCount,
            skippedCount,
            nextSyncScheduled: new Date(Date.now() + 3600000)
        });
    } catch (error: any) {
        logger.error('Razorpay Sync Error', error);
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

