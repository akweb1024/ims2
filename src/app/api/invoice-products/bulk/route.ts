import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

/**
 * POST /api/invoice-products/bulk
 * Supports: activate, deactivate, delete (soft: deactivate), feature, unfeature
 * Body: { action: 'ACTIVATE' | 'DEACTIVATE' | 'DELETE' | 'FEATURE' | 'UNFEATURE', ids: string[] }
 */

const bulkSchema = z.object({
    action: z.enum(['ACTIVATE', 'DEACTIVATE', 'DELETE', 'FEATURE', 'UNFEATURE']),
    ids: z.array(z.string().uuid()).min(1).max(100),
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
            const { action, ids } = parsed.data;

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
