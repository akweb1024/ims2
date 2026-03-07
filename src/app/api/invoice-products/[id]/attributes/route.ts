import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const db = prisma as any;

const createAttributeSchema = z.object({
    name: z.string().min(1).max(100),
    values: z.array(z.string().min(1)).min(1),
});

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (request: NextRequest, user: any, context?: any) => {
        try {
            const { id } = await context.params;
            let body: any;
            try { body = await request.json(); } catch { throw new ValidationError('Invalid JSON'); }

            const parsed = createAttributeSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 422 });
            }
            const { name, values } = parsed.data;

            // Ensure product exists and caller has access
            const product = await db.invoiceProduct.findFirst({
                where: { id, OR: [{ companyId: user.companyId }, { companyId: null }] },
                include: { attributes: { include: { values: true } } }
            });
            if (!product) throw new NotFoundError('Product not found');
            if (product.type !== 'VARIABLE') throw new ValidationError('Product must be of type VARIABLE to have attributes');

            // Find or create attribute
            let attribute = await db.productAttribute.findFirst({
                where: { productId: id, name: { equals: name, mode: 'insensitive' } },
                include: { values: true }
            });

            if (!attribute) {
                attribute = await db.productAttribute.create({
                    data: {
                        productId: id,
                        name: name,
                    },
                    include: { values: true }
                });
            }

            // Upsert values
            const existingValues = new Set(attribute.values.map((v: any) => v.value.toLowerCase()));
            const newValues = values.filter(v => !existingValues.has(v.toLowerCase()));

            if (newValues.length > 0) {
                await db.productAttributeValue.createMany({
                    data: newValues.map(v => ({
                        attributeId: attribute.id,
                        value: v,
                    }))
                });
            }

            const updatedAttribute = await db.productAttribute.findUnique({
                where: { id: attribute.id },
                include: { values: true }
            });

            return NextResponse.json(updatedAttribute, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
