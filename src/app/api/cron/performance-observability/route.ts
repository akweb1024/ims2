import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  runPerformanceAnomalyDetector,
  runPerformanceSignalRollup,
  runPerformanceSnapshotWriter,
} from '@/lib/performance-observability/jobs';
import { validateCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cronAuthError = validateCronRequest(req);
    if (cronAuthError) return cronAuthError;

    const { searchParams } = new URL(req.url);
    const cadence = searchParams.get('cadence') === '60m' ? '60m' : '15m';

    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });

    const results: Array<{
      companyId: string;
      companyName: string;
      rollupCreated: number;
      anomaliesCreated: number;
      snapshotEmployees?: number;
      snapshotCompany?: number;
    }> = [];

    for (const company of companies) {
      const rollup = await runPerformanceSignalRollup(company.id);
      const anomalies = await runPerformanceAnomalyDetector(company.id);

      if (cadence === '60m') {
        const snapshots = await runPerformanceSnapshotWriter(company.id);
        results.push({
          companyId: company.id,
          companyName: company.name,
          rollupCreated: rollup.created,
          anomaliesCreated: anomalies.created,
          snapshotEmployees: snapshots.employeeSnapshots,
          snapshotCompany: snapshots.companySnapshot,
        });
      } else {
        results.push({
          companyId: company.id,
          companyName: company.name,
          rollupCreated: rollup.created,
          anomaliesCreated: anomalies.created,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: 'PERFORMANCE_OBS_CRON_RUN',
        entity: 'performance_observability',
        entityId: `cron:${cadence}`,
        ipAddress: 'SYSTEM',
        changes: {
          cadence,
          processedCompanies: companies.length,
          results,
        },
      },
    });

    return NextResponse.json({
      success: true,
      cadence,
      processedCompanies: companies.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run performance observability cron jobs' },
      { status: 500 }
    );
  }
}
