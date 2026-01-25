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
        const { journalId, planId, quantity = 1 } = body;

        if (!journalId || !planId) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        // 1. Get Customer Profile
        const customerProfile = await prisma.customerProfile.findUnique({
            where: { userId: decoded.id }
        });

        if (!customerProfile) {
            return NextResponse.json({ error: 'Customer Profile not found' }, { status: 404 });
        }

        // 2. Get Plan and Journal Details
        const plan = await prisma.plan.findUnique({
            where: { id: planId },
            include: { journal: true }
        });

        if (!plan || plan.journalId !== journalId || !plan.isActive) {
            return NextResponse.json({ error: 'Invalid or Inactive Plan' }, { status: 400 });
        }

        // 3. Calculate Totals (Mock Tax/Discount for now)
        const price = plan.priceINR; // Default to INR for MPV
        const subtotal = price * quantity;
        const tax = subtotal * 0.18; // 18% GST assumption
        const total = subtotal + tax;

        // 4. Create Subscription
        const subscription = await prisma.subscription.create({
            data: {
                customerProfileId: customerProfile.id,
                salesChannel: 'DIRECT',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 Year Default
                status: 'PENDING_PAYMENT',
                currency: 'INR',
                subtotal: subtotal,
                tax: tax,
                total: total,
                items: {
                    create: {
                        journalId: journalId,
                        planId: planId,
                        quantity: quantity,
                        price: price,
                        seats: plan.format === 'Online' ? 1 : 0
                    }
                },
                invoices: {
                    create: {
                        invoiceNumber: `INV-${Date.now()}`,
                        currency: 'INR',
                        amount: subtotal,
                        tax: tax,
                        total: total,
                        status: 'UNPAID',
                        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)) // 7 Days due
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
