import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;
const CATEGORIES = [
    'JOURNAL_SUBSCRIPTION',
    'COURSE',
    'WORKSHOP',
    'DOI_SERVICE',
    'APC',
    'CERTIFICATE',
    'DIGITAL_SERVICE',
    'MISC',
] as const;
const PRICING_MODELS = ['FIXED', 'TIERED', 'VOLUME', 'CUSTOM'] as const;
const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'] as const;

/**
 * POST /api/invoice-products/bulk
 * Supports: activate, deactivate, delete, feature, unfeature, edit
 */

const bulkEditChangesSchema = z.object({
    category: z.enum(CATEGORIES).optional(),
    pricingModel: z.enum(PRICING_MODELS).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    billingCycle: z.enum(BILLING_CYCLES).nullable().optional(),
    domain: z.string().max(200).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    taxIncluded: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for bulk edit',
});

const bulkSchema = z.object({
    action: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE', 'FEATURE', 'UNFEATURE', 'EDIT']),
    ids: z.array(z.string().uuid()).min(1).max(100),
    changes: bulkEditChangesSchema.optional(),
}).superRefine((value, ctx) => {
    if (value.action === 'EDIT' && !value.changes) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['changes'],
            message: 'Bulk edit changes are required',
        });
    }
});

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest, user: any) => {
        try {
            let body: any;
            try { body = await request.json(); } catch {
                throw new ValidationError('Invalid JSON in request body');
            }

            const parsed = bulkSchema.safeParse(body);
            if (!parsed.success) {
                const errors: Record<string, string> = {};
                parsed.error.issues.forEach(i => { errors[i.path.join('.')] = i.message; });
                return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 422 });
            }
            const { action, ids, changes } = parsed.data;

            // Verify all IDs belong to this company
            const products = await db.invoiceProduct.findMany({
                where: {
                    id: { in: ids },
                    OR: [{ companyId: user.companyId }, { companyId: null }],
                },
                select: { id: true }
            });

            const validIds = products.map((p: any) => p.id);
            const unauthorizedIds = ids.filter((id: string) => !validIds.includes(id));

            if (unauthorizedIds.length > 0) {
                throw new ValidationError(
                    `${unauthorizedIds.length} product(s) not found or access denied`
                );
            }

            let result: any;

            if (action === 'DELETE') {
                result = await db.invoiceProduct.deleteMany({
                    where: { id: { in: validIds } },
                });
                logger.info('Bulk delete invoice products', {
                    count: result.count, userId: user.id,
                });
                return NextResponse.json({ success: true, affected: result.count, action });
            }

            if (action === 'EDIT') {
                const updateData = {
                    ...(changes?.category !== undefined ? { category: changes.category } : {}),
                    ...(changes?.pricingModel !== undefined ? { pricingModel: changes.pricingModel } : {}),
                    ...(changes?.taxRate !== undefined ? { taxRate: changes.taxRate } : {}),
                    ...(changes?.billingCycle !== undefined ? { billingCycle: changes.billingCycle } : {}),
                    ...(changes?.domain !== undefined ? { domain: changes.domain } : {}),
                    ...(changes?.notes !== undefined ? { notes: changes.notes } : {}),
                    ...(changes?.isActive !== undefined ? { isActive: changes.isActive } : {}),
                    ...(changes?.isFeatured !== undefined ? { isFeatured: changes.isFeatured } : {}),
                    ...(changes?.taxIncluded !== undefined ? { taxIncluded: changes.taxIncluded } : {}),
                    updatedByUserId: user.id,
                };

                result = await db.invoiceProduct.updateMany({
                    where: { id: { in: validIds } },
                    data: updateData,
                });

                logger.info('Bulk edit invoice products', {
                    count: result.count,
                    userId: user.id,
                    changedFields: Object.keys(changes || {}),
                });

                return NextResponse.json({
                    success: true,
                    affected: result.count,
                    action,
                });
            }

            const dataMap: Record<string, any> = {
                ACTIVATE: { isActive: true },
                DEACTIVATE: { isActive: false },
                FEATURE: { isFeatured: true },
                UNFEATURE: { isFeatured: false },
            };

            result = await db.invoiceProduct.updateMany({
                where: { id: { in: validIds } },
                data: { ...dataMap[action], updatedByUserId: user.id },
            });

            logger.info('Bulk update invoice products', {
                action, count: result.count, userId: user.id,
            });

            return NextResponse.json({ success: true, affected: result.count, action });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
