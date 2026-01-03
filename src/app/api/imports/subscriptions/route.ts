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
        let errors: string[] = [];

        for (const rawItem of data) {
            // Normalize keys
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            const email = item.email || item.customeremail;
            if (!email) {
                skippedCount++;
                continue;
            }

            // Find Customer
            const customer = await prisma.customerProfile.findFirst({
                where: { primaryEmail: email }
            });

            if (!customer) {
                errors.push(`Customer not found for email: ${email}`);
                skippedCount++;
                continue;
            }

            // Create Subscription
            try {
                await prisma.subscription.create({
                    data: {
                        customerProfileId: customer.id,
                        salesChannel: 'DIRECT', // Default
                        status: item.status?.toUpperCase() || 'ACTIVE',
                        startDate: item.startdate ? new Date(item.startdate) : new Date(),
                        endDate: item.enddate ? new Date(item.enddate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                        subtotal: parseFloat(item.total) || 0,
                        total: parseFloat(item.total) || 0,
                        currency: item.currency || 'INR',
                        autoRenew: item.autorenew === 'true' || item.autorenew === true
                    }
                });
                createdCount++;
            } catch (err) {
                console.error(`Failed to create subscription for ${email}`, err);
                skippedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${createdCount} subscriptions. ${skippedCount} skipped.`,
            errors: errors.slice(0, 5) // Return first 5 errors max
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
