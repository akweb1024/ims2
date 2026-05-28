import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/notifications';

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR', 'HR_MANAGER', 'TEAM_LEADER'], async (req: NextRequest, user: any) => {
  try {
    if (!user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const templateIds = Array.isArray(body.templateIds) ? body.templateIds.map(String) : [];
    const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map(String) : [];
    const mode = body.mode === 'replace' ? 'replace' : 'append';

    if (!templateIds.length) return NextResponse.json({ error: 'templateIds required' }, { status: 400 });
    if (!employeeIds.length) return NextResponse.json({ error: 'employeeIds required' }, { status: 400 });

    const templates = await prisma.employeeTaskTemplate.findMany({
      where: { id: { in: templateIds }, companyId: user.companyId },
      select: { id: true, employeeIds: true }
    });

    let updated = 0;
    for (const t of templates) {
      const current = Array.isArray(t.employeeIds) ? t.employeeIds.map((x) => String(x)) : [];
      const next = mode === 'replace'
        ? [...new Set(employeeIds)]
        : [...new Set([...current, ...employeeIds])];

      await prisma.employeeTaskTemplate.update({
        where: { id: t.id },
        data: { employeeIds: next as any }
      });
      updated += 1;
    }

    await createAuditLog({
      userId: user.id,
      action: 'HR_TASK_TEMPLATE_BULK_ASSIGN',
      entity: 'employee_task_template',
      entityId: user.companyId || 'GLOBAL',
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'UNKNOWN',
      changes: {
        mode,
        templateIds,
        employeeIds,
        updatedTemplates: updated,
      }
    });

    return NextResponse.json({
      success: true,
      updatedTemplates: updated,
      mode,
      assignedEmployees: employeeIds.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed bulk assignment' }, { status: 500 });
  }
});
