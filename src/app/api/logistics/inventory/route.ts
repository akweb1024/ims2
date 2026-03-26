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
        const source = searchParams.get('source');
        
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

        if (source === 'products') {
            const productWhere: any = {
                OR: [{ companyId: user.companyId }, { companyId: null }],
            };

            if (search) {
                productWhere.AND = [
                    {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { sku: { contains: search, mode: 'insensitive' } },
                            { domain: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                ];
            }

            const products = await prisma.invoiceProduct.findMany({
                where: productWhere,
                include: {
                    variants: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            sku: true,
                            stockQuantity: true,
                            manageStock: true,
                            priceINR: true,
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });

            const skus = products
                .map((p) => p.sku)
                .filter((sku): sku is string => Boolean(sku));

            const inventoryBySku = new Map<string, any>();
            if (skus.length > 0 && user.companyId) {
                const linkedInventory = await prisma.inventoryItem.findMany({
                    where: {
                        companyId: user.companyId,
                        sku: { in: skus },
                    },
                    include: {
                        warehouse: { select: { id: true, name: true, location: true } },
                    },
                });
                linkedInventory.forEach((item) => inventoryBySku.set(item.sku, item));
            }

            const rows = products
                .filter((product: any) => {
                    const inventorySettings = (product.productAttributes as any)?.inventorySettings || {};
                    return Boolean(inventorySettings.isPhysicalDeliverable) && Boolean(inventorySettings.trackInventory);
                })
                .flatMap((product: any) => {
                    const inventorySettings = (product.productAttributes as any)?.inventorySettings || {};
                    const minStockLevel = Number(inventorySettings.minStockLevel || 10);

                    if (product.type === 'VARIABLE' && product.variants?.length) {
                        return product.variants.map((variant: any) => ({
                            id: `variant-${variant.id}`,
                            sourceType: 'PRODUCT_VARIANT',
                            productId: product.id,
                            variantId: variant.id,
                            sku: variant.sku || product.sku || `VAR-${variant.id.slice(0, 6)}`,
                            name: `${product.name} (${variant.sku || 'Variant'})`,
                            category: product.category,
                            domain: product.domain || null,
                            quantity: Number(variant.stockQuantity || 0),
                            minStockLevel,
                            unitPrice: Number(variant.priceINR ?? product.priceINR ?? 0),
                            warehouse: null,
                        }));
                    }

                    const linked = product.sku ? inventoryBySku.get(product.sku) : null;
                    return [
                        {
                            id: `product-${product.id}`,
                            sourceType: 'PRODUCT',
                            productId: product.id,
                            variantId: null,
                            inventoryItemId: linked?.id || null,
                            sku: product.sku || `PROD-${product.id.slice(0, 6)}`,
                            name: product.name,
                            category: product.category,
                            domain: product.domain || null,
                            quantity: Number(linked?.quantity || 0),
                            minStockLevel: Number(linked?.minStockLevel ?? minStockLevel),
                            unitPrice: Number(linked?.unitPrice ?? product.priceINR ?? 0),
                            warehouse: linked?.warehouse || null,
                        },
                    ];
                });

            const warehouses = await prisma.warehouse.findMany({
                where: { ...(user.companyId ? { companyId: user.companyId } : {}) },
                select: { id: true, name: true, location: true },
            });

            return NextResponse.json({ inventory: rows, warehouses });
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
        const action = data.action;
        const companyId = user.companyId || data.companyId;

        if (action === 'ADJUST_PRODUCT_STOCK') {
            if (!companyId || !data.productId || !Number.isFinite(Number(data.delta))) {
                return NextResponse.json({ error: 'productId and delta are required.' }, { status: 400 });
            }

            const delta = Number(data.delta);
            const notes = data.notes || 'Manual stock adjustment from logistics inventory';

            if (data.variantId) {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: data.variantId },
                    include: { product: true },
                });
                if (!variant || variant.productId !== data.productId) {
                    return NextResponse.json({ error: 'Variant not found for product.' }, { status: 404 });
                }

                const current = Number(variant.stockQuantity || 0);
                const next = current + delta;
                if (next < 0) {
                    return NextResponse.json({ error: 'Stock cannot go below zero.' }, { status: 400 });
                }

                const updated = await prisma.productVariant.update({
                    where: { id: variant.id },
                    data: { stockQuantity: next },
                });

                await createAuditLog({
                    userId: user.id,
                    action: 'UPDATE',
                    entity: 'PRODUCT_VARIANT_STOCK',
                    entityId: variant.id,
                    changes: { previous: current, delta, current: next, notes },
                    ipAddress: req.headers.get('x-forwarded-for') || 'API',
                });

                return NextResponse.json({ success: true, item: updated });
            }

            const product = await prisma.invoiceProduct.findFirst({
                where: {
                    id: data.productId,
                    OR: [{ companyId }, { companyId: null }],
                },
            });
            if (!product) {
                return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
            }
            if (!product.sku) {
                return NextResponse.json({ error: 'Product SKU is required for stock tracking.' }, { status: 400 });
            }

            let item = await prisma.inventoryItem.findUnique({
                where: { sku_companyId: { sku: product.sku, companyId } },
            });

            if (!item) {
                item = await prisma.inventoryItem.create({
                    data: {
                        companyId,
                        sku: product.sku,
                        name: product.name,
                        category: product.category || 'GENERAL',
                        quantity: 0,
                        minStockLevel: Number((product.productAttributes as any)?.inventorySettings?.minStockLevel || 10),
                        unitPrice: Number(product.priceINR || 0),
                    },
                });
            }

            const next = Number(item.quantity || 0) + delta;
            if (next < 0) {
                return NextResponse.json({ error: 'Stock cannot go below zero.' }, { status: 400 });
            }

            const updatedItem = await prisma.inventoryItem.update({
                where: { id: item.id },
                data: { quantity: next },
            });

            await prisma.stockMovement.create({
                data: {
                    inventoryItemId: item.id,
                    type: delta >= 0 ? 'IN' : 'OUT',
                    quantity: Math.abs(delta),
                    notes,
                    referenceId: data.productId,
                    createdBy: user.id,
                },
            });

            await createAuditLog({
                userId: user.id,
                action: 'UPDATE',
                entity: 'PRODUCT_STOCK',
                entityId: data.productId,
                changes: { previous: item.quantity, delta, current: next, notes },
                ipAddress: req.headers.get('x-forwarded-for') || 'API',
            });

            return NextResponse.json({ success: true, item: updatedItem });
        }

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
