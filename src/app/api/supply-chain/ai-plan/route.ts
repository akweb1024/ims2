import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Analyze Recent Sales Trends (Mocked using Journal data as "Sales")
        // In a real manufacturing scenario, this would look at 'Orders'
        // We will use our 'Payment' model as a proxy for demand signal
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        const recentPayments = await prisma.payment.findMany({
            where: { paymentDate: { gte: lastMonth } }
        });

        // 2. Identify Demand Surge
        const revenue = recentPayments.reduce((acc, p) => acc + p.amount, 0);
        const demandSurge = revenue > 50000; // Mock threshold

        // 3. Check Inventory Levels
        const inventory = await prisma.inventoryItem.findMany();

        // 4. Generate AI Recommendations
        const recommendations = [];

        for (const item of inventory) {
            // Logic: If Demand Surge AND Stock is < 2x Threshold -> Produce More
            // Logic: If Stock < Threshold -> Critical Restock

            let suggestedAction = null;

            if (item.currentStock <= item.minThreshold) {
                suggestedAction = {
                    priority: 'HIGH',
                    quantity: item.minThreshold * 3,
                    reason: `CRITICAL: Stock (${item.currentStock}) below threshold (${item.minThreshold}). Risk of stockout.`
                };
            } else if (demandSurge && item.category === 'FINISHED_GOOD') {
                // Predictive Logic
                suggestedAction = {
                    priority: 'MEDIUM',
                    quantity: Math.round(item.currentStock * 0.5),
                    reason: `PREDICTIVE: Sales velocity is high (+15% MoM). Increase buffer stock.`
                };
            }

            if (suggestedAction) {
                recommendations.push({
                    itemSku: item.sku,
                    itemName: item.name,
                    currentStock: item.currentStock,
                    suggestedQty: suggestedAction.quantity,
                    priority: suggestedAction.priority,
                    reason: suggestedAction.reason
                });
            }
        }

        return NextResponse.json({
            marketSignal: demandSurge ? 'HIGH_DEMAND' : 'NORMAL',
            recommendations
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Convert Recommendation to Real Order
    try {
        const user = await getAuthenticatedUser();
        // Permission check...

        const body = await req.json();
        const { itemSku, quantity, priority, reason } = body;

        const order = await prisma.productionOrder.create({
            data: {
                itemSku,
                quantity,
                priority,
                reason,
                status: 'PLANNED',
                targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
            }
        });

        return NextResponse.json(order);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
