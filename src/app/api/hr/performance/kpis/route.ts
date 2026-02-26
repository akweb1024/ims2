import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET: Fetch KPIs for the company or a specific employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            const where: any = {};
            if (user.companyId) where.companyId = user.companyId;

            if (user.role === 'EXECUTIVE' || employeeId === 'self') {
                const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            } else if (employeeId) {
                where.employeeId = employeeId;
            }

            const kpis = await prisma.employeeKPI.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return NextResponse.json(kpis);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Create or Update KPI
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);
            const body = await req.json();
            const { id, employeeId, title, target, current, unit, period, category } = body;

            if (!employeeId || !title || target === undefined) {
                return createErrorResponse('Missing required fields', 400);
            }

            if (id) {
                const updated = await prisma.employeeKPI.update({
                    where: { id },
                    data: { title, target: parseFloat(target), current: parseFloat(current || 0), unit, period, category }
                });
                return NextResponse.json(updated);
            } else {
                const created = await prisma.employeeKPI.create({
                    data: {
                        companyId: user.companyId,
                        employeeId,
                        title,
                        target: parseFloat(target),
                        current: parseFloat(current || 0),
                        unit,
                        period,
                        category: category || 'GENERAL'
                    }
                });
                return NextResponse.json(created);
            }
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE: Remove a KPI
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');
            if (!id) return createErrorResponse('ID required', 400);

            await prisma.employeeKPI.delete({ where: { id } });
            return NextResponse.json({ message: 'KPI deleted' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
