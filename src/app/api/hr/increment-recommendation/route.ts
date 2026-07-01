import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { computeCompaRatio } from '@/lib/hr/grades';
import { recommendIncrement, type Rating } from '@/lib/hr/increment';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];
const RATINGS: Rating[] = ['A+', 'A', 'B+', 'B', 'C', 'D'];

// POST /api/hr/increment-recommendation
//  - { employeeId, promotion?, underPipOrNotice? }  → resolves rating + compa-ratio, recommends.
//  - { rating, compaRatio, ... }                    → direct what-if evaluation.
export const POST = authorizedRoute(ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const promotion = !!body.promotion;
    const underPipOrNotice = !!body.underPipOrNotice;

    // Direct what-if (no employee lookup).
    if (!body.employeeId) {
      const rating = RATINGS.includes(body.rating) ? (body.rating as Rating) : null;
      const compaRatio = body.compaRatio != null && body.compaRatio !== '' ? Number(body.compaRatio) : null;
      return NextResponse.json({ recommendation: recommendIncrement({ rating, compaRatio, promotion, underPipOrNotice }), context: { rating, compaRatio } });
    }

    const profile = await prisma.employeeProfile.findFirst({
      where: { OR: [{ id: body.employeeId }, { userId: body.employeeId }] },
      select: {
        id: true, baseSalary: true,
        user: { select: { companyId: true, name: true } },
        gradeRef: { select: { code: true, name: true, midCtc: true } },
      },
    });
    if (!profile) return createErrorResponse('Employee not found', 404);

    // Company scope for non group-wide roles.
    if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'].includes(user.role) && profile.user?.companyId && user.companyId && profile.user.companyId !== user.companyId) {
      return createErrorResponse('Forbidden: employee is outside your company', 403);
    }

    // Latest rating snapshot.
    const latest = await prisma.performanceIndex.findFirst({
      where: { employeeId: profile.id, letterRating: { not: null } },
      orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      select: { letterRating: true, periodType: true, period: true },
    });
    const rating = latest && RATINGS.includes(latest.letterRating as Rating) ? (latest.letterRating as Rating) : null;
    const compaRatio = computeCompaRatio(profile.baseSalary, profile.gradeRef);

    return NextResponse.json({
      recommendation: recommendIncrement({ rating, compaRatio, promotion, underPipOrNotice }),
      context: {
        employeeName: profile.user?.name ?? null,
        grade: profile.gradeRef ? { code: profile.gradeRef.code, name: profile.gradeRef.name, midCtc: profile.gradeRef.midCtc } : null,
        baseSalary: profile.baseSalary,
        rating,
        ratingPeriod: latest ? `${latest.periodType} ${latest.period}` : null,
        compaRatio,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
