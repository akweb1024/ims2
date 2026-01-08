import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) return createErrorResponse('No company context', 400);

            const departments = await prisma.department.findMany({
                where: { companyId },
                orderBy: { name: 'asc' }
            });

            return NextResponse.json(departments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Allow SUPER_ADMIN to specify companyId, otherwise use user's company context
            let companyId = user.companyId;
            if (user.role === 'SUPER_ADMIN' && body.companyId) {
                companyId = body.companyId;
            }

            if (!companyId) return createErrorResponse('No company context. Super Admins must provide companyId.', 400);

            const { name, code, description } = body;

            if (!name) return createErrorResponse('Name is required', 400);

            const department = await prisma.department.create({
                data: {
                    companyId,
                    name,
                    code,
                    description
                }
            });

            return NextResponse.json(department);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
