import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bonusSchemaValidator } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company ID required', 403);

            const schemas = await prisma.bonusSchema.findMany({
                where: { companyId: user.companyId },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(schemas);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const result = bonusSchemaValidator.safeParse(body);

            if (!result.success) return createErrorResponse(result.error);
            if (!user.companyId) return createErrorResponse('Company ID required', 403);

            const schema = await prisma.bonusSchema.create({
                data: {
                    ...result.data,
                    companyId: user.companyId
                }
            });

            return NextResponse.json(schema);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
