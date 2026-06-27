import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';
import { computePerformanceIndex } from '@/lib/kra/performance-index';
import type { KraPeriodType } from '@/lib/kra/period';

export const dynamic = 'force-dynamic';

// GET /api/cron/kra-snapshot?periods=MONTHLY,QUARTERLY
// Computes & persists the Performance Index for every active employee, per period.
export async function GET(req: NextRequest) {
  try {
    const cronAuthError = validateCronRequest(req);
    if (cronAuthError) return cronAuthError;

    const { searchParams } = new URL(req.url);
    const periods = (searchParams.get('periods') || 'MONTHLY,QUARTERLY')
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter((p) => ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(p)) as KraPeriodType[];

    const companies = await prisma.company.findMany({ select: { id: true, name: true } });
    const results: Array<{ companyId: string; companyName: string; employees: number; snapshots: number }> = [];

    for (const company of companies) {
      const profiles = await prisma.employeeProfile.findMany({
        where: { user: { companyId: company.id, isActive: true } },
        select: { id: true },
      });

      let snapshots = 0;
      for (const p of profiles) {
        for (const periodType of periods) {
          await computePerformanceIndex({ employeeId: p.id, companyId: company.id, periodType, persist: true });
          snapshots++;
        }
      }

      results.push({ companyId: company.id, companyName: company.name, employees: profiles.length, snapshots });
    }

    return NextResponse.json({ ok: true, periods, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
