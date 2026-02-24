import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'CUSTOMER') {
            return NextResponse.json({ error: 'Forbidden. Only customers can subscribe.' }, { status: 403 });
        }

        const body = await req.json();
        let { items } = body;
        const { journalId, planId, quantity = 1, currency = 'INR', taxRate = 0 } = body;

        // 1. Normalize items list
        if (!items && journalId && planId) {
            items = [{ journalId, planId, quantity }];
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Missing Required Fields (items)' }, { status: 400 });
        }

        // 2. Get Customer Profile
        const customerProfile = await prisma.customerProfile.findUnique({
            where: { userId: decoded.id }
        });

        if (!customerProfile) {
            return NextResponse.json({ error: 'Customer Profile not found' }, { status: 404 });
        }

        // 3. Process Items and Calculate Totals
        let selectedCurrencyTotal = 0;
        const subscriptionItems: any[] = [];
        const invoiceLineItems: any[] = [];

        for (const item of items) {
            const plan = await prisma.plan.findUnique({
                where: { id: item.planId },
                include: { journal: true }
            });

            if (!plan) return NextResponse.json({ error: `Plan ${item.planId} not found` }, { status: 404 });

            const price = currency === 'USD' ? plan.priceUSD : plan.priceINR;
            const amount = price * (item.quantity || 1);
            selectedCurrencyTotal += amount;

            subscriptionItems.push({
                journalId: plan.journalId,
                planId: plan.id,
                quantity: item.quantity || 1,
                price: price,
                seats: plan.format === 'Online' ? 1 : 0
            });

            invoiceLineItems.push({
                journalId: plan.journalId,
                planId: plan.id,
                quantity: item.quantity || 1,
                price: price,
                amount: amount,
                description: plan.journal?.name || 'Journal Subscription'
            });
        }

        // 4. Final Calculations
        const taxAmount = selectedCurrencyTotal * (Number(taxRate) / 100);
        const totalAmount = selectedCurrencyTotal + taxAmount;

        // 5. Create Subscription and Invoice in Transaction
        const subscription = await prisma.subscription.create({
            data: {
                customerProfileId: customerProfile.id,
                salesChannel: 'DIRECT',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                status: 'PENDING_PAYMENT',
                currency,
                subtotal: selectedCurrencyTotal,
                tax: taxAmount,
                total: totalAmount,
                items: {
                    create: subscriptionItems
                },
                invoices: {
                    create: {
                        invoiceNumber: `INV-${Date.now()}`,
                        customerProfileId: customerProfile.id,
                        currency,
                        amount: selectedCurrencyTotal,
                        tax: taxAmount,
                        total: totalAmount,
                        status: 'UNPAID',
                        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                        lineItems: invoiceLineItems
                    }
                }
            },
            include: {
                items: true,
                invoices: true
            }
        });

        return NextResponse.json(subscription);

    } catch (error: any) {
        console.error('Subscription Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
