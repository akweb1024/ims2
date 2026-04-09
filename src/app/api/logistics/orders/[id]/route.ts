import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { buildTrackingMetadata, deriveDispatchDates, normalizeTrackingNumber } from '@/lib/dispatch';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'EXECUTIVE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const order = await (prisma as any).dispatchOrder.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
            include: {
                courier: true,
                invoice: true,
                customerProfile: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...order,
            tracking: buildTrackingMetadata(order),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN', 'EXECUTIVE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const existing = await (prisma as any).dispatchOrder.findFirst({
            where: {
                id,
                ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
        }

        const nextStatus = body.status || existing.status;
        const dates = deriveDispatchDates(nextStatus, existing);

        const order = await (prisma as any).dispatchOrder.update({
            where: { id },
            data: {
                status: body.status || undefined,
                recipientName: body.recipientName !== undefined ? String(body.recipientName || '').trim() || undefined : undefined,
                shippingAddress: body.shippingAddress !== undefined ? String(body.shippingAddress || '').trim() || undefined : undefined,
                shippingCity: body.shippingCity !== undefined ? String(body.shippingCity || '').trim() || undefined : undefined,
                shippingState: body.shippingState !== undefined ? String(body.shippingState || '').trim() || undefined : undefined,
                shippingPincode: body.shippingPincode !== undefined ? String(body.shippingPincode || '').trim() || undefined : undefined,
                shippingCountry: body.shippingCountry !== undefined ? String(body.shippingCountry || '').trim() || undefined : undefined,
                billingAddress: body.billingAddress !== undefined ? String(body.billingAddress || '').trim() || null : undefined,
                billingCity: body.billingCity !== undefined ? String(body.billingCity || '').trim() || null : undefined,
                billingState: body.billingState !== undefined ? String(body.billingState || '').trim() || null : undefined,
                billingPincode: body.billingPincode !== undefined ? String(body.billingPincode || '').trim() || null : undefined,
                billingCountry: body.billingCountry !== undefined ? String(body.billingCountry || '').trim() || null : undefined,
                phone: body.phone !== undefined ? String(body.phone || '').trim() || null : undefined,
                weight: body.weight !== undefined && body.weight !== null && body.weight !== ''
                    ? Number(body.weight)
                    : body.weight === null || body.weight === ''
                        ? null
                        : undefined,
                courierId: body.courierId !== undefined ? body.courierId || null : undefined,
                partnerName: body.partnerName !== undefined ? String(body.partnerName || '').trim() || null : undefined,
                trackingNumber: body.trackingNumber !== undefined ? normalizeTrackingNumber(body.trackingNumber) : undefined,
                remarks: body.remarks !== undefined ? String(body.remarks || '').trim() || null : undefined,
                packedDate: body.packedDate ? new Date(body.packedDate) : dates.packedDate,
                shippedDate: body.shippedDate ? new Date(body.shippedDate) : dates.shippedDate,
                deliveredDate: body.deliveredDate ? new Date(body.deliveredDate) : dates.deliveredDate,
                updatedByUserId: user.id,
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
