import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);

            const config = await prisma.statutoryConfig.findUnique({
                where: { companyId: user.companyId }
            });

            return NextResponse.json(config || {
                pfEmployeeRate: 12.0,
                pfEmployerRate: 12.0,
                pfCeilingAmount: 15000.0,
                pfAdminCharges: 0.5,
                esicEmployeeRate: 0.75,
                esicEmployerRate: 3.25,
                esicLimitAmount: 21000.0,
                ptEnabled: true
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);
            const body = await req.json();

            const config = await prisma.statutoryConfig.upsert({
                where: { companyId: user.companyId },
                update: {
                    pfEmployeeRate: body.pfEmployeeRate,
                    pfEmployerRate: body.pfEmployerRate,
                    pfCeilingAmount: body.pfCeilingAmount,
                    pfAdminCharges: body.pfAdminCharges,
                    esicEmployeeRate: body.esicEmployeeRate,
                    esicEmployerRate: body.esicEmployerRate,
                    esicLimitAmount: body.esicLimitAmount,
                    ptEnabled: body.ptEnabled,
                    state: body.state
                },
                create: {
                    companyId: user.companyId,
                    pfEmployeeRate: body.pfEmployeeRate ?? 12.0,
                    pfEmployerRate: body.pfEmployerRate ?? 12.0,
                    pfCeilingAmount: body.pfCeilingAmount ?? 15000.0,
                    pfAdminCharges: body.pfAdminCharges ?? 0.5,
                    esicEmployeeRate: body.esicEmployeeRate ?? 0.75,
                    esicEmployerRate: body.esicEmployerRate ?? 3.25,
                    esicLimitAmount: body.esicLimitAmount ?? 21000.0,
                    ptEnabled: body.ptEnabled ?? true,
                    state: body.state
                }
            });

            return NextResponse.json(config);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
