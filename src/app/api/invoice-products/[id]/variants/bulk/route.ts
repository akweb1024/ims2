import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

const variantBulkUpdateSchema = z.array(z.object({
    id: z.string().uuid(),
    priceINR: z.number().min(0).optional().nullable(),
    priceUSD: z.number().min(0).optional().nullable(),
    stockQuantity: z.number().int().min(0).optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    manageStock: z.boolean().optional(),
}));

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            let body: any;
            try { body = await request.json(); } catch { throw new ValidationError('Invalid JSON'); }

            const parsed = variantBulkUpdateSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 422 });
            }
            const updates = parsed.data;

            const product = await db.invoiceProduct.findFirst({
                where: { id, OR: [{ companyId: user.companyId }, { companyId: null }] },
                include: { variants: true }
            });

            if (!product) throw new NotFoundError('Product not found or access denied');
            if (product.type !== 'VARIABLE') throw new ValidationError('Product must be of type VARIABLE to configure variants');

            // Unique SKU validation
            const skus = updates.map(u => u.sku).filter(Boolean);
            if (new Set(skus).size !== skus.length) {
                throw new ValidationError('Duplicate SKUs found in update payload');
            }

            if (skus.length > 0) {
                const existingItems = await db.productVariant.findMany({
                    where: { sku: { in: skus }, NOT: { id: { in: updates.map(u => u.id) } } }
                });
                if (existingItems.length > 0) throw new ValidationError(`SKU "${existingItems[0].sku}" is already in use by another variant`);
            }

            const results = await db.$transaction(async (tx: any) => {
                const promises = updates.map(update => {
                    const { id: variantId, ...data } = update;
                    return tx.productVariant.update({
                        where: { id: variantId },
                        data,
                    });
                });
                return Promise.all(promises);
            });

            logger.info('Variants bulk updated', {
                productId: id, variantCount: updates.length, userId: user.id
            });

            const refreshedProduct = await db.invoiceProduct.findUnique({
                where: { id },
                include: { variants: { include: { attributeValues: true } }, attributes: { include: { values: true } } }
            });

            return NextResponse.json(refreshedProduct);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
