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
    terms: z.array(termSchema).optional().default([]),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    async (request: NextRequest) => {
        try {
            const attributes = await db.productAttribute.findMany({
                include: { terms: { orderBy: { value: 'asc' } } },
                orderBy: { name: 'asc' }
            });
            return NextResponse.json(attributes);
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER'],
    async (request: NextRequest) => {
        try {
            const body = await request.json();
            const parsed = attributeSchema.safeParse(body);
            if (!parsed.success) throw new ValidationError('Invalid request payload');
            const data = parsed.data;

            const existing = await db.productAttribute.findUnique({ where: { name: data.name } });
            if (existing) throw new ValidationError(`Attribute with name "${data.name}" already exists.`);

            const attribute = await db.productAttribute.create({
                data: {
                    name: data.name,
                    terms: {
                        create: data.terms.map(t => ({ value: t.value }))
                    }
                },
                include: { terms: true }
            });

            return NextResponse.json(attribute, { status: 201 });
        } catch (error) {
            return handleApiError(error, request.nextUrl.pathname);
        }
    }
);
