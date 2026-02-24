import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded || !['SUPER_ADMIN', 'EXECUTIVE', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {

            customerProfileId,
            startDate,
            endDate,
            salesChannel,
            agencyId,
            items, // list of { journalId, planId, quantity }
            autoRenew,
            currency = 'INR',
            taxRate = 0
        } = body;

        // 2. Validation
        if (!customerProfileId || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate Agency if Sales Channel is AGENCY
        let appliedDiscountRate = 0;
        if (salesChannel === 'AGENCY') {
            if (!agencyId) {
                return NextResponse.json({ error: 'Agency is required for Agency Sales Channel' }, { status: 400 });
            }
            const agency = await prisma.customerProfile.findUnique({
                where: { id: agencyId },
                include: { agencyDetails: true }
            });

            if (!agency || agency.customerType !== 'AGENCY') {
                return NextResponse.json({ error: 'Invalid Agency' }, { status: 400 });
            }

            if (agency.agencyDetails?.discountRate) {
                appliedDiscountRate = agency.agencyDetails.discountRate;
            }
        }

        // 3. Calculate Totals
        let selectedCurrencyTotal = 0;
        let totalInINR = 0;
        let totalInUSD = 0;
        const subscriptionItems: any[] = [];

        for (const item of items) {
            const plan = await prisma.plan.findUnique({
                where: { id: item.planId },
                include: { journal: true }
            });

            if (!plan) return NextResponse.json({ error: `Plan ${item.planId} not found` }, { status: 404 });

            const price = currency === 'USD' ? plan.priceUSD : plan.priceINR;
            selectedCurrencyTotal += price * (item.quantity || 1);

            totalInINR += plan.priceINR * (item.quantity || 1);
            totalInUSD += plan.priceUSD * (item.quantity || 1);

            subscriptionItems.push({
                journalId: plan.journalId,
                planId: plan.id,
                quantity: item.quantity || 1,
                price: price
            });
        }

        // Apply Discount
        // Discount is applied to the total amount in selected currency
        const discountAmount = selectedCurrencyTotal * (appliedDiscountRate / 100);
        const taxableAmount = selectedCurrencyTotal - discountAmount;
        const taxAmount = taxableAmount * (Number(taxRate) / 100);
        const finalTotal = taxableAmount + taxAmount;

        // Prepare Invoice Line Items
        const invoiceLineItems = subscriptionItems.map(si => ({
            ...si,
            description: items.find((i: any) => i.journalId === si.journalId)?.journalName || 'Journal Subscription'
        }));

        // 4. Create Subscription and Invoice in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            try {
                // Create Subscription
                const subscriptionData: any = {
                    customerProfileId,
                    companyId: (decoded as any).companyId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    salesChannel,
                    agencyId: salesChannel === 'AGENCY' ? agencyId : null,
                    autoRenew: autoRenew || false,
                    status: 'PENDING_PAYMENT',
                    currency,
                    subtotal: selectedCurrencyTotal,
                    discount: discountAmount,
                    tax: taxAmount,
                    total: finalTotal, // Store discounted total with tax
                    subtotalInINR: totalInINR, 
                    subtotalInUSD: totalInUSD,
                    // Apply both discount AND tax to the base currency totals for consistency
                    totalInINR: (totalInINR * (1 - appliedDiscountRate / 100)) * (1 + Number(taxRate) / 100),
                    totalInUSD: (totalInUSD * (1 - appliedDiscountRate / 100)) * (1 + Number(taxRate) / 100),
                    salesExecutiveId: decoded.id,
                    items: {
                        create: subscriptionItems
                    }
                };

                const subscription = await tx.subscription.create({
                    data: subscriptionData
                });

                // Create Invoice
                const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const invoice = await tx.invoice.create({
                    data: {
                        subscriptionId: subscription.id,
                        customerProfileId,
                        companyId: (decoded as any).companyId,
                        invoiceNumber,
                        currency,
                        amount: taxableAmount, // Subtotal after discount
                        tax: taxAmount,
                        total: finalTotal,
                        status: 'UNPAID',
                        dueDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
                        lineItems: invoiceLineItems
                    }
                });

                // Log Audit
                await tx.auditLog.create({
                    data: {
                        userId: decoded.id,
                        action: 'create',
                        entity: 'subscription',
                        entityId: subscription.id,
                        changes: JSON.stringify({ total: finalTotal, discount: discountAmount, agencyId, itemsCount: items.length })
                    }
                });

                return { subscription, invoice };
            } catch (err: any) {
                logger.error('Subscription Transaction Error', err);
                throw err;
            }
        });

        return NextResponse.json({
            success: true,
            subscriptionId: result.subscription.id,
            invoiceNumber: result.invoice.invoiceNumber
        });

    } catch (error: any) {
        logger.error('Create Subscription Error', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message
        }, { status: 500 });
    }
}
