import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;

            const where: any = {};
            if (companyId) {
                where.companyId = companyId;
            }

            const templates = await prisma.employeeTaskTemplate.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    points: true,
                    designationId: true,
                    designationIds: true,
                    designation: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return NextResponse.json(templates);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
