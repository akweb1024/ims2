import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

const variantUpdateSchema = z.object({
    priceINR: z.number().min(0).optional().nullable(),
    priceUSD: z.number().min(0).optional().nullable(),
    stockQuantity: z.number().int().min(0).optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    manageStock: z.boolean().optional(),
});

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id, variantId } = await context.params;
            let body: any;
            try { body = await request.json(); } catch { throw new ValidationError('Invalid JSON'); }

            const parsed = variantUpdateSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 422 });
            }
            const data = parsed.data;

            const product = await db.invoiceProduct.findFirst({
                where: { id, OR: [{ companyId: user.companyId }, { companyId: null }] },
                include: { variants: true }
            });

            if (!product) throw new NotFoundError('Product not found or access denied');
            if (product.type !== 'VARIABLE') throw new ValidationError('Product must be of type VARIABLE to configure variants');

            const variantExists = product.variants.some((v: any) => v.id === variantId);
            if (!variantExists) throw new NotFoundError('Variant not found on this product');

            if (data.sku) {
                const existingItem = await db.productVariant.findFirst({
                    where: { sku: data.sku, NOT: { id: variantId } }
                });
                if (existingItem) throw new ValidationError(`SKU "${data.sku}" is already in use`);
            }

            const variant = await db.productVariant.update({
                where: { id: variantId },
                data,
                include: { attributeValues: true }
            });

            logger.info('Variant updated', {
                productId: id, variantId, userId: user.id
            });

            return NextResponse.json(variant);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
