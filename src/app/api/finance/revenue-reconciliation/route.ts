import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { reconcile, type DeclarationInput, type SettlementInput } from '@/lib/finance/reconciliation';

/**
 * GET /api/finance/revenue-reconciliation?from=&to=&tolerance=
 *
 * Compares what employees declared they sold against what actually reached the bank, on both a
 * gross and a net basis. See lib/finance/reconciliation for why both are needed and how gateway
 * fees, GST and FX are handled.
 *
 * Read-only: it computes from the two independent tables rather than storing a verdict, so
 * re-running after a correction always reflects current data.
 */
export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) return createErrorResponse('Company association required', 403);
      const { searchParams } = new URL(req.url);

      const now = new Date();
      const from = searchParams.get('from')
        ? new Date(searchParams.get('from')!)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = searchParams.get('to')
        ? new Date(searchParams.get('to')!)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const tolerance = Number(searchParams.get('tolerance') ?? 1) || 1;

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return createErrorResponse('Invalid from/to date', 400);
      }

      // Pull a window wider than the period on the money side: a sale made in the period may
      // settle after it, and that needs to show as in-transit rather than vanish.
      const settleWindowEnd = new Date(to.getTime() + 60 * 24 * 3600 * 1000);

      const [declRows, setRows] = await Promise.all([
        prisma.employeeRevenueDeclaration.findMany({
          where: { companyId: user.companyId, saleDate: { gte: from, lte: to } },
          include: { employee: { select: { id: true, user: { select: { name: true } } } } },
        }),
        prisma.settlementRecord.findMany({
          where: {
            companyId: user.companyId,
            OR: [
              { settlementDate: { gte: from, lte: settleWindowEnd } },
              { settlementDate: null, captureDate: { lte: to } },
            ],
          },
        }),
      ]);

      const declarations: DeclarationInput[] = declRows.map((d) => ({
        id: d.id,
        employeeId: d.employeeId,
        employeeName: d.employee?.user?.name ?? null,
        saleDate: d.saleDate,
        grossAmount: d.grossAmount,
        currency: d.currency,
        channel: d.channel as DeclarationInput['channel'],
        reference: d.reference,
      }));

      const settlements: SettlementInput[] = setRows.map((s) => ({
        id: s.id,
        source: s.source as SettlementInput['source'],
        captureDate: s.captureDate,
        settlementDate: s.settlementDate,
        originalCurrency: s.originalCurrency,
        originalAmount: s.originalAmount,
        fxRate: s.fxRate,
        grossInr: s.grossInr,
        feeInr: s.feeInr,
        taxInr: s.taxInr,
        netInr: s.netInr,
        declarationId: s.declarationId,
        externalRef: s.externalRef,
      }));

      const result = reconcile(declarations, settlements, {
        periodStart: from,
        periodEnd: to,
        toleranceInr: tolerance,
      });

      return NextResponse.json(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);
