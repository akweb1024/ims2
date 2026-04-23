import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';

const SYNC_INTERVAL_MS = Number(process.env.RAZORPAY_SYNC_INTERVAL_MS || 60 * 60 * 1000);
const ADVISORY_LOCK_KEY = 987654321;

type SyncTrigger = 'manual' | 'cron' | 'scheduler';

export type RazorpaySyncResult = {
    success: boolean;
    syncedCount: number;
    skippedCount: number;
    skipped?: boolean;
    message?: string;
    nextSyncScheduled: Date;
};

type PerformRazorpaySyncOptions = {
    force?: boolean;
    trigger?: SyncTrigger;
};

async function acquireSyncLock() {
    const result = await prisma.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS locked
    `;

    return Boolean(result[0]?.locked);
}

async function releaseSyncLock() {
    try {
        await prisma.$queryRaw`
            SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})
        `;
    } catch (error) {
        logger.warn('Failed to release Razorpay sync advisory lock', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getAccountsToSync() {
    const allConfigs = await prisma.appConfiguration.findMany({
        where: {
            category: 'PAYMENT_GATEWAY',
            key: { startsWith: 'RAZORPAY_KEY_ID' },
            isActive: true,
        },
    });

    const accountsToSync: Array<{
        key_id: string;
        key_secret: string;
        companyId: string | null;
        alias: string;
    }> = [];

    if (allConfigs.length > 0) {
        for (const config of allConfigs) {
            const secretKey = config.key.replace('ID', 'SECRET');
            const secretConfig = await prisma.appConfiguration.findFirst({
                where: {
                    companyId: config.companyId,
                    category: 'PAYMENT_GATEWAY',
                    key: secretKey,
                    isActive: true,
                },
            });

            if (secretConfig) {
                accountsToSync.push({
                    key_id: config.value,
                    key_secret: secretConfig.value,
                    companyId: config.companyId,
                    alias: config.key,
                });
            }
        }
    } else if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        accountsToSync.push({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
            companyId: null,
            alias: 'ENV_DEFAULT',
        });
    }

    return accountsToSync;
}

async function shouldSkipSync(force = false) {
    if (force) {
        return false;
    }

    const lastSuccess = await prisma.razorpaySync.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { lastSyncAt: 'desc' },
    });

    if (!lastSuccess) {
        return false;
    }

    return Date.now() - lastSuccess.lastSyncAt.getTime() < SYNC_INTERVAL_MS;
}

export async function performRazorpaySync(
    options: PerformRazorpaySyncOptions = {},
): Promise<RazorpaySyncResult> {
    const { force = false, trigger = 'manual' } = options;

    const lockAcquired = await acquireSyncLock();
    if (!lockAcquired) {
        return {
            success: true,
            syncedCount: 0,
            skippedCount: 0,
            skipped: true,
            message: 'Razorpay sync already running',
            nextSyncScheduled: new Date(Date.now() + SYNC_INTERVAL_MS),
        };
    }

    try {
        if (await shouldSkipSync(force)) {
            return {
                success: true,
                syncedCount: 0,
                skippedCount: 0,
                skipped: true,
                message: 'Hourly sync window has not elapsed yet',
                nextSyncScheduled: new Date(Date.now() + SYNC_INTERVAL_MS),
            };
        }

        const accountsToSync = await getAccountsToSync();
        if (accountsToSync.length === 0) {
            throw new Error('No Razorpay credentials found');
        }

        const currentSyncAt = new Date();
        let syncedCount = 0;
        let skippedCount = 0;

        logger.info('Starting Razorpay sync', {
            trigger,
            accountCount: accountsToSync.length,
            force,
        });

        for (const account of accountsToSync) {
            try {
                const latestPayment = await prisma.payment.findFirst({
                    where: {
                        companyId: account.companyId,
                        razorpayPaymentId: { not: null },
                    },
                    orderBy: { paymentDate: 'desc' },
                });

                const from = latestPayment
                    ? Math.floor(latestPayment.paymentDate.getTime() / 1000) - 3600
                    : Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

                const rpInstance = new Razorpay({
                    key_id: account.key_id,
                    key_secret: account.key_secret,
                });

                let hasMore = true;
                let skip = 0;
                const count = 100;

                while (hasMore) {
                    const payments: any = await rpInstance.payments.all({
                        from,
                        count,
                        skip,
                    });

                    if (!payments?.items?.length) {
                        hasMore = false;
                        break;
                    }

                    const batch = payments.items;
                    const batchIds = batch.map((payment: any) => payment.id);
                    const existingPayments = await prisma.payment.findMany({
                        where: { razorpayPaymentId: { in: batchIds } },
                        select: { razorpayPaymentId: true },
                    });
                    const existingIdSet = new Set(existingPayments.map((payment) => payment.razorpayPaymentId));

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
                                select: { companyId: true },
                            });
                            if (userMatch?.companyId) companyId = userMatch.companyId;
                        }

                        if (companyId) {
                            const companyMatch = await prisma.company.findUnique({
                                where: { id: companyId },
                            });
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

                        if (savedPayment.companyId) {
                            try {
                                await FinanceService.postPaymentJournal(savedPayment.companyId, savedPayment.id);
                            } catch (financeError) {
                                logger.error('Failed to post payment journal during Razorpay sync', financeError, {
                                    paymentId: savedPayment.id,
                                    companyId: savedPayment.companyId,
                                });
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
            } catch (accountError) {
                logger.error('Failed to sync Razorpay account', accountError, {
                    alias: account.alias,
                    companyId: account.companyId,
                    trigger,
                });
            }
        }

        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: currentSyncAt,
                status: 'SUCCESS',
                syncedCount,
            },
        });

        logger.info('Razorpay sync completed', {
            trigger,
            syncedCount,
            skippedCount,
        });

        return {
            success: true,
            syncedCount,
            skippedCount,
            nextSyncScheduled: new Date(Date.now() + SYNC_INTERVAL_MS),
        };
    } catch (error: any) {
        logger.error('Razorpay sync failed', error, { trigger, force });
        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: new Date(),
                status: 'FAILED',
                error: error.message,
            },
        });
        throw error;
    } finally {
        await releaseSyncLock();
    }
}

export function createRazorpaySyncResponse(result: RazorpaySyncResult) {
    return NextResponse.json(result);
}
