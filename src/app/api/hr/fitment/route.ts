import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { evaluateFitment } from '@/lib/hr/fitment';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

function resolveCompanyId(user: { role: string; companyId?: string | null }, requested?: string | null) {
  if (requested && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return requested;
  return user.companyId || requested || null;
}

// POST /api/hr/fitment — evaluate a proposed salary against its grade + same-grade peers (§40).
// Body: { gradeId, proposedMonthlyCtc, designationId?, excludeEmployeeId?, isNewHire? }
export const POST = authorizedRoute(ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const companyId = resolveCompanyId(user, body.companyId);
    if (!companyId) return createErrorResponse('Company association required', 403);

    const proposedMonthlyCtc = body.proposedMonthlyCtc != null && body.proposedMonthlyCtc !== '' ? Number(body.proposedMonthlyCtc) : null;
    const isNewHire = body.isNewHire !== false;

    const grade = body.gradeId
      ? await prisma.grade.findFirst({ where: { id: body.gradeId, companyId } })
      : null;

    // Existing same-grade (optionally same-designation) peers in this company.
    let peerSalaries: number[] = [];
    if (grade) {
      const peers = await prisma.employeeProfile.findMany({
        where: {
          gradeId: grade.id,
          baseSalary: { not: null },
          ...(body.excludeEmployeeId ? { id: { not: body.excludeEmployeeId } } : {}),
          ...(body.designationId ? { designationId: body.designationId } : {}),
          user: { companyId, isActive: true },
        },
        select: { baseSalary: true },
      });
      peerSalaries = peers.map((p) => p.baseSalary!).filter((n) => typeof n === 'number' && n > 0);
    }

    const result = evaluateFitment({ proposedMonthlyCtc, grade, isNewHire, peerSalaries });
    return NextResponse.json({ result, grade: grade ? { id: grade.id, code: grade.code, name: grade.name, minCtc: grade.minCtc, midCtc: grade.midCtc, maxCtc: grade.maxCtc } : null });
  } catch (error) {
    return createErrorResponse(error);
  }
});
