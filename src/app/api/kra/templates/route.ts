import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { kraTemplateSchema, kraTemplateUpdateSchema } from '@/lib/validators/kra';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];

const templateInclude = {
  items: { include: { metric: true }, orderBy: { createdAt: 'asc' as const } },
};

// GET /api/kra/templates?departmentId=...
export const GET = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const templates = await prisma.kraTemplate.findMany({
      where: {
        companyId: user.companyId,
        ...(departmentId ? { departmentId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: templateInclude,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// POST /api/kra/templates — create template with items
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const result = kraTemplateSchema.safeParse(await req.json());
    if (!result.success) return createErrorResponse(result.error);
    const { items, ...t } = result.data;

    // Guard: all referenced metrics belong to this company.
    if (items.length) {
      const ids = Array.from(new Set(items.map((i) => i.metricId)));
      const count = await prisma.performanceMetricDefinition.count({
        where: { id: { in: ids }, companyId: user.companyId, scope: 'KRA' },
      });
      if (count !== ids.length) return createErrorResponse('One or more metrics are invalid', 400);
    }

    const template = await prisma.kraTemplate.create({
      data: {
        companyId: user.companyId,
        name: t.name,
        description: t.description ?? null,
        departmentId: t.departmentId ?? null,
        designationId: t.designationId ?? null,
        isActive: t.isActive,
        items: {
          create: items.map((i) => ({
            metricId: i.metricId,
            defaultTarget: i.defaultTarget,
            weight: i.weight,
            periodType: i.periodType,
            dimension: i.dimension,
            minThreshold: i.minThreshold ?? null,
            ratePerUnit: i.ratePerUnit ?? null,
          })),
        },
      },
      include: templateInclude,
    });

    return NextResponse.json({ template });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// PATCH /api/kra/templates — update template; if `items` provided, replace them wholesale
export const PATCH = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const result = kraTemplateUpdateSchema.safeParse(await req.json());
    if (!result.success) return createErrorResponse(result.error);
    const { id, items, ...rest } = result.data;

    const existing = await prisma.kraTemplate.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return createErrorResponse('Template not found', 404);

    if (items && items.length) {
      const ids = Array.from(new Set(items.map((i) => i.metricId)));
      const count = await prisma.performanceMetricDefinition.count({
        where: { id: { in: ids }, companyId: user.companyId, scope: 'KRA' },
      });
      if (count !== ids.length) return createErrorResponse('One or more metrics are invalid', 400);
    }

    const template = await prisma.$transaction(async (tx) => {
      await tx.kraTemplate.update({
        where: { id },
        data: {
          ...(rest.name !== undefined ? { name: rest.name } : {}),
          ...(rest.description !== undefined ? { description: rest.description ?? null } : {}),
          ...(rest.departmentId !== undefined ? { departmentId: rest.departmentId ?? null } : {}),
          ...(rest.designationId !== undefined ? { designationId: rest.designationId ?? null } : {}),
          ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
        },
      });

      if (items) {
        await tx.kraTemplateItem.deleteMany({ where: { templateId: id } });
        if (items.length) {
          await tx.kraTemplateItem.createMany({
            data: items.map((i) => ({
              templateId: id,
              metricId: i.metricId,
              defaultTarget: i.defaultTarget,
              weight: i.weight,
              periodType: i.periodType,
              dimension: i.dimension,
              minThreshold: i.minThreshold ?? null,
              ratePerUnit: i.ratePerUnit ?? null,
            })),
          });
        }
      }

      return tx.kraTemplate.findUnique({ where: { id }, include: templateInclude });
    });

    return NextResponse.json({ template });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// DELETE /api/kra/templates?id=... — hard delete (items cascade)
export const DELETE = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return createErrorResponse('id is required', 400);

    const existing = await prisma.kraTemplate.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return createErrorResponse('Template not found', 404);

    await prisma.kraTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
});
