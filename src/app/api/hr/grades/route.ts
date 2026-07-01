import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { defaultGradeRows } from '@/lib/hr/grades';

const READ_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN'];
const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'];

function resolveCompanyId(user: { role: string; companyId?: string | null }, requested?: string | null) {
  if (requested && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return requested;
  return user.companyId || requested || null;
}

// GET /api/hr/grades?companyId=... — the company's grade ladder (ICDR §2).
export const GET = authorizedRoute(READ_ROLES, async (req: NextRequest, user) => {
  try {
    const companyId = resolveCompanyId(user, new URL(req.url).searchParams.get('companyId'));
    if (!companyId) return createErrorResponse('Company association required', 403);

    const grades = await prisma.grade.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { employees: true, designations: true } } },
    });
    return NextResponse.json({ grades });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// POST /api/hr/grades
//  - { action: 'seed-defaults' } → seed the framework G0–G8 ladder (idempotent per code).
//  - otherwise create one grade.
export const POST = authorizedRoute(WRITE_ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));
    const companyId = resolveCompanyId(user, body.companyId);
    if (!companyId) return createErrorResponse('Company association required', 403);

    if (body.action === 'seed-defaults') {
      const result = await prisma.grade.createMany({ data: defaultGradeRows(companyId), skipDuplicates: true });
      return NextResponse.json({ success: true, seeded: result.count });
    }

    if (!body.code?.trim() || !body.name?.trim()) return createErrorResponse('code and name are required', 400);
    const grade = await prisma.grade.create({
      data: {
        companyId,
        code: body.code.trim(),
        name: body.name.trim(),
        order: Number.isFinite(body.order) ? Number(body.order) : 0,
        minCtc: body.minCtc != null && body.minCtc !== '' ? Number(body.minCtc) : null,
        midCtc: body.midCtc != null && body.midCtc !== '' ? Number(body.midCtc) : null,
        maxCtc: body.maxCtc != null && body.maxCtc !== '' ? Number(body.maxCtc) : null,
        noticeDays: body.noticeDays != null && body.noticeDays !== '' ? Number(body.noticeDays) : null,
        typicalExperience: body.typicalExperience?.trim() || null,
        decisionRights: body.decisionRights?.trim() || null,
        incrementMinPct: body.incrementMinPct != null && body.incrementMinPct !== '' ? Number(body.incrementMinPct) : null,
        incrementMaxPct: body.incrementMaxPct != null && body.incrementMaxPct !== '' ? Number(body.incrementMaxPct) : null,
      },
    });
    return NextResponse.json({ grade }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// PATCH /api/hr/grades — update a grade (company-scoped).
export const PATCH = authorizedRoute(WRITE_ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    if (!body.id) return createErrorResponse('id is required', 400);
    const companyId = resolveCompanyId(user, body.companyId);
    const existing = await prisma.grade.findFirst({ where: { id: body.id, ...(companyId ? { companyId } : {}) }, select: { id: true } });
    if (!existing) return createErrorResponse('Grade not found', 404);

    const num = (v: unknown) => (v != null && v !== '' ? Number(v) : null);
    const grade = await prisma.grade.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.code !== undefined ? { code: String(body.code).trim() } : {}),
        ...(body.order !== undefined ? { order: Number(body.order) || 0 } : {}),
        ...(body.minCtc !== undefined ? { minCtc: num(body.minCtc) } : {}),
        ...(body.midCtc !== undefined ? { midCtc: num(body.midCtc) } : {}),
        ...(body.maxCtc !== undefined ? { maxCtc: num(body.maxCtc) } : {}),
        ...(body.noticeDays !== undefined ? { noticeDays: num(body.noticeDays) } : {}),
        ...(body.typicalExperience !== undefined ? { typicalExperience: String(body.typicalExperience).trim() || null } : {}),
        ...(body.decisionRights !== undefined ? { decisionRights: String(body.decisionRights).trim() || null } : {}),
        ...(body.incrementMinPct !== undefined ? { incrementMinPct: num(body.incrementMinPct) } : {}),
        ...(body.incrementMaxPct !== undefined ? { incrementMaxPct: num(body.incrementMaxPct) } : {}),
        ...(body.isActive !== undefined ? { isActive: !!body.isActive } : {}),
      },
    });
    return NextResponse.json({ grade });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// DELETE /api/hr/grades?id=... — remove a grade (employee/designation refs are set null).
export const DELETE = authorizedRoute(WRITE_ROLES, async (req: NextRequest, user) => {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return createErrorResponse('id is required', 400);
    const companyId = resolveCompanyId(user, null);
    const existing = await prisma.grade.findFirst({ where: { id, ...(companyId ? { companyId } : {}) }, select: { id: true } });
    if (!existing) return createErrorResponse('Grade not found', 404);
    await prisma.grade.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
});
