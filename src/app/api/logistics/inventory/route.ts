import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { createAuditLog } from '@/lib/notifications';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        
        const where: any = {};
        if (user.companyId) {
            where.companyId = user.companyId;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ];
        }

        const inventory = await prisma.inventoryItem.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                warehouse: { select: { id: true, name: true, location: true } }
            }
        });

        const warehouses = await prisma.warehouse.findMany({
            where: { ...(user.companyId ? { companyId: user.companyId } : {}) },
            select: { id: true, name: true, location: true }
        });

        return NextResponse.json({ inventory, warehouses });
    } catch (error: any) {
        console.error('Fetch Inventory error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();
        const companyId = user.companyId || data.companyId;

        if (!companyId || !data.sku || !data.name) {
            return NextResponse.json({ error: 'SKU and Name are required.' }, { status: 400 });
        }

        // Handle case where SKU might already exist in the company
        const existing = await prisma.inventoryItem.findUnique({
            where: { sku_companyId: { sku: data.sku, companyId } }
        });

        if (existing) {
             return NextResponse.json({ error: `SKU ${data.sku} already exists across your inventory.` }, { status: 400 });
        }

        const item = await prisma.inventoryItem.create({
            data: {
                companyId,
                sku: data.sku,
                name: data.name,
                category: data.category || 'GENERAL',
                description: data.description,
                quantity: Number(data.quantity || 0),
                minStockLevel: Number(data.minStockLevel || 10),
                unitPrice: Number(data.unitPrice || 0),
                warehouseId: data.warehouseId || null
            },
            include: {
                warehouse: true
            }
        });

        // Log the initial stock allocation
        if (item.quantity > 0) {
            await prisma.stockMovement.create({
                data: {
                    inventoryItemId: item.id,
                    type: 'IN',
                    quantity: item.quantity,
                    notes: 'Initial Setup',
                    createdBy: user.id
                }
            });
        }

        await createAuditLog({
            userId: user.id,
            action: 'CREATE',
            entity: 'INVENTORY_ITEM',
            entityId: item.id,
            changes: { sku: item.sku, quantity: item.quantity },
            ipAddress: req.headers.get('x-forwarded-for') || 'API'
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error: any) {
        console.error('Create Inventory Item error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
