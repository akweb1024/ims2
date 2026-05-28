import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

const MANAGER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'HR_MANAGER',
  'MANAGER',
  'TEAM_LEADER',
]);

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const days = Number(searchParams.get('days') || 30);

    if (!employeeIdParam) {
      return createErrorResponse('employeeId is required', 400);
    }

    const profile = await prisma.employeeProfile.findFirst({
      where: {
        OR: [{ id: employeeIdParam }, { userId: employeeIdParam }],
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, companyId: true } },
      },
    });

    if (!profile) return createErrorResponse('Employee not found', 404);

    const canSeeTeam = MANAGER_ROLES.has(user.role);
    if (!canSeeTeam && profile.userId !== user.id) {
      return createErrorResponse('Forbidden: you can only access your own timeline', 403);
    }

    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
      if (!downline.includes(profile.userId) && profile.userId !== user.id) {
        return createErrorResponse('Forbidden: employee is outside your hierarchy', 403);
      }
    }

    if (['ADMIN', 'HR', 'HR_MANAGER'].includes(user.role) && user.companyId && profile.user.companyId !== user.companyId) {
      return createErrorResponse('Forbidden: cross-company access denied', 403);
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Math.max(1, days));

    const [attendanceRows, workReports] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          employeeId: profile.id,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.workReport.findMany({
        where: {
          employeeId: profile.id,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'desc' },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: { name: true, email: true },
              },
            },
          },
        },
      }),
    ]);

    const timeline = [
      ...attendanceRows.map((a) => ({
        type: 'ATTENDANCE',
        at: a.date,
        payload: {
          status: a.status,
          checkIn: a.checkIn,
          checkOut: a.checkOut,
          lateMinutes: a.lateMinutes,
          workFrom: a.workFrom,
          locationName: a.locationName,
        },
      })),
      ...workReports.map((r) => ({
        type: 'WORK_REPORT',
        at: r.date,
        payload: {
          id: r.id,
          title: r.title,
          status: r.status,
          tasksCompleted: r.tasksCompleted,
          hoursSpent: r.hoursSpent,
          revenueGenerated: r.revenueGenerated,
          selfRating: r.selfRating,
          managerRating: r.managerRating,
          managerComment: r.managerComment,
          category: r.category,
          keyOutcome: r.keyOutcome,
          content: r.content,
          comments: r.comments.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            author: c.author.name || c.author.email,
          })),
        },
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return NextResponse.json({
      employee: {
        employeeId: profile.id,
        userId: profile.userId,
        name: profile.user.name || profile.user.email,
        email: profile.user.email,
        role: profile.user.role,
        designation: profile.designation || 'N/A',
      },
      range: { start, end, days },
      summary: {
        attendanceDays: attendanceRows.length,
        presentDays: attendanceRows.filter((a) => a.status === 'PRESENT').length,
        lateDays: attendanceRows.filter((a) => (a.lateMinutes || 0) > 0).length,
        reportsSubmitted: workReports.length,
        reportsApproved: workReports.filter((r) => r.status === 'APPROVED').length,
      },
      attendance: attendanceRows,
      workReports,
      timeline,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

