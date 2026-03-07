import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

const db = prisma as any;

/**
 * GET /api/invoice-products/attributes
 * Returns all unique attribute names + their distinct values across all products.
 * Used by the frontend to power global attribute filters / pickers.
 */
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any) => {
        try {
            const attributes = await db.productAttribute.findMany({
                where: user.companyId
                    ? { product: { OR: [{ companyId: user.companyId }, { companyId: null }] } }
                    : {},
                include: { values: { orderBy: { value: 'asc' } } },
                orderBy: { name: 'asc' },
            });

            // Deduplicate by name across products so the frontend gets a clean list
            const grouped: Record<string, { name: string; values: string[] }> = {};
            for (const attr of attributes) {
                if (!grouped[attr.name]) grouped[attr.name] = { name: attr.name, values: [] };
                for (const v of attr.values) {
                    if (!grouped[attr.name].values.includes(v.value)) {
                        grouped[attr.name].values.push(v.value);
                    }
                }
            }

            return NextResponse.json(Object.values(grouped));
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
