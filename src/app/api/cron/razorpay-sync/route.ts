import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

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
        const lastSync = await prisma.razorpaySync.findFirst({
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
        });

        // Use 10-minute overlap to catch any late-processing payments
        // If force is true, we could potentially go further back, but let's stick to overlap for now
        const from = lastSync ? Math.floor(lastSync.lastSyncAt.getTime() / 1000) - 600 : undefined;

        console.log(`Starting Razorpay sync from: ${from || 'beginning'} (Triggered by: ${authUser?.email || 'System'})`);

        let payments: any;
        try {
            payments = await razorpay.payments.all({
                from,
                count: 100,
            });
        } catch (err: any) {
            console.error('Razorpay API failure:', err);
            return NextResponse.json({ error: `Razorpay API Error: ${err.message}` }, { status: 500 });
        }

        let syncedCount = 0;
        let skippedCount = 0;
        const currentSyncAt = new Date();

        if (payments && payments.items) {
            for (const rpPayment of payments.items) {
                // Skip if already exists
                const existing = await prisma.payment.findUnique({
                    where: { razorpayPaymentId: rpPayment.id },
                });
                if (existing) {
                    skippedCount++;
                    continue;
                }

                // Try to find companyId
                let companyId = rpPayment.notes?.company_id || rpPayment.notes?.companyId;

                // 1. Fallback: try to find by email
                if (!companyId && rpPayment.email) {
                    const userMatch = await prisma.user.findUnique({
                        where: { email: rpPayment.email },
                        select: { companyId: true }
                    });
                    if (userMatch?.companyId) {
                        companyId = userMatch.companyId;
                    }
                }

                // 2. Fallback: If manually triggered by an Admin/Manager, use their companyId as last resort
                // This ensures that when a company admin clicks "Sync Now", they actually get the data.
                if (!companyId && authUser?.companyId && authUser.role !== 'SUPER_ADMIN') {
                    companyId = authUser.companyId;
                }

                // Verify companyId exists if provided to prevent FK errors
                if (companyId) {
                    const companyMatch = await prisma.company.findUnique({
                        where: { id: companyId },
                        select: { id: true }
                    });
                    if (!companyMatch) {
                        companyId = null;
                    }
                }

                try {
                    await prisma.payment.create({
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
                } catch (paymentErr) {
                    console.error(`Failed to sync payment ${rpPayment.id}:`, paymentErr);
                }
            }
        }

        await prisma.razorpaySync.create({
            data: {
                lastSyncAt: currentSyncAt,
                status: 'SUCCESS',
                syncedCount,
            },
        });

        console.log(`Razorpay sync completed. Synced ${syncedCount} new payments. Skipped ${skippedCount} existing.`);

        return NextResponse.json({
            success: true,
            syncedCount,
            skippedCount,
            nextSyncScheduled: new Date(Date.now() + 3600000)
        });
    } catch (error: any) {
        console.error('Automated Razorpay Sync Error:', error);
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
