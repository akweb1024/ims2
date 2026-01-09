import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { razorpay } from '@/lib/razorpay';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    // Check for authorization (Optional: CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Fallback: check if it's a valid user session for manual sync from UI
        const isAuthed = await getAuthenticatedUser();
        if (!isAuthed && process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const lastSync = await prisma.razorpaySync.findFirst({
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
        });

        // Check if 1 hour has passed (unless forced)
        const oneHourAgo = new Date(Date.now() - 3600000);
        if (!force && lastSync && lastSync.lastSyncAt > oneHourAgo) {
            return NextResponse.json({
                message: 'Sync not needed yet',
                lastSync: lastSync.lastSyncAt,
                syncedCount: 0
            });
        }

        const from = lastSync ? Math.floor(lastSync.lastSyncAt.getTime() / 1000) : undefined;

        console.log(`Starting Razorpay sync from: ${from || 'beginning'}`);

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
        const currentSyncAt = new Date();

        if (payments && payments.items) {
            for (const rpPayment of payments.items) {
                // Skip if already exists
                const existing = await prisma.payment.findUnique({
                    where: { razorpayPaymentId: rpPayment.id },
                });
                if (existing) continue;

                // Try to find companyId
                let companyId = rpPayment.notes?.company_id || rpPayment.notes?.companyId;

                // If no companyId in notes, try to find by email
                if (!companyId && rpPayment.email) {
                    const user = await prisma.user.findUnique({
                        where: { email: rpPayment.email },
                        select: { companyId: true }
                    });
                    if (user?.companyId) {
                        companyId = user.companyId;
                    }
                }

                // Verify companyId exists if provided to prevent FK errors
                if (companyId) {
                    const companyMatch = await prisma.company.findUnique({
                        where: { id: companyId },
                        select: { id: true }
                    });
                    if (!companyMatch) {
                        console.warn(`Invalid companyId ${companyId} in Razorpay payment ${rpPayment.id}`);
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
                            metadata: JSON.stringify(rpPayment), // Store full object for rich details (email, description, etc.)
                            companyId: companyId || null,
                        },
                    });
                    syncedCount++;
                } catch (paymentErr) {
                    console.error(`Failed to sync payment ${rpPayment.id}:`, paymentErr);
                    // Continue with next payment instead of failing whole sync
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

        console.log(`Razorpay sync completed. Synced ${syncedCount} new payments.`);

        return NextResponse.json({
            success: true,
            syncedCount,
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
