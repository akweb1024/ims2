import { prisma } from '@/lib/prisma';

const DAY_MS = 24 * 60 * 60 * 1000;

const severityFromDelta = (deltaPct: number) => {
  if (Math.abs(deltaPct) >= 40) return 'CRITICAL';
  if (Math.abs(deltaPct) >= 20) return 'WARNING';
  return 'INFO';
};

export async function runPerformanceSignalRollup(companyId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - DAY_MS);

  const grouped = await prisma.performanceSignalEvent.groupBy({
    by: ['metricKey', 'metricScope', 'employeeProfileId'],
    where: {
      companyId,
      sourceModule: { notIn: ['OBS_ROLLUP', 'OBS_ANOMALY'] },
      capturedAt: { gte: since },
    },
    _avg: { value: true },
    _count: { _all: true },
  });

  if (!grouped.length) return { created: 0 };

  const data = grouped.map((row) => ({
    companyId,
    employeeProfileId: row.employeeProfileId || null,
    metricKey: `${row.metricKey}.rollup_24h`,
    metricScope: row.metricScope,
    value: Number(row._avg.value || 0),
    baselineValue: null,
    severity: 'INFO',
    sourceModule: 'OBS_ROLLUP',
    sourceEntityType: 'performance_signal_event',
    sourceEntityId: `${row.metricKey}:${row.metricScope}:${row.employeeProfileId || 'company'}`,
    context: {
      kind: 'ROLLUP_24H',
      count: row._count._all,
      windowHours: 24,
      metricKey: row.metricKey,
    },
    capturedAt: now,
    createdAt: now,
  }));

  const result = await prisma.performanceSignalEvent.createMany({ data });
  return { created: result.count };
}

export async function runPerformanceAnomalyDetector(companyId: string) {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY_MS);
  const since15d = new Date(now.getTime() - 15 * DAY_MS);

  const recent = await prisma.performanceSignalEvent.groupBy({
    by: ['metricKey', 'metricScope', 'employeeProfileId'],
    where: {
      companyId,
      sourceModule: { notIn: ['OBS_ROLLUP', 'OBS_ANOMALY'] },
      capturedAt: { gte: since24h },
    },
    _avg: { value: true },
  });

  if (!recent.length) return { created: 0 };

  let created = 0;

  for (const row of recent) {
    const baseline = await prisma.performanceSignalEvent.aggregate({
      where: {
        companyId,
        metricKey: row.metricKey,
        metricScope: row.metricScope,
        employeeProfileId: row.employeeProfileId || null,
        sourceModule: { notIn: ['OBS_ROLLUP', 'OBS_ANOMALY'] },
        capturedAt: { gte: since15d, lt: since24h },
      },
      _avg: { value: true },
    });

    const recentAvg = Number(row._avg.value || 0);
    const baselineAvg = Number(baseline._avg.value || 0);
    if (!baselineAvg) continue;

    const deltaPct = ((recentAvg - baselineAvg) / Math.abs(baselineAvg)) * 100;
    const severity = severityFromDelta(deltaPct);
    if (severity === 'INFO') continue;

    await prisma.performanceSignalEvent.create({
      data: {
        companyId,
        employeeProfileId: row.employeeProfileId || null,
        metricKey: `${row.metricKey}.anomaly`,
        metricScope: row.metricScope,
        value: recentAvg,
        baselineValue: baselineAvg,
        severity,
        sourceModule: 'OBS_ANOMALY',
        sourceEntityType: 'performance_signal_event',
        sourceEntityId: `${row.metricKey}:${row.metricScope}:${row.employeeProfileId || 'company'}`,
        context: {
          kind: 'ANOMALY_24H_VS_14D',
          deltaPct: Number(deltaPct.toFixed(2)),
          metricKey: row.metricKey,
        },
        capturedAt: now,
      },
    });
    created += 1;
  }

  return { created };
}

