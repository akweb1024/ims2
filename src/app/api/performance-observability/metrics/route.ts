import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { DEFAULT_PERFORMANCE_METRICS } from '@/lib/performance-observability/contracts';
import { performanceMetricDefinitionSchema } from '@/lib/validators/performance-observability';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'],
  async (_req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) throw new ValidationError('Company context is required');

      const metrics = await prisma.performanceMetricDefinition.findMany({
        where: {
          OR: [{ companyId }, { companyId: null }],
          isActive: true,
        },
        orderBy: [{ scope: 'asc' }, { key: 'asc' }],
      });

      return NextResponse.json({ data: metrics });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/metrics');
    }
  }
);

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'],
  async (req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) throw new ValidationError('Company context is required');

      const body = await req.json();

      if (body?.seedDefaults === true) {
        const created = await prisma.$transaction(
          DEFAULT_PERFORMANCE_METRICS.map((metric) =>
            prisma.performanceMetricDefinition.upsert({
              where: {
                companyId_scope_key: {
                  companyId,
                  scope: metric.scope,
                  key: metric.key,
                },
              },
              update: {
                name: metric.name,
                description: metric.description,
                unit: metric.unit,
                direction: metric.direction,
                warningThreshold: metric.warningThreshold,
                criticalThreshold: metric.criticalThreshold,
                sourceModule: metric.sourceModule,
                isActive: true,
              },
              create: {
                companyId,
                ...metric,
                isActive: true,
              },
            })
          )
        );
        return NextResponse.json({ seeded: created.length, data: created });
      }

      const parsed = performanceMetricDefinitionSchema.safeParse(body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid payload');

      // Upsert on the table's unique key — a plain create returned a raw P2002
      // 500 when the same key was submitted twice.
      const metricData = {
        name: parsed.data.name,
        description: parsed.data.description,
        unit: parsed.data.unit,
        direction: parsed.data.direction,
        warningThreshold: parsed.data.warningThreshold,
        criticalThreshold: parsed.data.criticalThreshold,
        sourceModule: parsed.data.sourceModule,
        isActive: parsed.data.isActive ?? true,
        metadata: parsed.data.metadata as Prisma.InputJsonValue | undefined,
      };
      const metric = await prisma.performanceMetricDefinition.upsert({
        where: {
          companyId_scope_key: {
            companyId,
            scope: parsed.data.scope,
            key: parsed.data.key,
          },
        },
        update: metricData,
        create: {
          companyId,
          scope: parsed.data.scope,
          key: parsed.data.key,
          ...metricData,
        },
      });

      return NextResponse.json(metric, { status: 201 });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/metrics');
    }
  }
);
