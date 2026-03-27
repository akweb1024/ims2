import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import {
    buildTrackingMetadata,
    deriveDispatchDates,
    ensureInvoiceFulfillmentRecords,
    ensureDefaultCouriers,
    normalizeTrackingNumber,
    summarizeInvoiceLineItems,
} from '@/lib/dispatch';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await ensureDefaultCouriers();

        const invoiceCandidates = await prisma.invoice.findMany({
            where: {
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
            include: {
                customerProfile: true,
                subscription: {
                    include: {
                        customerProfile: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        await Promise.all(
            invoiceCandidates
                .filter((invoice) => Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0)
                .map((invoice) => ensureInvoiceFulfillmentRecords(invoice, user.id)),
        );

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status');
        const courierId = searchParams.get('courierId');
        const invoiceId = searchParams.get('invoiceId');
        const customerId = searchParams.get('customerId');
        const q = searchParams.get('q')?.trim();

        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }
        if (status) where.status = status;
        if (courierId) where.courierId = courierId;
        if (invoiceId) where.invoiceId = invoiceId;
        if (customerId) where.customerProfileId = customerId;
        if (q) {
            where.OR = [
                { trackingNumber: { contains: q, mode: 'insensitive' } },
                { recipientName: { contains: q, mode: 'insensitive' } },
                { partnerName: { contains: q, mode: 'insensitive' } },
                { cycleLabel: { contains: q, mode: 'insensitive' } },
                { invoice: { invoiceNumber: { contains: q, mode: 'insensitive' } } },
                { customerProfile: { name: { contains: q, mode: 'insensitive' } } },
                { customerProfile: { organizationName: { contains: q, mode: 'insensitive' } } },
            ];
        }

        const [orders, stats, carrierPerformance, trends] = await Promise.all([
            prisma.dispatchOrder.findMany({
                where,
                include: {
                    courier: true,
                    invoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            proformaNumber: true,
                            status: true,
                            total: true,
                            currency: true,
                            shippingAddress: true,
                            shippingCity: true,
                            shippingState: true,
                            shippingPincode: true,
                            createdAt: true,
                        }
                    },
                    customerProfile: {
                        select: {
                            id: true,
                            name: true,
                            organizationName: true,
                            primaryEmail: true,
                            primaryPhone: true,
                        }
                    }
                },
                orderBy: [{ plannedDispatchDate: 'asc' }, { createdAt: 'desc' }],
                take: limit
            }),
            prisma.dispatchOrder.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            }),
            prisma.dispatchOrder.groupBy({
                by: ['courierId'],
                where: { ...where, courierId: { not: null } },
                _count: { id: true },
                _avg: { weight: true }
            }),
            prisma.$queryRaw`
                SELECT 
                    DATE("createdAt") as date,
                    COUNT(id) as count
                FROM "DispatchOrder"
                WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                ${user.role !== 'SUPER_ADMIN' ? prisma.$queryRaw`AND "companyId" = ${user.companyId}` : prisma.$queryRaw``}
                GROUP BY DATE("createdAt")
                ORDER BY DATE("createdAt") ASC
            `
        ]);

        // Fetch courier names for performance mapping
        const couriers = await prisma.courier.findMany({
            where: { id: { in: carrierPerformance.map((p: any) => p.courierId).filter((id: string | null) => id !== null) as string[] } },
            select: { id: true, name: true }
        });

        const formattedPerformance = carrierPerformance.map((p: any) => ({
            courierName: couriers.find((c: any) => c.id === p.courierId)?.name || 'Unknown',
            orderCount: p._count.id,
            avgWeight: p._avg.weight
        }));

        return NextResponse.json({
            orders: orders.map((order: any) => ({
                ...order,
                tracking: buildTrackingMetadata(order),
            })),
            stats: stats.reduce((acc: any, curr: any) => ({ ...acc, [curr.status]: curr._count.id }), {}),
            carrierPerformance: formattedPerformance,
            trends
        });

    } catch (error: any) {
        console.error('Logistics API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        await ensureDefaultCouriers();

        const body = await req.json();
        const {
            invoiceId,
            customerProfileId,
            recipientName,
            address,
            city,
            state,
            pincode,
            country,
            phone,
            items,
            courierId,
            partnerName,
            trackingNumber,
            remarks,
            weight,
            status,
            fulfillmentType,
            cycleNumber,
            totalCycles,
            cycleLabel,
            plannedDispatchDate,
            accessStartDate,
            accessEndDate,
        } = body;

        if (invoiceId && !body.forceManual) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: invoiceId,
                    ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId })
                },
                include: {
                    customerProfile: true,
                    subscription: { include: { customerProfile: true } }
                }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            const records = await ensureInvoiceFulfillmentRecords(invoice, user.id);
            return NextResponse.json(records.map((record: any) => ({
                ...record,
                tracking: buildTrackingMetadata(record),
            })));
        }

        let finalPayload: any = {
            customerProfileId: customerProfileId || null,
            recipientName,
            address,
            city,
            state,
            pincode,
            country,
            phone,
            items,
            courierId: courierId || null,
            partnerName: partnerName || null,
            trackingNumber: normalizeTrackingNumber(trackingNumber),
            remarks: remarks || null,
            weight: weight ? Number(weight) : null,
            status: status || 'PENDING',
            fulfillmentType: fulfillmentType || 'PRINT',
            cycleNumber: cycleNumber ? Number(cycleNumber) : 1,
            totalCycles: totalCycles ? Number(totalCycles) : 1,
            cycleLabel: cycleLabel || null,
            plannedDispatchDate: plannedDispatchDate ? new Date(plannedDispatchDate) : null,
            accessStartDate: accessStartDate ? new Date(accessStartDate) : null,
            accessEndDate: accessEndDate ? new Date(accessEndDate) : null,
            companyId: user.companyId,
            createdByUserId: user.id,
            updatedByUserId: user.id,
        };

        if (invoiceId) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    id: invoiceId,
                    ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId })
                },
                include: {
                    customerProfile: true,
                    subscription: { include: { customerProfile: true } }
                }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }

            const customer = invoice.customerProfile || invoice.subscription?.customerProfile;
            finalPayload = {
                ...finalPayload,
                invoiceId: invoice.id,
                subscriptionId: invoice.subscriptionId || null,
                customerProfileId: customer?.id || finalPayload.customerProfileId,
                recipientName:
                    finalPayload.recipientName ||
                    customer?.organizationName ||
                    customer?.name ||
                    'Customer',
                address:
                    finalPayload.address ||
                    invoice.shippingAddress ||
                    customer?.shippingAddress ||
                    customer?.billingAddress,
                city:
                    finalPayload.city ||
                    invoice.shippingCity ||
                    customer?.shippingCity ||
                    customer?.billingCity,
                state:
                    finalPayload.state ||
                    invoice.shippingState ||
                    customer?.shippingState ||
                    customer?.billingState,
                pincode:
                    finalPayload.pincode ||
                    invoice.shippingPincode ||
                    customer?.shippingPincode ||
                    customer?.billingPincode,
                country:
                    finalPayload.country ||
                    invoice.shippingCountry ||
                    customer?.shippingCountry ||
                    customer?.billingCountry ||
                    'India',
                phone: finalPayload.phone || customer?.primaryPhone || '',
                items:
                    finalPayload.items && Object.keys(finalPayload.items).length > 0
                        ? finalPayload.items
                        : summarizeInvoiceLineItems(invoice.lineItems) as any,
                companyId: invoice.companyId || user.companyId,
            };
        }

        if (
            finalPayload.fulfillmentType === 'PRINT' &&
            (!finalPayload.address || !finalPayload.city || !finalPayload.state || !finalPayload.pincode)
        ) {
            return NextResponse.json({ error: 'Shipping address is incomplete for this dispatch' }, { status: 422 });
        }

        const derivedDates = deriveDispatchDates(finalPayload.status);

        const order = await prisma.dispatchOrder.create({
            data: {
                ...finalPayload,
                packedDate: derivedDates.packedDate,
                shippedDate: derivedDates.shippedDate,
                deliveredDate: derivedDates.deliveredDate,
            },
            include: {
                courier: true,
                invoice: true,
                customerProfile: true,
            },
        });

        return NextResponse.json({
            ...order,
            tracking: buildTrackingMetadata(order),
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