export async function runPerformanceSnapshotWriter(companyId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startMonth = new Date(year, now.getMonth(), 1);
  const startToday = new Date(year, now.getMonth(), now.getDate());

  const employees = await prisma.employeeProfile.findMany({
    where: { user: { companyId } },
    select: {
      id: true,
      monthlyTarget: true,
    },
  });

  let employeeSnapshots = 0;
  for (const employee of employees) {
    const [attendanceAgg, tasksAgg, reportsAgg, revenueAgg, pointsAgg] = await Promise.all([
      prisma.attendance.aggregate({
        where: { companyId, employeeId: employee.id, date: { gte: startMonth } },
        _count: { _all: true },
      }),
      prisma.task.aggregate({
        where: { companyId, user: { employeeProfile: { id: employee.id } }, createdAt: { gte: startMonth } },
        _count: { _all: true },
      }),
      prisma.task.aggregate({
        where: {
          companyId,
          user: { employeeProfile: { id: employee.id } },
          status: 'COMPLETED',
          updatedAt: { gte: startMonth },
        },
        _count: { _all: true },
      }),
      prisma.revenueTransaction.aggregate({
        where: {
          companyId,
          claimedByEmployeeId: employee.id,
          status: 'VERIFIED',
          paymentDate: { gte: startMonth },
        },
        _sum: { amount: true },
      }),
      prisma.employeePointLog.aggregate({
        where: { companyId, employeeId: employee.id, date: { gte: startMonth } },
        _sum: { points: true },
      }),
    ]);

    const daysPresent = attendanceAgg._count._all;
    const totalWorkingDays = Math.max(1, Math.floor((startToday.getTime() - startMonth.getTime()) / DAY_MS) + 1);
    const tasksAssigned = tasksAgg._count._all;
    const tasksCompleted = reportsAgg._count._all;
    const taskCompletionRate = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 0;
    const attendanceScore = (daysPresent / totalWorkingDays) * 100;
    const revenue = Number(revenueAgg._sum.amount || 0);
    const target = Number(employee.monthlyTarget || 0);
    const revenueAchievement = target > 0 ? (revenue / target) * 100 : 0;
    const points = Number(pointsAgg._sum.points || 0);
    const overallScore = Math.max(
      0,
      Math.min(100, attendanceScore * 0.35 + taskCompletionRate * 0.4 + Math.min(100, revenueAchievement) * 0.25)
    );

    await prisma.monthlyPerformanceSnapshot.upsert({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
      update: {
        totalWorkingDays,
        daysPresent,
        daysAbsent: Math.max(0, totalWorkingDays - daysPresent),
        attendanceScore,
        totalPointsEarned: points,
        tasksCompleted,
        tasksAssigned,
        taskCompletionRate,
        totalRevenueGenerated: revenue,
        revenueTarget: target,
        revenueAchievement,
        overallScore,
        needsAttention: overallScore < 60,
        calculatedAt: now,
      },
      create: {
        employeeId: employee.id,
        companyId,
        month,
        year,
        totalWorkingDays,
        daysPresent,
        daysAbsent: Math.max(0, totalWorkingDays - daysPresent),
        attendanceScore,
        totalPointsEarned: points,
        tasksCompleted,
        tasksAssigned,
        taskCompletionRate,
        totalRevenueGenerated: revenue,
        revenueTarget: target,
        revenueAchievement,
        overallScore,
        needsAttention: overallScore < 60,
      },
    });
    employeeSnapshots += 1;
  }

  const [summary, revenue] = await Promise.all([
    prisma.monthlyPerformanceSnapshot.aggregate({
      where: { companyId, month, year },
      _avg: { attendanceScore: true, overallScore: true, taskCompletionRate: true },
      _sum: { totalPointsEarned: true },
      _count: { _all: true },
    }),
    prisma.revenueTransaction.aggregate({
      where: { companyId, status: 'VERIFIED', paymentDate: { gte: startMonth } },
      _sum: { amount: true },
    }),
  ]);

  const totalEmployees = summary._count._all;
  const totalRevenue = Number(revenue._sum.amount || 0);
  const avgPerf = Number(summary._avg.overallScore || 0);

  await prisma.companyPerformance.upsert({
    where: { companyId_month_year: { companyId, month, year } },
    update: {
      totalEmployees,
      averagePerformance: avgPerf,
      totalRevenue,
      totalPointsEarned: Number(summary._sum.totalPointsEarned || 0),
      attendanceRate: Number(summary._avg.attendanceScore || 0),
      taskCompletionRate: Number(summary._avg.taskCompletionRate || 0),
      revenuePerEmployee: totalEmployees > 0 ? totalRevenue / totalEmployees : 0,
      calculatedAt: now,
    },
    create: {
      companyId,
      month,
      year,
      totalEmployees,
      averagePerformance: avgPerf,
      totalRevenue,
      totalPointsEarned: Number(summary._sum.totalPointsEarned || 0),
      attendanceRate: Number(summary._avg.attendanceScore || 0),
      taskCompletionRate: Number(summary._avg.taskCompletionRate || 0),
      revenuePerEmployee: totalEmployees > 0 ? totalRevenue / totalEmployees : 0,
    },
  });

  return { employeeSnapshots, companySnapshot: 1 };
}

export async function runPerformanceObservabilityPhase2(companyId: string) {
  const rollup = await runPerformanceSignalRollup(companyId);
  const anomalies = await runPerformanceAnomalyDetector(companyId);
  const snapshots = await runPerformanceSnapshotWriter(companyId);
  return { rollup, anomalies, snapshots };
}
