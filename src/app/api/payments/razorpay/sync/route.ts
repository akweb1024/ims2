import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import Razorpay from 'razorpay';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';

export async function POST() {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentSyncAt = new Date();
        let totalSynced = 0;

        // 1. Fetch ALL Razorpay Configurations (Company-specific)
        // We look for any key that starts with RAZORPAY_KEY_ID
        const allConfigs = await prisma.appConfiguration.findMany({
            where: {
                category: 'PAYMENT_GATEWAY',
                key: { startsWith: 'RAZORPAY_KEY_ID' },
                isActive: true
            }
        });

        // If no DB configs, try one fallback with ENV vars
        const accountsToSync = [];

        if (allConfigs.length > 0) {
            for (const config of allConfigs) {
                // Find matching secret
                // Convention: RAZORPAY_KEY_ID -> RAZORPAY_KEY_SECRET
                //             RAZORPAY_KEY_ID_2 -> RAZORPAY_KEY_SECRET_2
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
                        alias: config.key // To track which account
                    });
                }
            }
        } else if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            accountsToSync.push({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
                companyId: null, // Global env fallback
                alias: 'ENV_DEFAULT'
            });
        }

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

                const payments = await rpInstance.payments.all({
                    from,
                    count: 100
                });

                if (payments && payments.items) {
                    for (const rpPayment of payments.items) {
                        const existing = await prisma.payment.findUnique({
                            where: { razorpayPaymentId: rpPayment.id },
                        });
                        if (existing) continue;

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
                            },
                        });
                        totalSynced++;

                        // Journal Entry
                        if (savedPayment.companyId) {
                            try {
                                await FinanceService.postPaymentJournal(savedPayment.companyId, savedPayment.id);
                            } catch (finErr) {
                                logger.error(`Failed to post journal for payment`, finErr, { paymentId: savedPayment.id });
                            }
                        }
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
