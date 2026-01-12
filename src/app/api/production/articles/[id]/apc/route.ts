import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { pathname } = new URL(req.url);
            // URL format: /api/production/articles/[id]/apc
            const segments = pathname.split('/');
            const id = segments[segments.length - 2];
            const body = await req.json();

            const existing = await prisma.article.findUnique({
                where: { id },
                include: { journal: true }
            });

            if (!existing) return createErrorResponse('Article not found', 404);

            const updated = await prisma.article.update({
                where: { id },
                data: {
                    apcType: body.apcType,
                    apcAmountINR: body.apcAmountINR ? parseFloat(body.apcAmountINR) : undefined,
                    apcAmountUSD: body.apcAmountUSD ? parseFloat(body.apcAmountUSD) : undefined,
                    apcPaymentStatus: body.apcPaymentStatus,
                    apcInvoiceId: body.apcInvoiceId
                }
            });

            // Log Audit
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'update',
                    entity: 'article_apc',
                    entityId: updated.id,
                    changes: JSON.stringify(body)
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
