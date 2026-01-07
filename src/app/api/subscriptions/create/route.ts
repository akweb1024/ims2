import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded || !['SUPER_ADMIN', 'SALES_EXECUTIVE', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            customerProfileId,
            startDate,
            endDate,
            salesChannel,
            items, // list of { journalId, planId, quantity }
            autoRenew,
            currency = 'INR'
        } = body;

        // 2. Validation
        if (!customerProfileId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Calculate Totals
        let total = 0;
        const subscriptionItems: any[] = [];

        for (const item of items) {
            const plan = await prisma.plan.findUnique({
                where: { id: item.planId },
                include: { journal: true }
            });

            if (!plan) return NextResponse.json({ error: `Plan ${item.planId} not found` }, { status: 404 });

            const price = currency === 'USD' ? plan.priceUSD : plan.priceINR;
            const itemPrice = price * (item.quantity || 1);
            total += itemPrice;

            subscriptionItems.push({
                journalId: plan.journalId,
                planId: plan.id,
                quantity: item.quantity || 1,
                price: price
            });
        }

        // 4. Create Subscription and Invoice in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            try {
                // Create Subscription
                console.log('Creating subscription...');
                const subscription = await tx.subscription.create({
                    data: {
                        customerProfileId,
                        companyId: (decoded as any).companyId,
                        startDate: new Date(startDate),
                        endDate: new Date(endDate),
                        salesChannel,
                        autoRenew: autoRenew || false,
                        status: 'PENDING_PAYMENT',
                        currency,
                        subtotal: total,
                        total: total,
                        salesExecutiveId: decoded.id,
                        items: {
                            create: subscriptionItems
                        }
                    }
                });

                // Create Invoice
                console.log('Creating invoice...');
                const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const invoice = await tx.invoice.create({
                    data: {
                        subscriptionId: subscription.id,
                        companyId: (decoded as any).companyId,
                        invoiceNumber,
                        currency,
                        amount: total,
                        tax: 0,
                        total: total,
                        status: 'UNPAID',
                        dueDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000)
                    }
                });

                // Log Audit
                console.log('Logging audit...');
                await tx.auditLog.create({
                    data: {
                        userId: decoded.id,
                        action: 'create',
                        entity: 'subscription',
                        entityId: subscription.id,
                        changes: JSON.stringify({ total, startDate, endDate, itemsCount: items.length })
                    }
                });

                return { subscription, invoice };
            } catch (err: any) {
                console.error('Transaction Error:', err);
                throw err;
            }
        });

        return NextResponse.json({
            success: true,
            subscriptionId: result.subscription.id,
            invoiceNumber: result.invoice.invoiceNumber
        });

    } catch (error: any) {
        console.error('Create Subscription Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message,
            stack: error.stack,
            details: error
        }, { status: 500 });
    }
}
