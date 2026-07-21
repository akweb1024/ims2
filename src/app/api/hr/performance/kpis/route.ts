import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { normalizeKpis, upsertEmployeeKpis } from '@/lib/hr/employee-kpis';
import { companyScopeWhere } from '@/lib/company-scope';

// GET: Fetch KPIs for the company or a specific employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'EXECUTIVE', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const periodParam = (searchParams.get('period') || '').toUpperCase();
            const allowedPeriods = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

            // KRA truth is EmployeeGoal (unification); `period` maps onto the
            // goal's period type. Response keeps the legacy KPI shape.
            const where: any = { isKra: true };
            Object.assign(where, companyScopeWhere(user));
            if (allowedPeriods.has(periodParam)) where.type = periodParam;

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

            const goals = await prisma.employeeGoal.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            // Legacy KPI response shape, sourced from the canonical goals.
            return NextResponse.json(goals.map((g) => ({
                id: g.id,
                employeeId: g.employeeId,
                companyId: g.companyId,
                title: g.title,
                target: g.targetValue,
                current: g.currentValue,
                unit: g.unit,
                period: g.type as string,
                category: (g.dimension as string | null) ?? 'GENERAL',
                createdAt: g.createdAt,
                updatedAt: g.updatedAt,
                employee: g.employee,
            })));
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

            // The GET now serves canonical EmployeeGoal rows, so an incoming id
            // may be a goal id. Resolve it to the linked legacy row (kpiId) so
            // the unified write path can id-match; fall back to title matching.
            let legacyId: string | undefined;
            if (id) {
                const goal = await prisma.employeeGoal.findUnique({
                    where: { id: String(id) },
                    select: { id: true, employeeId: true, kpiId: true },
                });
                if (goal) {
                    if (goal.employeeId !== targetProfile.id) {
                        return createErrorResponse('Forbidden: KPI does not belong to target employee', 403);
                    }
                    legacyId = goal.kpiId ?? undefined;
                } else {
                    const existingKpi = await prisma.employeeKPI.findUnique({
                        where: { id: String(id) },
                        select: { id: true, employeeId: true },
                    });
                    if (!existingKpi) return createErrorResponse('KPI not found', 404);
                    if (existingKpi.employeeId !== targetProfile.id) {
                        return createErrorResponse('Forbidden: KPI does not belong to target employee', 403);
                    }
                    legacyId = existingKpi.id;
                }
            }

            // Unified KPI write path: validates period/unit/target, matches by
            // id-or-title (no duplicates), uses the EMPLOYEE's companyId, and
            // mirrors into the canonical EmployeeGoal via the LEGACY_SYNC bridge.
            const normalized = normalizeKpis([{ id: legacyId, title, target, current, unit, period, category }]);
            if (normalized.length === 0) {
                return createErrorResponse('Invalid KPI: title and a positive target are required', 400);
            }
            await upsertEmployeeKpis(prisma, { employeeId: targetProfile.id, kpis: normalized });

            // Respond with the canonical goal (same shape the GET serves).
            const savedGoal = await prisma.employeeGoal.findFirst({
                where: { employeeId: targetProfile.id, title: normalized[0].title, isKra: true },
                orderBy: { updatedAt: 'desc' },
            });
            if (savedGoal) {
                return NextResponse.json({
                    id: savedGoal.id,
                    employeeId: savedGoal.employeeId,
                    companyId: savedGoal.companyId,
                    title: savedGoal.title,
                    target: savedGoal.targetValue,
                    current: savedGoal.currentValue,
                    unit: savedGoal.unit,
                    period: savedGoal.type as string,
                    category: (savedGoal.dimension as string | null) ?? 'GENERAL',
                    createdAt: savedGoal.createdAt,
                    updatedAt: savedGoal.updatedAt,
                });
            }
            const saved = await prisma.employeeKPI.findFirst({
                where: { employeeId: targetProfile.id, title: normalized[0].title },
            });
            return NextResponse.json(saved);
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

            const scopeOk = (companyId: string | null) =>
                user.role === 'SUPER_ADMIN' || (companyId && companyId === user.companyId);

            // The id may be a canonical goal id (what the GET serves) or a
            // legacy EmployeeKPI id. Delete the pair together so the two
            // layers cannot drift apart.
            const goal = await prisma.employeeGoal.findUnique({
                where: { id },
                select: { id: true, kpiId: true, companyId: true },
            });
            if (goal) {
                if (!scopeOk(goal.companyId)) return createErrorResponse('Forbidden', 403);
                await prisma.employeeGoal.delete({ where: { id: goal.id } });
                if (goal.kpiId) await prisma.employeeKPI.deleteMany({ where: { id: goal.kpiId } });
                return NextResponse.json({ message: 'KPI deleted' });
            }

            const kpi = await prisma.employeeKPI.findUnique({ where: { id }, select: { id: true, companyId: true } });
            if (!kpi) return createErrorResponse('KPI not found', 404);
            if (!scopeOk(kpi.companyId)) return createErrorResponse('Forbidden', 403);
            await prisma.employeeGoal.deleteMany({ where: { kpiId: kpi.id } });
            await prisma.employeeKPI.delete({ where: { id: kpi.id } });
            return NextResponse.json({ message: 'KPI deleted' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
