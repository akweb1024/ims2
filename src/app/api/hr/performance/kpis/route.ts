import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

// GET: Fetch KPIs for the company or a specific employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const periodParam = (searchParams.get('period') || '').toUpperCase();
            const allowedPeriods = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

            const where: any = {};
            if (user.companyId) where.companyId = user.companyId;
            if (allowedPeriods.has(periodParam)) where.period = periodParam;

            const selfProfile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });

            // Resolve self for employee/executive default access
            if (employeeId === 'self' || (!employeeId && ['EXECUTIVE', 'EMPLOYEE'].includes(user.role))) {
                if (!selfProfile) return NextResponse.json([]);
                where.employeeId = selfProfile.id;
            } else if (employeeId) {
                const targetProfile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [{ id: employeeId }, { userId: employeeId }],
                    },
                    select: { id: true, userId: true },
                });

                if (!targetProfile) return createErrorResponse('Employee not found', 404);

                // Strict self-only for non-managerial staff
                if (['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
                    if (!selfProfile || targetProfile.id !== selfProfile.id) {
                        return createErrorResponse('Forbidden: You can only view your own KPIs', 403);
                    }
                }

                // Manager/TL can only see own hierarchy
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                    if (!downline.includes(targetProfile.userId) && targetProfile.userId !== user.id) {
                        return createErrorResponse('Forbidden: Employee is not in your team', 403);
                    }
                }

                where.employeeId = targetProfile.id;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role) && selfProfile) {
                // Default manager view: own KPIs + team KPIs
                const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                const profiles = await prisma.employeeProfile.findMany({
                    where: { userId: { in: downline } },
                    select: { id: true },
                });
                where.employeeId = { in: profiles.map((p) => p.id) };
            } else if (['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
                if (!selfProfile) return NextResponse.json([]);
                where.employeeId = selfProfile.id;
            } else if (!employeeId) {
                // Admin/HR with no employeeId: company-wide KPI list
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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);
            const body = await req.json();
            const { id, employeeId, title, target, current, unit, period, category } = body;

            if (!employeeId || !title || target === undefined) {
                return createErrorResponse('Missing required fields', 400);
            }

            const targetProfile = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [{ id: employeeId }, { userId: employeeId }],
                },
                select: { id: true, userId: true },
            });
            if (!targetProfile) return createErrorResponse('Employee not found', 404);

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!downline.includes(targetProfile.userId) && targetProfile.userId !== user.id) {
                    return createErrorResponse('Forbidden: Employee is not in your team', 403);
                }
            } else if (user.role !== 'SUPER_ADMIN') {
                const targetUser = await prisma.user.findUnique({
                    where: { id: targetProfile.userId },
                    select: { companyId: true },
                });
                if (!targetUser || targetUser.companyId !== user.companyId) {
                    return createErrorResponse('Forbidden: Cross-company access denied', 403);
                }
            }

            if (id) {
                const existingKpi = await prisma.employeeKPI.findUnique({
                    where: { id: String(id) },
                    select: { id: true, employeeId: true },
                });
                if (!existingKpi) return createErrorResponse('KPI not found', 404);
                if (existingKpi.employeeId !== targetProfile.id) {
                    return createErrorResponse('Forbidden: KPI does not belong to target employee', 403);
                }
                const updated = await prisma.employeeKPI.update({
                    where: { id: String(id) },
                    data: { title, target: parseFloat(target), current: parseFloat(current || 0), unit, period, category }
                });
                return NextResponse.json(updated);
            } else {
                const created = await prisma.employeeKPI.create({
                    data: {
                        companyId: user.companyId,
                        employeeId: targetProfile.id,
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
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
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
