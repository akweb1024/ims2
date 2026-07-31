import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * Optional sign-off on a reconciliation period.
 *
 * Nothing depends on a period being signed — the reconciliation computes live and works either
 * way. Signing is a record that a human looked and accepted it.
 *
 * The figures are snapshotted at signing. Since reconciliation is recomputed on every view, a
 * declaration or settlement edited afterwards would otherwise silently change what was
 * supposedly agreed.
 *
 * Drift is detected by the caller, which already holds the live reconciliation, rather than
 * recomputed here — the alternative would be a second copy of the same query and engine call
 * that could fall out of step with the first.
 *
 * GET    ?from=&to=   -> { signOff }   (null when the period is unsigned)
 * POST                -> record a sign-off; the snapshot comes from the caller's current view
 * DELETE ?from=&to=   -> reopen
 */
export const dynamic = 'force-dynamic';

const SIGN_OFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];
const READ_ROLES = [...SIGN_OFF_ROLES, 'MANAGER'];

/** Figures that must not move after signing. */
const SNAPSHOT_FIELDS = [
  'declaredGrossInr', 'declaredNetInr', 'settledGrossInr', 'settledNetInr',
  'feeInr', 'taxInr', 'inTransitNetInr', 'declaredCount', 'settledCount',
] as const;

function periodFrom(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) return null;
  const periodStart = new Date(from);
  const periodEnd = new Date(to);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) return null;
  return { periodStart, periodEnd };
}

export const GET = authorizedRoute(READ_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const period = periodFrom(req);
    if (!period) return createErrorResponse('from and to are required', 400);

    const signOff = await prisma.reconciliationSignOff.findUnique({
      where: { companyId_periodStart_periodEnd: { companyId: user.companyId, ...period } },
      include: { signedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ signOff });
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const POST = authorizedRoute(SIGN_OFF_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const body = await req.json();
    if (!body.from || !body.to) return createErrorResponse('from and to are required', 400);

    const periodStart = new Date(body.from);
    const periodEnd = new Date(body.to);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return createErrorResponse('Invalid from/to date', 400);
    }

    const snapshot: Record<string, number> = {};
    for (const f of SNAPSHOT_FIELDS) {
      const v = Number(body[f]);
      if (!Number.isFinite(v)) {
        return createErrorResponse(`Missing or invalid ${f} in the snapshot`, 400);
      }
      snapshot[f] = v;
    }

    const data = {
      companyId: user.companyId,
      periodStart,
      periodEnd,
      signedById: user.id,
      signedAt: new Date(),
      note: body.note?.trim() || null,
      toleranceInr: Number(body.toleranceInr) || 1,
      // Signing off a period that did not reconcile is allowed — a known difference is
      // sometimes accepted deliberately — so record which it was rather than refusing.
      matchedAtSignOff: Boolean(body.matchedAtSignOff),
      declaredGrossInr: snapshot.declaredGrossInr,
      declaredNetInr: snapshot.declaredNetInr,
      settledGrossInr: snapshot.settledGrossInr,
      settledNetInr: snapshot.settledNetInr,
      feeInr: snapshot.feeInr,
      taxInr: snapshot.taxInr,
      inTransitNetInr: snapshot.inTransitNetInr,
      declaredCount: snapshot.declaredCount,
      settledCount: snapshot.settledCount,
    };

    // Re-signing an already-signed period replaces the snapshot, which is how you accept
    // figures that moved after the first sign-off.
    const signOff = await prisma.reconciliationSignOff.upsert({
      where: { companyId_periodStart_periodEnd: { companyId: user.companyId, periodStart, periodEnd } },
      create: data,
      update: data,
      include: { signedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(signOff, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const DELETE = authorizedRoute(SIGN_OFF_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const period = periodFrom(req);
    if (!period) return createErrorResponse('from and to are required', 400);

    await prisma.reconciliationSignOff.deleteMany({
      where: { companyId: user.companyId, ...period },
    });

    return NextResponse.json({ reopened: true });
  } catch (error) {
    return createErrorResponse(error);
  }
});
