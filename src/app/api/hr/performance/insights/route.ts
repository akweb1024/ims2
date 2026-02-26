import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET: Fetch insights for the company or a specific employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            let employeeId = searchParams.get('employeeId');

            if (user.role === 'EXECUTIVE') {
                const profile = await prisma.employeeProfile.findFirst({ where: { userId: user.id } });
                if (!profile) return NextResponse.json([]);
                employeeId = profile.id;
            }

            if (!employeeId) {
                // Fetch general insights for the company
                const insights = await prisma.performanceInsight.findMany({
                    where: { companyId: user.companyId || undefined },
                    orderBy: { date: 'desc' },
                    take: 20
                });
                return NextResponse.json(insights);
            }

            // Fetch specific insights for an employee
            const insights = await prisma.performanceInsight.findMany({
                where: { employeeId },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(insights);
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
            const { employeeId, content, type } = body;

            if (!employeeId || !content) {
                return createErrorResponse('Missing required fields', 400);
            }

            const insight = await prisma.performanceInsight.create({
                data: {
                    employeeId,
                    content,
                    type: type || 'SUGGESTION',
                    companyId: user.companyId!
                }
            });

            return NextResponse.json(insight);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
