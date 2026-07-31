import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { settlementBreakdown } from '@/lib/finance/reconciliation';

/**
 * Money side of revenue reconciliation — what actually arrived, entered by the accounts team
 * from the bank statement, or imported from a gateway settlement report.
 *
 * INR credited straight to the bank is the simple case: fee and tax are zero and gross equals
 * net. Foreign currency arrives via Razorpay or PayPal, which convert, take a fee, add GST on
 * that fee and credit the remainder — so those three numbers have to be captured or the two
 * sides of the reconciliation can never agree.
 */
export const dynamic = 'force-dynamic';

const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];
const SOURCES = ['BANK_STATEMENT', 'RAZORPAY', 'PAYPAL', 'MANUAL'];

export const GET = authorizedRoute(
  [...FINANCE_ROLES, 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) return createErrorResponse('Company association required', 403);
      const { searchParams } = new URL(req.url);
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const inTransit = searchParams.get('inTransit') === 'true';

      const where: any = { companyId: user.companyId };
      if (inTransit) {
        where.settlementDate = null;
      } else if (from || to) {
        where.settlementDate = {};
        if (from) where.settlementDate.gte = new Date(from);
        if (to) where.settlementDate.lte = new Date(to);
      }

      const rows = await prisma.settlementRecord.findMany({
        where,
        include: { declaration: { select: { id: true, reference: true, grossAmount: true, currency: true } } },
        orderBy: [{ settlementDate: 'desc' }, { captureDate: 'desc' }],
        take: 500,
      });

      return NextResponse.json(rows);
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);

/**
 * POST — record settlements.
 *
 * Single entry:  { captureDate, settlementDate?, originalAmount, originalCurrency?, fxRate?,
 *                  feeInr?, taxInr?, netInr?, bankReference?, narration? }
 * Bulk import:   { source: 'PAYPAL', rows: [ … ] } — the shape a PayPal settlement report gives
 *                you once parsed to JSON: gross, fee, net, currency, dates, transaction id.
 *
 * `netInr` is trusted when supplied, because the bank credit is authoritative and can differ
 * from gross − fee − tax by rounding; it is only derived when absent.
 */
export const POST = authorizedRoute(FINANCE_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const body = await req.json();
    const source = body.source || 'BANK_STATEMENT';
    if (!SOURCES.includes(source)) {
      return createErrorResponse(`source must be one of ${SOURCES.join(', ')}`, 400);
    }

    const rows: any[] = Array.isArray(body.rows) ? body.rows : [body];
    if (rows.length === 0) return createErrorResponse('Nothing to import', 400);
    if (rows.length > 2000) return createErrorResponse('Too many rows in one import (max 2000)', 400);

    let created = 0;
    let updated = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (const [i, raw] of rows.entries()) {
      const originalAmount = Number(raw.originalAmount ?? raw.gross ?? raw.amount);
      if (!Number.isFinite(originalAmount) || originalAmount === 0) {
        skipped.push({ row: i + 1, reason: 'missing or zero amount' });
        continue;
      }
      const captureDate = raw.captureDate || raw.date;
      if (!captureDate) {
        skipped.push({ row: i + 1, reason: 'missing captureDate' });
        continue;
      }

      const originalCurrency = String(raw.originalCurrency || raw.currency || 'INR').toUpperCase();
      const feeInr = Number(raw.feeInr ?? raw.fee ?? 0) || 0;
      const taxInr = Number(raw.taxInr ?? raw.tax ?? 0) || 0;
      const fxRate = Number(raw.fxRate ?? (originalCurrency === 'INR' ? 1 : 0)) || 0;

      // A foreign amount with no rate cannot be expressed in INR. Recording it as though the
      // rate were 1 would quietly understate revenue by roughly 85x, so refuse instead.
      if (originalCurrency !== 'INR' && fxRate <= 0) {
        skipped.push({ row: i + 1, reason: `${originalCurrency} row has no fxRate — cannot convert to INR` });
        continue;
      }

      const derived = settlementBreakdown({ originalAmount, originalCurrency, fxRate, feeInr, taxInr });
      const netInr = Number.isFinite(Number(raw.netInr ?? raw.net))
        ? Number(raw.netInr ?? raw.net)
        : derived.netInr;

      const data = {
        companyId: user.companyId,
        source,
        externalRef: raw.externalRef || raw.transactionId || raw.reference || null,
        captureDate: new Date(captureDate),
        settlementDate: raw.settlementDate ? new Date(raw.settlementDate) : null,
        originalCurrency,
        originalAmount,
        fxRate: fxRate || 1,
        grossInr: derived.grossInr,
        feeInr,
        taxInr,
        netInr,
        bankReference: raw.bankReference || null,
        narration: raw.narration || raw.description || null,
        enteredById: user.id,
        declarationId: raw.declarationId || null,
      };

      if (data.externalRef) {
        // Re-importing the same report must not double-count.
        const existing = await prisma.settlementRecord.findUnique({
          where: { source_externalRef: { source, externalRef: data.externalRef } },
          select: { id: true },
        });
        if (existing) {
          await prisma.settlementRecord.update({ where: { id: existing.id }, data });
          updated += 1;
          continue;
        }
      }
      await prisma.settlementRecord.create({ data });
      created += 1;
    }

    return NextResponse.json({ created, updated, skipped, total: rows.length }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});
