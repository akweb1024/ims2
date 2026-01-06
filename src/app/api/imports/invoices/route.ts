import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json();

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const rawItem of data) {
            // Normalize keys
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            // Try to find the subscription
            let subscriptionId = item.subscriptionid;

            // If no subscription ID, try finding by email (latest active subscription)
            if (!subscriptionId && (item.email || item.customeremail)) {
                const email = item.email || item.customeremail;
                const customer = await prisma.customerProfile.findFirst({
                    where: { primaryEmail: email },
                    include: {
                        subscriptions: {
                            take: 1,
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                });
                if (customer && customer.subscriptions.length > 0) {
                    subscriptionId = customer.subscriptions[0].id;
                }
            }

            if (!subscriptionId) {
                errors.push(`No linked subscription found for invoice: ${item.invoicenumber || 'Unknown'}`);
                skippedCount++;
                continue;
            }

            // Create Invoice
            try {
                await prisma.invoice.create({
                    data: {
                        subscriptionId: subscriptionId,
                        invoiceNumber: item.invoicenumber || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        amount: parseFloat(item.amount) || 0,
                        tax: 0, // Simplified import
                        total: parseFloat(item.amount) || parseFloat(item.total) || 0,
                        currency: item.currency || 'INR',
                        status: item.status?.toUpperCase() || 'UNPAID',
                        dueDate: item.duedate ? new Date(item.duedate) : new Date(new Date().setDate(new Date().getDate() + 30)),
                        paidDate: item.paiddate && item.paiddate !== 'N/A' ? new Date(item.paiddate) : null
                    }
                });
                createdCount++;
            } catch (_err) {
                // Check unique constraint on invoiceNumber
                console.error(`Failed to create invoice ${item.invoicenumber}`, _err);
                skippedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${createdCount} invoices. ${skippedCount} skipped.`,
            errors: errors.slice(0, 5)
        });

    } catch (_error) {
        console.error('Import Error:', _error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
