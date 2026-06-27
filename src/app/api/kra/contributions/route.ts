import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { kraContributionSubmitSchema, kraContributionReviewSchema } from '@/lib/validators/kra';
import { recordContributions, reviewContribution } from '@/lib/kra/contributions';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];
const ALL_ROLES = [...MANAGERIAL_ROLES, 'EMPLOYEE', 'EXECUTIVE'];

async function teamEmployeeIds(user: any): Promise<string[]> {
  const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
  const profiles = await prisma.employeeProfile.findMany({
    where: { userId: { in: [...downline, user.id] } },
    select: { id: true },
  });
  return profiles.map((p) => p.id);
}

// POST /api/kra/contributions — submit reported metric values
export const POST = authorizedRoute(ALL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const parsed = kraContributionSubmitSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);
    const input = parsed.data;

    // Resolve target employee profile.
    let employeeId: string;
    if (!input.employeeId || ['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
      const self = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!self) return createErrorResponse('Profile not found', 404);
      employeeId = self.id;
    } else {
      const target = await prisma.employeeProfile.findFirst({
        where: { OR: [{ id: input.employeeId }, { userId: input.employeeId }] },
        select: { id: true, userId: true },
      });
      if (!target) return createErrorResponse('Employee not found', 404);
      if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        if (!downline.includes(target.userId) && target.userId !== user.id) {
          return createErrorResponse('Forbidden: Employee is outside your team', 403);
        }
      }
      employeeId = target.id;
    }

    const out = await recordContributions({
      companyId: user.companyId,
      employeeId,
      workReportId: input.workReportId ?? null,
      date: input.date ? new Date(input.date) : undefined,
      entries: input.entries.map((e) => ({ metricId: e.metricId, value: e.value })),
    });

    return NextResponse.json(out);
  } catch (error) {
    return createErrorResponse(error);
  }
});

// GET /api/kra/contributions?status=PENDING&employeeId=&from=&to=
export const GET = authorizedRoute(ALL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const employeeIdParam = searchParams.get('employeeId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { companyId: user.companyId };
    if (status) where.status = { in: status.split(',') };
    if (from || to) where.date = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };

    if (['EMPLOYEE', 'EXECUTIVE'].includes(user.role)) {
      const self = await prisma.employeeProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!self) return createErrorResponse('Profile not found', 404);
      where.employeeId = self.id;
    } else if (employeeIdParam) {
      const target = await prisma.employeeProfile.findFirst({
        where: { OR: [{ id: employeeIdParam }, { userId: employeeIdParam }] },
        select: { id: true },
      });
      if (!target) return createErrorResponse('Employee not found', 404);
      where.employeeId = target.id;
    } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      where.employeeId = { in: await teamEmployeeIds(user) };
    }

    const contributions = await prisma.metricContribution.findMany({
      where,
      include: {
        metric: { select: { name: true, unit: true, dataSource: true, sourceType: true } },
        employee: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    return NextResponse.json({ contributions });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// PATCH /api/kra/contributions — manager approves/rejects
export const PATCH = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const parsed = kraContributionReviewSchema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);

    // Managers/team-leaders can only review their team's contributions.
    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const target = await prisma.metricContribution.findFirst({
        where: { id: parsed.data.id, companyId: user.companyId },
        select: { employeeId: true },
      });
      if (!target) return createErrorResponse('Contribution not found', 404);
      const teamIds = await teamEmployeeIds(user);
      if (!teamIds.includes(target.employeeId)) {
        return createErrorResponse('Forbidden: Contribution is outside your team', 403);
      }
    }

    const out = await reviewContribution({
      id: parsed.data.id,
      companyId: user.companyId,
      reviewerId: user.id,
      action: parsed.data.action,
      verifiedValue: parsed.data.verifiedValue,
      note: parsed.data.note,
    });
    if (!out.ok) return createErrorResponse(out.error, 404);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
});
