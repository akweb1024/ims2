import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const companyId = (decoded as any).companyId;
        if (!companyId) return NextResponse.json([], { status: 200 });

        const coupons = await prisma.coupon.findMany({
            where: { companyId },
            include: {
                brand: { select: { id: true, name: true } },
                _count: { select: { invoices: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(coupons);
    } catch (error) {
        console.error('Coupons GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const companyId = (decoded as any).companyId;
        const body = await req.json();
        const {
            code, description, discountType, discountValue,
            minOrderValue, maxDiscountCap, usageLimit,
            validFrom, validUntil, brandId, isActive = true
        } = body;

        if (!code || !discountType || !discountValue) {
            return NextResponse.json({ error: 'Code, type, and discount value are required' }, { status: 400 });
        }

        if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
            return NextResponse.json({ error: 'discountType must be PERCENTAGE or FIXED' }, { status: 400 });
        }

        if (discountType === 'PERCENTAGE' && (discountValue <= 0 || discountValue > 100)) {
            return NextResponse.json({ error: 'Percentage must be between 1 and 100' }, { status: 400 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase().trim(),
                description,
                discountType,
                discountValue: Number(discountValue),
                minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
                maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : null,
                usageLimit: usageLimit ? Number(usageLimit) : null,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
                isActive,
                companyId,
                brandId: brandId || null,
            }
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
        }
        console.error('Coupon POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
