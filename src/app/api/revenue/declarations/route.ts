import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

/**
 * Employee side of revenue reconciliation: people declare what they sold, in the currency the
 * customer was billed. Independent of the finance ledger by design — the comparison is only
 * meaningful if neither side was copied from the other.
 *
 * Anyone may declare their own; only finance/managers may read the whole company's.
 */
export const dynamic = 'force-dynamic';

const REVIEW_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'];
const CHANNELS = ['BANK_DIRECT', 'RAZORPAY', 'PAYPAL', 'OTHER'];

/** GET ?scope=mine|all&from=&to= */
export const GET = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'mine';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { companyId: user.companyId };
    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(from);
      if (to) where.saleDate.lte = new Date(to);
    }

    if (scope === 'all') {
      if (!REVIEW_ROLES.includes(user.role)) {
        return createErrorResponse('Forbidden: finance or manager access required', 403);
      }
    } else {
      const profile = await prisma.employeeProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!profile) return NextResponse.json([]);
      where.employeeId = profile.id;
    }

    const rows = await prisma.employeeRevenueDeclaration.findMany({
      where,
      include: {
        employee: { select: { id: true, user: { select: { name: true, email: true } } } },
        settlements: { select: { id: true, netInr: true, grossInr: true, settlementDate: true } },
      },
      orderBy: { saleDate: 'desc' },
      take: 500,
    });

    return NextResponse.json(rows);
  } catch (error) {
    return createErrorResponse(error);
  }
});

/** POST — declare a sale. Always recorded against the caller's own employee profile. */
export const POST = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const body = await req.json();

    const grossAmount = Number(body.grossAmount);
    if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
      return createErrorResponse('grossAmount must be a positive number', 400);
    }
    if (!body.saleDate) return createErrorResponse('saleDate is required', 400);
    const channel = body.channel || 'BANK_DIRECT';
    if (!CHANNELS.includes(channel)) {
      return createErrorResponse(`channel must be one of ${CHANNELS.join(', ')}`, 400);
    }

    // Declarations belong to the person making them — never to an id supplied by the client.
    const profile = await prisma.employeeProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) return createErrorResponse('No employee profile for this user', 400);

    const created = await prisma.employeeRevenueDeclaration.create({
      data: {
        companyId: user.companyId,
        employeeId: profile.id,
        saleDate: new Date(body.saleDate),
        customerName: body.customerName?.trim() || null,
        reference: body.reference?.trim() || null,
        grossAmount,
        currency: (body.currency || 'INR').toUpperCase(),
        channel,
        note: body.note?.trim() || null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});
