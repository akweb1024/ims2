import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const queryCompanyId = searchParams.get('companyId');

            const where: any = {};

            const targetCompanyId = queryCompanyId || user.companyId;

            if (targetCompanyId) {
                where.companies = {
                    some: { id: targetCompanyId }
                };
            }

            const designations = await prisma.designation.findMany({
                where,
                include: {
                    companies: { select: { id: true, name: true } },
                    departments: { select: { id: true, name: true } }
                },
                orderBy: { level: 'asc' }
            });

            return NextResponse.json(designations);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) return createErrorResponse('No company context', 400);
            const body = await req.json();
            const {
                name, code, jobDescription, kra,
                expectedExperience, promotionWaitPeriod, incrementGuidelines, level,
                companyIds, departmentIds
            } = body;

            if (!name) return createErrorResponse('Name is required', 400);

            // Default to current company if no companyIds provided
            const companiesToConnect = (companyIds && Array.isArray(companyIds) && companyIds.length > 0)
                ? companyIds.map((id: string) => ({ id }))
                : [{ id: companyId }];

            const departmentsToConnect = (departmentIds && Array.isArray(departmentIds))
                ? departmentIds.map((id: string) => ({ id }))
                : [];

            const designation = await prisma.designation.create({
                data: {
                    name,
                    code,
                    jobDescription,
                    kra,
                    expectedExperience: parseFloat(expectedExperience) || 0,
                    promotionWaitPeriod: parseInt(promotionWaitPeriod) || 12,
                    incrementGuidelines,
                    level: parseInt(level) || 1,
                    companies: {
                        connect: companiesToConnect
                    },
                    departments: {
                        connect: departmentsToConnect
                    }
                },
                include: {
                    companies: true,
                    departments: true
                }
            });

            return NextResponse.json(designation);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
