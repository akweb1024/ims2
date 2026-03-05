import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

// ─── Validation ────────────────────────────────────────────────────────────
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

const productCreateSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(300),
    category: z.enum(CATEGORIES).optional().default('MISC'),
    pricingModel: z.enum(PRICING_MODELS).optional().default('FIXED'),
    description: z.string().max(2000).optional().nullable(),
    shortDesc: z.string().max(300).optional().nullable(),
    priceINR: z.number().min(0).optional().default(0),
    priceUSD: z.number().min(0).optional().default(0),
    priceTiers: z.array(priceTierSchema).optional().nullable(),
    taxRate: z.number().min(0).max(100).optional().default(18),
    taxIncluded: z.boolean().optional().default(false),
    hsnCode: z.string().max(20).optional().nullable(),
    sacCode: z.string().max(20).optional().nullable(),
    billingCycle: z.enum(BILLING_CYCLES).optional().nullable(),
    unit: z.string().max(50).optional().default('unit'),
    minQuantity: z.number().int().min(1).optional().default(1),
    maxQuantity: z.number().int().optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    journalId: z.string().uuid().optional().nullable(),
    courseId: z.string().uuid().optional().nullable(),
    workshopId: z.string().uuid().optional().nullable(),
    certificateId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional().default(true),
    isFeatured: z.boolean().optional().default(false),
    tags: z.array(z.string().max(50)).max(20).optional().default([]),
    notes: z.string().max(1000).optional().nullable(),
});

const productUpdateSchema = productCreateSchema.partial().omit({ name: true }).extend({
    name: z.string().min(1).max(300).optional(),
});

// ─── GET: List / Search products ──────────────────────────────────────────
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(request.url);
            const q = searchParams.get('q')?.trim();
            const category = searchParams.get('category');
            const pricingModel = searchParams.get('pricingModel');
            const isActive = searchParams.get('isActive');
            const isFeatured = searchParams.get('isFeatured');
            const tags = searchParams.get('tags')?.split(',').filter(Boolean);
            const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
            const pageSize = Math.min(Math.max(1, parseInt(searchParams.get('pageSize') || '20')), 100);
            const sortBy = searchParams.get('sortBy') || 'createdAt';
            const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

            const where: any = {
                OR: [{ companyId: user.companyId }, { companyId: null }],
            };

            if (q) {
                where.AND = [{
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { shortDesc: { contains: q, mode: 'insensitive' } },
                        { description: { contains: q, mode: 'insensitive' } },
                        { sku: { contains: q, mode: 'insensitive' } },
                        { hsnCode: { contains: q, mode: 'insensitive' } },
                    ]
                }];
            }

            if (category && CATEGORIES.includes(category as any)) where.category = category;
            if (pricingModel && PRICING_MODELS.includes(pricingModel as any)) where.pricingModel = pricingModel;
            if (isActive !== null && isActive !== undefined && isActive !== '')
                where.isActive = isActive === 'true';
            if (isFeatured === 'true') where.isFeatured = true;
            if (tags && tags.length > 0) where.tags = { hasSome: tags };

            const validSortFields = ['name', 'priceINR', 'priceUSD', 'category', 'createdAt', 'updatedAt'];
            const orderBy = validSortFields.includes(sortBy) ? { [sortBy]: sortDir } : { createdAt: 'desc' as const };

            const [products, total] = await Promise.all([
                db.invoiceProduct.findMany({
                    where,
                    orderBy,
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                }),
                db.invoiceProduct.count({ where }),
            ]);

            // Return category summary counts too (for filter UI)
            const categoryCounts = await db.invoiceProduct.groupBy({
                by: ['category'],
                where: { OR: [{ companyId: user.companyId }, { companyId: null }] },
                _count: { id: true },
            });

            return NextResponse.json({
                data: products,
                pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
                categoryCounts: Object.fromEntries(
                    categoryCounts.map((c: any) => [c.category, c._count.id])
                ),
            });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── POST: Create product ─────────────────────────────────────────────────
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any) => {
        try {
            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            const parsed = productCreateSchema.safeParse(body);
            if (!parsed.success) {
                const errors: Record<string, string> = {};
                parsed.error.issues.forEach(i => { errors[i.path.join('.')] = i.message; });
                return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 });
            }
            const input = parsed.data;

            // SKU uniqueness check
            if (input.sku) {
                const existing = await db.invoiceProduct.findUnique({ where: { sku: input.sku } });
                if (existing) throw new ValidationError(`SKU "${input.sku}" is already in use`);
            }

            const product = await db.invoiceProduct.create({
                data: {
                    ...input,
                    priceTiers: input.priceTiers ?? undefined,
                    companyId: user.companyId,
                    createdByUserId: user.id,
                }
            });

            logger.info('Invoice product created', {
                productId: product.id, name: product.name, category: product.category, userId: user.id,
            });

            return NextResponse.json(product, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// ─── POST /bulk: Bulk operations ──────────────────────────────────────────
// NOTE: this is a special sub-handler checked via searchParam ?action=bulk
// Accessed via POST /api/invoice-products?action=bulk
