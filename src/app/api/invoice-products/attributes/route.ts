import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { z } from 'zod';

const db = prisma as any;

const termSchema = z.object({
    id: z.string().optional(),
    value: z.string().min(1)
});

const attributeSchema = z.object({
    name: z.string().min(1, 'Attribute name is required').max(100),
    productId: z.string().optional(),  // optional — for global attribute management
    terms: z.array(termSchema).optional().default([]),
});

// GET /api/invoice-products/attributes
// Returns all ProductAttributes with their values (global across all products)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (request: NextRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const productId = searchParams.get('productId');

            const where: any = productId ? { productId } : {};

            const attributes = await db.productAttribute.findMany({
                where,
                include: { values: { orderBy: { value: 'asc' } } },
                orderBy: { name: 'asc' }
            });

            return NextResponse.json(attributes);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

// POST /api/invoice-products/attributes
// Create a new attribute (with optional terms/values)
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest) => {
        try {
            const body = await request.json();
            const parsed = attributeSchema.safeParse(body);
            if (!parsed.success) throw new ValidationError('Invalid request payload');
            const data = parsed.data;

            if (!data.productId) {
                throw new ValidationError('productId is required to create an attribute.');
            }

            // Check uniqueness: [productId, name]
            const existing = await db.productAttribute.findFirst({
                where: { productId: data.productId, name: data.name }
            });
            if (existing) throw new ValidationError(`Attribute "${data.name}" already exists for this product.`);

            const attribute = await db.productAttribute.create({
                data: {
                    productId: data.productId,
                    name: data.name,
                    values: {
                        create: data.terms.map((t: any) => ({ value: t.value }))
                    }
                },
                include: { values: true }
            });

            return NextResponse.json(attribute, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
