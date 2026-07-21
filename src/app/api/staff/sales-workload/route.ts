import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  buildDealPipeline,
  buildLeadFunnel,
  dealTotals,
  summarizeFollowUps,
  toFollowUp,
  toKpi,
  toRenewal,
  type DealGroupRow,
  type FollowUpInput,
  type GoalInput,
  type LeadGroupRow,
  type RenewalInput,
} from '@/lib/sales/workload';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'];

/**
 * GET /api/staff/sales-workload?employeeId=&window=today|week
 *
 * Per-employee Sales & Marketing workload: KRA/KPI progress, the deal pipeline
 * and lead funnel, the follow-up work queue, revenue claimed this month, and
 * upcoming subscription renewals. Self-service by default; managers may view a
 * direct report, admins anyone.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get('employeeId');
    const windowParam = searchParams.get('window') === 'week' ? 'WEEK' : 'TODAY';

    const self = await prisma.employeeProfile.findFirst({ where: { userId: user.id }, select: { id: true } });
    const targetProfileId = requestedId ?? self?.id;
    if (!targetProfileId) return NextResponse.json({ error: 'No employee profile found' }, { status: 404 });

    const profile = await prisma.employeeProfile.findUnique({
      where: { id: targetProfileId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true, name: true, role: true, companyId: true, managerId: true,
            manager: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!profile) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (profile.id !== self?.id) {
      const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
      const isManagerOfTarget = profile.user.managerId === user.id;
      if (!isAdmin && !isManagerOfTarget) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const uid = profile.userId;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const renewalHorizon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // 1) KPIs — the employee's live KRA goals.
    const goals = await prisma.employeeGoal.findMany({
      where: { employeeId: profile.id, isKra: true },
      select: {
        id: true, title: true, unit: true, type: true, targetValue: true, currentValue: true,
        achievementPercentage: true, metricId: true, metric: { select: { direction: true } },
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    });
    const kpis = goals.map((g) => toKpi(g as GoalInput));

    // 2) Deal pipeline (owned by this rep).
    const dealGroup = await prisma.deal.groupBy({
      by: ['stage'],
      where: { ownerId: uid },
      _count: true,
      _sum: { value: true },
    });
    const pipeline = buildDealPipeline(
      dealGroup.map((d) => ({ stage: d.stage as DealGroupRow['stage'], count: d._count, value: d._sum.value ?? 0 })),
    );
    const totals = dealTotals(pipeline);

    // 3) Lead funnel (customers assigned to this rep).
    const leadGroup = await prisma.customerProfile.groupBy({
      by: ['leadStatus'],
      where: { assignedToUserId: uid },
      _count: true,
    });
    const funnel = buildLeadFunnel(
      leadGroup.map((l) => ({ leadStatus: l.leadStatus as LeadGroupRow['leadStatus'], count: l._count })),
    );

    // 4) Follow-up work queue.
    const followRows = await prisma.communicationLog.findMany({
      where: { userId: uid, isFollowUpCompleted: false, nextFollowUpDate: { not: null } },
      select: {
        id: true, type: true, channel: true, subject: true, nextFollowUpDate: true,
        customerProfile: { select: { id: true, name: true, leadStatus: true } },
      },
      orderBy: [{ nextFollowUpDate: 'asc' }],
      take: 50,
    });
    const queue = followRows.map((f) =>
      toFollowUp({ ...f, customer: f.customerProfile } as FollowUpInput, now),
    );

    // 5) Revenue claimed this month.
    const revenueAgg = await prisma.revenueTransaction.aggregate({
      where: { claimedByEmployeeId: profile.id, paymentDate: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    });

    // 6) Upcoming renewals (subscriptions this rep sold).
    const subs = await prisma.subscription.findMany({
      where: { salesExecutiveId: uid, status: 'ACTIVE', endDate: { lte: renewalHorizon } },
      select: {
        id: true, endDate: true, autoRenew: true, total: true, currency: true,
        customerProfile: { select: { id: true, name: true } },
      },
      orderBy: [{ endDate: 'asc' }],
      take: 20,
    });
    const renewals = subs.map((s) => toRenewal({ ...s, customer: s.customerProfile } as RenewalInput, now));

    // Coverage: assigned customers.
    const assignedCustomers = await prisma.customerProfile.count({ where: { assignedToUserId: uid } });

    const roleTemplate = MANAGER_ROLES.includes(profile.user.role)
      ? 'Sales & Marketing Manager'
      : 'Sales & Marketing Executive';

    return NextResponse.json({
      employee: {
        id: profile.id,
        userId: uid,
        name: profile.user.name ?? 'Unknown',
        role: profile.user.role,
        roleTemplate,
        coverage: { openDeals: totals.openCount, pipelineValue: totals.openValue, assignedCustomers },
        reportsTo: profile.user.manager
          ? { id: profile.user.manager.id, name: profile.user.manager.name ?? 'Unknown' }
          : null,
        generatedAt: now.toISOString(),
        window: windowParam,
      },
      summary: summarizeFollowUps(queue),
      kpis,
      revenue: {
        period: 'MONTH',
        amount: revenueAgg._sum.amount ?? 0,
        count: revenueAgg._count,
        currency: 'INR',
      },
      pipeline: { deals: pipeline, totals, leads: funnel },
      queue,
      renewals,
    });
  } catch (error: any) {
    console.error('Sales workload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
