import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { kraMetricSchema, kraMetricUpdateSchema } from '@/lib/validators/kra';

const MANAGERIAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'];

// GET /api/kra/metrics?department=Publication&includeInactive=true
export const GET = authorizedRoute(
  [...MANAGERIAL_ROLES, 'EMPLOYEE', 'EXECUTIVE'],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) return createErrorResponse('Company association required', 403);
      const { searchParams } = new URL(req.url);
      const department = searchParams.get('department');
      const includeInactive = searchParams.get('includeInactive') === 'true';

      const metrics = await prisma.performanceMetricDefinition.findMany({
        where: {
          companyId: user.companyId,
          scope: 'KRA',
          ...(department ? { department } : {}),
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: [{ department: 'asc' }, { name: 'asc' }],
      });

      return NextResponse.json({ metrics });
    } catch (error) {
      return createErrorResponse(error);
    }
  }
);

// POST /api/kra/metrics — create a KRA metric
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const result = kraMetricSchema.safeParse(await req.json());
    if (!result.success) return createErrorResponse(result.error);
    const d = result.data;

    const metric = await prisma.performanceMetricDefinition.upsert({
      where: { companyId_scope_key: { companyId: user.companyId, scope: 'KRA', key: d.key } },
      update: {
        name: d.name, unit: d.unit, direction: d.direction, dataSource: d.dataSource,
        sourceType: d.sourceType ?? null, aggregation: d.aggregation,
        department: d.department ?? null, isActive: d.isActive,
        ...(d.metadata !== undefined ? { metadata: d.metadata as any } : {}),
      },
      create: {
        companyId: user.companyId, scope: 'KRA', sourceModule: 'KRA', key: d.key,
        name: d.name, unit: d.unit, direction: d.direction, dataSource: d.dataSource,
        sourceType: d.sourceType ?? null, aggregation: d.aggregation,
        department: d.department ?? null, isActive: d.isActive,
        ...(d.metadata !== undefined ? { metadata: d.metadata as any } : {}),
      },
    });

    return NextResponse.json({ metric });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// PATCH /api/kra/metrics — update a metric by id
export const PATCH = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const result = kraMetricUpdateSchema.safeParse(await req.json());
    if (!result.success) return createErrorResponse(result.error);
    const { id, ...rest } = result.data;

    const existing = await prisma.performanceMetricDefinition.findFirst({
      where: { id, companyId: user.companyId, scope: 'KRA' },
    });
    if (!existing) return createErrorResponse('Metric not found', 404);

    const metric = await prisma.performanceMetricDefinition.update({
      where: { id },
      data: {
        ...(rest.name !== undefined ? { name: rest.name } : {}),
        ...(rest.unit !== undefined ? { unit: rest.unit } : {}),
        ...(rest.direction !== undefined ? { direction: rest.direction } : {}),
        ...(rest.dataSource !== undefined ? { dataSource: rest.dataSource } : {}),
        ...(rest.sourceType !== undefined ? { sourceType: rest.sourceType ?? null } : {}),
        ...(rest.aggregation !== undefined ? { aggregation: rest.aggregation } : {}),
        ...(rest.department !== undefined ? { department: rest.department ?? null } : {}),
        ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
        ...(rest.metadata !== undefined ? { metadata: rest.metadata as any } : {}),
      },
    });

    return NextResponse.json({ metric });
  } catch (error) {
    return createErrorResponse(error);
  }
});

// DELETE /api/kra/metrics?id=... — soft delete (deactivate)
export const DELETE = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    if (!user.companyId) return createErrorResponse('Company association required', 403);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return createErrorResponse('id is required', 400);

    const existing = await prisma.performanceMetricDefinition.findFirst({
      where: { id, companyId: user.companyId, scope: 'KRA' },
    });
    if (!existing) return createErrorResponse('Metric not found', 404);

    await prisma.performanceMetricDefinition.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
});
