import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

const CATEGORIES = [
    'JOURNAL_SUBSCRIPTION', 'COURSE', 'WORKSHOP',
    'DOI_SERVICE', 'APC', 'CERTIFICATE', 'DIGITAL_SERVICE', 'MISC'
] as const;
const PRICING_MODELS = ['FIXED', 'TIERED', 'VOLUME', 'CUSTOM'] as const;
const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'] as const;

const priceTierSchema = z.object({
    minQty: z.number().int().min(1),
    maxQty: z.number().int().optional().nullable(),
    priceINR: z.number().min(0),
    priceUSD: z.number().min(0),
    label: z.string().optional(),
});

const updateSchema = z.object({
    name: z.string().min(1).max(300).optional(),
    category: z.enum(CATEGORIES).optional(),
    pricingModel: z.enum(PRICING_MODELS).optional(),
    description: z.string().max(2000).optional().nullable(),
    shortDesc: z.string().max(300).optional().nullable(),
    priceINR: z.number().min(0).optional(),
    priceUSD: z.number().min(0).optional(),
    priceTiers: z.array(priceTierSchema).optional().nullable(),
    taxRate: z.number().min(0).max(100).optional(),
    taxIncluded: z.boolean().optional(),
    hsnCode: z.string().max(20).optional().nullable(),
    sacCode: z.string().max(20).optional().nullable(),
    billingCycle: z.enum(BILLING_CYCLES).optional().nullable(),
    unit: z.string().max(50).optional(),
    minQuantity: z.number().int().min(1).optional(),
    maxQuantity: z.number().int().optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    journalId: z.string().uuid().optional().nullable(),
    courseId: z.string().uuid().optional().nullable(),
    workshopId: z.string().uuid().optional().nullable(),
    certificateId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    notes: z.string().max(1000).optional().nullable(),
});

// ─── GET single product ───────────────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            const product = await db.invoiceProduct.findFirst({
                where: {
                    id,
                    OR: [{ companyId: user.companyId }, { companyId: null }],
                }
            });

            if (!product) throw new NotFoundError('Invoice product not found');

            return NextResponse.json(product);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── PATCH: Update product ────────────────────────────────────────────────
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            const parsed = updateSchema.safeParse(body);
            if (!parsed.success) {
                const errors: Record<string, string> = {};
                parsed.error.issues.forEach(i => { errors[i.path.join('.')] = i.message; });
                return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 });
            }
            const input = parsed.data;

            const product = await db.invoiceProduct.findFirst({
                where: {
                    id,
                    OR: [{ companyId: user.companyId }, { companyId: null }],
                }
            });

            if (!product) throw new NotFoundError('Invoice product not found');

            // SKU uniqueness check (if changing SKU)
            if (input.sku && input.sku !== product.sku) {
                const existing = await db.invoiceProduct.findFirst({
                    where: { sku: input.sku, id: { not: id } }
                });
                if (existing) throw new ValidationError(`SKU "${input.sku}" is already in use`);
            }

            const updated = await db.invoiceProduct.update({
                where: { id },
                data: {
                    ...input,
                    priceTiers: input.priceTiers !== undefined ? input.priceTiers ?? undefined : undefined,
                    updatedByUserId: user.id,
                }
            });

            logger.info('Invoice product updated', {
                productId: id, userId: user.id,
                updatedFields: Object.keys(body),
            });

            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── DELETE: Remove product ───────────────────────────────────────────────
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;

            const product = await db.invoiceProduct.findFirst({
                where: {
                    id,
                    OR: [{ companyId: user.companyId }, { companyId: null }],
                }
            });

            if (!product) throw new NotFoundError('Invoice product not found');

            await db.invoiceProduct.delete({ where: { id } });

            logger.info('Invoice product deleted', {
                productId: id, name: product.name, userId: user.id,
            });

            return NextResponse.json({ success: true, deleted: id });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
