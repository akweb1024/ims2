import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const categoryId = searchParams.get('categoryId');

        const products = await (prisma as any).product.findMany({
            where: {
                isActive: true,
                ...(type ? { type } : {}),
                ...(categoryId ? { categoryId } : {})
            },
            include: {
                category: true
            }
        });

        return NextResponse.json(products);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, type, categoryId, priceINR, priceUSD, metadata } = body;

        const product = await (prisma as any).product.create({
            data: {
                name,
                type,
                categoryId,
                priceINR: parseFloat(priceINR || '0'),
                priceUSD: parseFloat(priceUSD || '0'),
                metadata: metadata || {}
            }
        });

        return NextResponse.json(product);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
