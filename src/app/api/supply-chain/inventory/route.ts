import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        // Allow access to exec/managers
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const inventory = await prisma.inventoryItem.findMany({
            orderBy: { name: 'asc' }
        });

        // Calculate simple stats
        const lowStockItems = inventory.filter(i => i.currentStock <= i.minThreshold);
        const totalValue = inventory.reduce((acc, i) => acc + (i.price * i.currentStock), 0);

        return NextResponse.json({
            items: inventory,
            metrics: {
                totalItems: inventory.length,
                lowStockCount: lowStockItems.length,
                totalValue
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const item = await prisma.inventoryItem.create({
            data: {
                name: body.name,
                sku: body.sku,
                currentStock: parseInt(body.currentStock),
                minThreshold: parseInt(body.minThreshold),
                category: body.category,
                price: parseFloat(body.price)
            }
        });

        return NextResponse.json(item);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
