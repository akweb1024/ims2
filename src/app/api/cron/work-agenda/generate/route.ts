import { NextRequest, NextResponse } from 'next/server';
import { validateCronRequest } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { generateTodayAgendaForEmployees } from '@/lib/hr/work-agenda-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cronAuthError = validateCronRequest(req);
    if (cronAuthError) return cronAuthError;

    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    });

    const results: Array<{ companyId: string; companyName: string; generated: number; skipped: number; employees: number; }> = [];

    for (const company of companies) {
      const employeeRows = await prisma.employeeProfile.findMany({
        where: {
          user: {
            companyId: company.id,
            isActive: true,
          }
        },
        select: { id: true }
      });

      const run = await generateTodayAgendaForEmployees({
        companyId: company.id,
        employeeIds: employeeRows.map((x) => x.id),
        generatedBy: 'SYSTEM',
        forceRegenerate: false,
      });

      results.push({
        companyId: company.id,
        companyName: company.name,
        generated: run.generated,
        skipped: run.skipped,
        employees: employeeRows.length
      });
    }

    return NextResponse.json({
      success: true,
      processedCompanies: companies.length,
      results,
      ranAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed agenda cron' }, { status: 500 });
  }
}

