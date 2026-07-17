import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { generateTodayAgendaForEmployees } from '@/lib/hr/work-agenda-generator';
import { companyScopeWhere } from '@/lib/company-scope';
import { normalizeKpis, upsertEmployeeKpis } from '@/lib/hr/employee-kpis';

const MANAGERIAL_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'HR_MANAGER',
    'MANAGER',
    'TEAM_LEADER',
]);

const ALLOWED_KPI_PERIODS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

async function canAccessEmployee(user: any, employeeUserId: string): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN') return true;

    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        return downline.includes(employeeUserId) || employeeUserId === user.id;
    }

    const target = await prisma.user.findUnique({
        where: { id: employeeUserId },
        select: { companyId: true },
    });
    return !!target && target.companyId === user.companyId;
}

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const period = (searchParams.get('period') || '').toUpperCase();

            const userWhere: Prisma.UserWhereInput = {
                isActive: true,
                ...companyScopeWhere(user),
            };

            let employeeUserIds: string[] = [];

            if (employeeId) {
                const targetProfile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [
                            { id: employeeId },
                            { userId: employeeId },
                        ],
                    },
                    select: { userId: true },
                });
                if (!targetProfile) return createErrorResponse('Employee not found', 404);

                const allowed = await canAccessEmployee(user, targetProfile.userId);
                if (!allowed) return createErrorResponse('Forbidden: Employee is outside your access', 403);

                employeeUserIds = [targetProfile.userId];
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
                employeeUserIds = Array.from(new Set(downline.filter((id) => id !== user.id)));
            } else {
                const users = await prisma.user.findMany({
                    where: userWhere,
                    select: { id: true },
                });
                employeeUserIds = users.map((u) => u.id);
            }

            if (employeeUserIds.length === 0) return NextResponse.json([]);

            const profiles = await prisma.employeeProfile.findMany({
                where: { userId: { in: employeeUserIds } },
                select: {
                    id: true,
                    userId: true,
                    designation: true,
                    kra: true,
                    user: { select: { name: true, email: true } },
                    kpis: {
                        where: period && ALLOWED_KPI_PERIODS.has(period) ? { period } : undefined,
                        orderBy: { updatedAt: 'desc' },
                    },
                },
                orderBy: { user: { name: 'asc' } },
            });

            return NextResponse.json(profiles.map((profile) => ({
                employeeId: profile.id,
                userId: profile.userId,
                name: profile.user?.name || 'Unknown',
                email: profile.user?.email || '',
                designation: profile.designation || 'N/A',
                kra: profile.kra || '',
                kpis: profile.kpis,
            })));
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const employeeId = String(body?.employeeId || '');
            const kra = typeof body?.kra === 'string' ? body.kra.trim() : undefined;
            const kpis = Array.isArray(body?.kpis) ? body.kpis : [];
            const replaceExisting = Boolean(body?.replaceExisting);

            if (!employeeId) return createErrorResponse('employeeId is required', 400);

            const targetProfile = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [{ id: employeeId }, { userId: employeeId }],
                },
                select: { id: true, userId: true },
            });

            if (!targetProfile) return createErrorResponse('Employee not found', 404);

            const allowed = await canAccessEmployee(user, targetProfile.userId);
            if (!allowed) return createErrorResponse('Forbidden: Employee is outside your access', 403);

            // Unified KPI write path (id-or-title matching, employee's companyId,
            // shared normalization). replaceExisting maps onto replaceMissing.
            const normalizedKpis = normalizeKpis(kpis);

            const result = await prisma.$transaction(async (tx) => {
                if (kra !== undefined) {
                    await tx.employeeProfile.update({
                        where: { id: targetProfile.id },
                        data: { kra },
                    });
                }

                await upsertEmployeeKpis(tx, {
                    employeeId: targetProfile.id,
                    kpis: normalizedKpis,
                    replaceMissing: Boolean(replaceExisting),
                });

                const updatedProfile = await tx.employeeProfile.findUnique({
                    where: { id: targetProfile.id },
                    select: {
                        id: true,
                        userId: true,
                        kra: true,
                        kpis: { orderBy: { updatedAt: 'desc' } },
                    },
                });

                return updatedProfile;
            });

            const targetUserCompany = await prisma.user.findUnique({
                where: { id: targetProfile.userId },
                select: { companyId: true },
            });

            const agendaSync = await generateTodayAgendaForEmployees({
                companyId: targetUserCompany?.companyId || user.companyId || null,
                employeeIds: [targetProfile.id],
                generatedBy: user.id,
                forceRegenerate: true,
            });

            return NextResponse.json({
                success: true,
                message: 'KRA/KPI updated successfully',
                data: result,
                agendaSync,
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
