import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

const READ_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'];

function resolveCompanyId(user: { role: string; companyId?: string | null }, requested?: string | null) {
  if (requested && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return requested;
  return user.companyId || requested || null;
}

// GET /api/hr/grade-mapping?companyId=... — employees + the grade ladder, for bulk grade assignment.
export const GET = authorizedRoute(READ_ROLES, async (req: NextRequest, user) => {
  try {
    const companyId = resolveCompanyId(user, new URL(req.url).searchParams.get('companyId'));
    if (!companyId) return createErrorResponse('Company association required', 403);

    const [rows, grades] = await Promise.all([
      prisma.employeeProfile.findMany({
        where: { user: { companyId, isActive: true } },
        select: {
          id: true, baseSalary: true, gradeId: true, designation: true,
          user: { select: { name: true, email: true, department: { select: { name: true } } } },
          designatRef: { select: { name: true } },
        },
      }),
      prisma.grade.findMany({ where: { companyId }, orderBy: { order: 'asc' }, select: { id: true, code: true, name: true, minCtc: true, midCtc: true, maxCtc: true } }),
    ]);

    const employees = rows
      .map((p) => ({
        id: p.id,
        name: p.user?.name || p.user?.email || 'Unknown',
        designation: p.designatRef?.name || p.designation || null,
        department: p.user?.department?.name || null,
        baseSalary: p.baseSalary ?? null,
        gradeId: p.gradeId ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ employees, grades });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// PATCH /api/hr/grade-mapping — bulk-assign grades.
// Body: { assignments: [{ employeeId, gradeId | null }] }  (employeeId = EmployeeProfile id)
export const PATCH = authorizedRoute(WRITE_ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const companyId = resolveCompanyId(user, body.companyId);
    if (!companyId) return createErrorResponse('Company association required', 403);
    const assignments: Array<{ employeeId: string; gradeId: string | null }> = Array.isArray(body.assignments) ? body.assignments : [];
    if (!assignments.length) return createErrorResponse('No assignments provided', 400);

    // Validate ownership: profiles in this company, grades in this company.
    const profileIds = Array.from(new Set(assignments.map((a) => a.employeeId).filter(Boolean)));
    const gradeIds = Array.from(new Set(assignments.map((a) => a.gradeId).filter((g): g is string => !!g)));

    const [validProfiles, validGrades] = await Promise.all([
      prisma.employeeProfile.findMany({ where: { id: { in: profileIds }, user: { companyId } }, select: { id: true } }),
      gradeIds.length ? prisma.grade.findMany({ where: { id: { in: gradeIds }, companyId }, select: { id: true } }) : Promise.resolve([]),
    ]);
    const okProfiles = new Set(validProfiles.map((p) => p.id));
    const okGrades = new Set(validGrades.map((g) => g.id));

    const toApply = assignments.filter((a) => okProfiles.has(a.employeeId) && (a.gradeId === null || okGrades.has(a.gradeId)));
    if (!toApply.length) return createErrorResponse('No valid assignments (check company scope)', 400);

    await prisma.$transaction(toApply.map((a) => prisma.employeeProfile.update({ where: { id: a.employeeId }, data: { gradeId: a.gradeId } })));

    return NextResponse.json({ success: true, updated: toApply.length, skipped: assignments.length - toApply.length });
  } catch (error) {
    return createErrorResponse(error);
  }
});
