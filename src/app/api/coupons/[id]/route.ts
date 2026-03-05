import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const allowed = [
            'description', 'discountType', 'discountValue', 'minOrderValue',
            'maxDiscountCap', 'usageLimit', 'validFrom', 'validUntil',
            'isActive', 'brandId', 'code'
        ];

        const data: any = {};
        for (const key of allowed) {
            if (key in body) {
                if (key === 'validFrom' || key === 'validUntil') {
                    data[key] = body[key] ? new Date(body[key]) : null;
                } else if (key === 'code') {
                    data[key] = body[key].toUpperCase().trim();
                } else {
                    data[key] = body[key];
                }
            }
        }

        const coupon = await prisma.coupon.update({ where: { id }, data });
        return NextResponse.json(coupon);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
        }
        console.error('Coupon PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Soft-delete: deactivate instead of hard delete if used on invoices
        const coupon = await prisma.coupon.findUnique({ where: { id }, select: { usedCount: true } });
        if (coupon && coupon.usedCount > 0) {
            await prisma.coupon.update({ where: { id }, data: { isActive: false } });
            return NextResponse.json({ message: 'Coupon deactivated (has been used on invoices)' });
        }

        await prisma.coupon.delete({ where: { id } });
        return NextResponse.json({ message: 'Coupon deleted' });
    } catch (error) {
        console.error('Coupon DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
