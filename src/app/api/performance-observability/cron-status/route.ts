import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'],
  async (_req: NextRequest, user) => {
    try {
      if (!user.companyId && user.role !== 'SUPER_ADMIN') {
        throw new ValidationError('Company context is required');
      }

      const latest = await prisma.auditLog.findFirst({
        where: {
          action: 'PERFORMANCE_OBS_CRON_RUN',
          entity: 'performance_observability',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!latest) {
        return NextResponse.json({ data: null });
      }

      const changes = (latest.changes || {}) as any;
      const results = Array.isArray(changes.results) ? changes.results : [];

      const totals = results.reduce(
        (acc: any, row: any) => {
          acc.rollups += Number(row.rollupCreated || 0);
          acc.anomalies += Number(row.anomaliesCreated || 0);
          acc.employeeSnapshots += Number(row.snapshotEmployees || 0);
          acc.companySnapshots += Number(row.snapshotCompany || 0);
          return acc;
        },
        { rollups: 0, anomalies: 0, employeeSnapshots: 0, companySnapshots: 0 }
      );

      return NextResponse.json({
        data: {
          ranAt: latest.createdAt,
          cadence: changes.cadence || null,
          processedCompanies: Number(changes.processedCompanies || 0),
          ...totals,
        },
      });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/cron-status');
    }
  }
);
