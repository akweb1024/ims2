import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  LIVE_STATUSES,
  buildPipeline,
  groupQueue,
  startOfUTCDay,
  summarize,
  toKpi,
  toRelease,
  type AssignmentInput,
  type GoalInput,
  type IssueInput,
  type ManuscriptStatus,
} from '@/lib/publication/workload';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/publication-workload?employeeId=&window=today|week
 *
 * Per-employee publication workload: open stage assignments (grouped by domain
 * → journal), the manuscript pipeline across their journals, live KRA/KPI
 * progress, and upcoming issue releases. Self-service by default; managers may
 * view a direct report, admins anyone.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get('employeeId');
    const windowParam = searchParams.get('window') === 'week' ? 'WEEK' : 'TODAY';

    // Resolve the target profile (self unless a valid employeeId is passed).
    const self = await prisma.employeeProfile.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    const targetProfileId = requestedId ?? self?.id;
    if (!targetProfileId) {
      return NextResponse.json({ error: 'No employee profile found' }, { status: 404 });
    }

    const profile = await prisma.employeeProfile.findUnique({
      where: { id: targetProfileId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            companyId: true,
            managerId: true,
            manager: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!profile) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Authorisation: self, a manager of the target, or an admin.
    if (profile.id !== self?.id) {
      const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN';
      const isManagerOfTarget = profile.user.managerId === user.id;
      if (!isAdmin && !isManagerOfTarget) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const targetUserId = profile.userId;
    const now = new Date();
    const dayStart = startOfUTCDay(now);

    // 1) Open stage assignments for this assignee (the work queue).
    const assignments = await prisma.stageAssignment.findMany({
      where: { assigneeId: targetUserId, status: { not: 'COMPLETED' } },
      select: {
        id: true,
        stage: true,
        status: true,
        dueDate: true,
        assignedAt: true,
        article: {
          select: {
            id: true,
            title: true,
            manuscriptId: true,
            journalId: true,
            journal: {
              select: {
                id: true,
                name: true,
                domainId: true,
                domain: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
    });

    // Journals the employee manages (also in scope for pipeline + releases).
    const managedJournals = await prisma.journal.findMany({
      where: { journalManagerId: targetUserId },
      select: { id: true, domainId: true },
    });

    const scopeJournalIds = [
      ...new Set([
        ...assignments.map((a) => a.article.journalId),
        ...managedJournals.map((j) => j.id),
      ]),
    ];
    const domainSet = new Set(
      [
        ...assignments.map((a) => a.article.journal.domainId),
        ...managedJournals.map((j) => j.domainId),
      ].filter((d): d is string => !!d),
    );

    // 2) Pipeline: live manuscript counts across the scope journals.
    const liveGroup = scopeJournalIds.length
      ? await prisma.article.groupBy({
          by: ['manuscriptStatus'],
          where: {
            journalId: { in: scopeJournalIds },
            manuscriptStatus: { in: LIVE_STATUSES as ManuscriptStatus[] as any },
          },
          _count: true,
        })
      : [];
    const liveCounts: Partial<Record<ManuscriptStatus, number>> = {};
    for (const g of liveGroup) {
      if (g.manuscriptStatus) liveCounts[g.manuscriptStatus as ManuscriptStatus] = g._count;
    }

    // Terminal transitions made today, within scope (from status history).
    let publishedToday = 0;
    let rejectedToday = 0;
    if (scopeJournalIds.length) {
      const hist = await prisma.manuscriptStatusHistory.groupBy({
        by: ['toStatus'],
        where: {
          toStatus: { in: ['PUBLISHED', 'REJECTED'] },
          createdAt: { gte: dayStart },
          article: { journalId: { in: scopeJournalIds } },
        },
        _count: true,
      });
      for (const h of hist) {
        if (h.toStatus === 'PUBLISHED') publishedToday = h._count;
        else if (h.toStatus === 'REJECTED') rejectedToday = h._count;
      }
    }
    const pipeline = buildPipeline(liveCounts, publishedToday, rejectedToday, dayStart.toISOString());

    // 3) KPIs: the employee's live KRA goals.
    const goals = await prisma.employeeGoal.findMany({
      where: { employeeId: profile.id, isKra: true },
      select: {
        id: true,
        title: true,
        unit: true,
        type: true,
        targetValue: true,
        currentValue: true,
        achievementPercentage: true,
        metricId: true,
        metric: { select: { direction: true } },
      },
      orderBy: [{ type: 'asc' }, { title: 'asc' }],
    });
    const kpis = goals.map((g) => toKpi(g as GoalInput));

    // 4) Upcoming issue releases across the scope journals.
    const issues = scopeJournalIds.length
      ? await prisma.journalIssue.findMany({
          where: {
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
            volume: { journalId: { in: scopeJournalIds } },
          },
          select: {
            id: true,
            issueNumber: true,
            month: true,
            status: true,
            isComplete: true,
            plannedReleaseAt: true,
            expectedManuscripts: true,
            volume: {
              select: {
                volumeNumber: true,
                journal: {
                  select: { id: true, name: true, domain: { select: { name: true } } },
                },
              },
            },
            articles: { select: { manuscriptStatus: true } },
          },
          orderBy: [
            { plannedReleaseAt: { sort: 'asc', nulls: 'last' } },
            { volume: { volumeNumber: 'asc' } },
            { issueNumber: 'asc' },
          ],
          take: 20,
        })
      : [];
    const releases = issues.map((i) => toRelease(i as unknown as IssueInput, now));

    const roleTemplate =
      managedJournals.length > 0
        ? 'Publication & Production Manager'
        : 'Publication & Production Executive';

    return NextResponse.json({
      employee: {
        id: profile.id,
        userId: targetUserId,
        name: profile.user.name ?? 'Unknown',
        role: profile.user.role,
        roleTemplate,
        coverage: { journals: scopeJournalIds.length, domains: domainSet.size },
        reportsTo: profile.user.manager
          ? { id: profile.user.manager.id, name: profile.user.manager.name ?? 'Unknown' }
          : null,
        generatedAt: now.toISOString(),
        window: windowParam,
      },
      summary: summarize(assignments as AssignmentInput[], now),
      kpis,
      queue: groupQueue(assignments as AssignmentInput[], now),
      pipeline,
      releases,
    });
  } catch (error: any) {
    console.error('Publication workload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
