import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const companyId = (decoded as any).companyId;
        const body = await req.json();
        const { code, subtotal, brandId } = body;

        if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

        const coupon = await prisma.coupon.findFirst({
            where: {
                code: code.toUpperCase().trim(),
                companyId,
                isActive: true
            }
        });

        if (!coupon) {
            return NextResponse.json({ valid: false, error: 'Invalid or inactive coupon code' }, { status: 200 });
        }

        // Check expiry
        const now = new Date();
        if (coupon.validFrom && coupon.validFrom > now) {
            return NextResponse.json({ valid: false, error: 'Coupon is not yet valid' });
        }
        if (coupon.validUntil && coupon.validUntil < now) {
            return NextResponse.json({ valid: false, error: 'Coupon has expired' });
        }

        // Check usage limit
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' });
        }

        // Check min order value
        const orderSubtotal = Number(subtotal) || 0;
        if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
            return NextResponse.json({
                valid: false,
                error: `Minimum order value of ${coupon.minOrderValue.toLocaleString()} required for this coupon`
            });
        }

        // Check brand scope
        if (coupon.brandId && brandId && coupon.brandId !== brandId) {
            return NextResponse.json({ valid: false, error: 'Coupon is not valid for the selected brand' });
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = orderSubtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscountCap && discountAmount > coupon.maxDiscountCap) {
                discountAmount = coupon.maxDiscountCap;
            }
        } else {
            discountAmount = Math.min(coupon.discountValue, orderSubtotal);
        }

        return NextResponse.json({
            valid: true,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                maxDiscountCap: coupon.maxDiscountCap,
            },
            discountAmount: Math.round(discountAmount * 100) / 100
        });

    } catch (error) {
        console.error('Coupon Validate Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
