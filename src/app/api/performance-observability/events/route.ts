import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { performanceSignalEventSchema } from '@/lib/validators/performance-observability';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN'],
  async (req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) throw new ValidationError('Company context is required');

      const { searchParams } = new URL(req.url);
      const scope = searchParams.get('scope') || undefined;
      const metricKey = searchParams.get('metricKey') || undefined;
      const severity = searchParams.get('severity') || undefined;
      const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)));

      const data = await prisma.performanceSignalEvent.findMany({
        where: {
          companyId,
          ...(scope ? { metricScope: scope } : {}),
          ...(metricKey ? { metricKey } : {}),
          ...(severity ? { severity } : {}),
        },
        orderBy: { capturedAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({ data });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/events');
    }
  }
);

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_ADMIN', 'TEAM_LEADER'],
  async (req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) throw new ValidationError('Company context is required');

      const body = await req.json();
      const parsed = performanceSignalEventSchema.safeParse(body);
      if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message || 'Invalid payload');

      const event = await prisma.performanceSignalEvent.create({
        data: {
          companyId,
          employeeProfileId: parsed.data.employeeProfileId,
          metricKey: parsed.data.metricKey,
          metricScope: parsed.data.metricScope,
          value: parsed.data.value,
          baselineValue: parsed.data.baselineValue,
          severity: parsed.data.severity || 'INFO',
          sourceModule: parsed.data.sourceModule,
          sourceEntityType: parsed.data.sourceEntityType,
          sourceEntityId: parsed.data.sourceEntityId,
          context: parsed.data.context as Prisma.InputJsonValue | undefined,
          capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date(),
          createdByUserId: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PERFORMANCE_SIGNAL_CAPTURED',
          entity: 'performance_signal_event',
          entityId: event.id,
          changes: {
            metricKey: event.metricKey,
            metricScope: event.metricScope,
            severity: event.severity,
            sourceModule: event.sourceModule,
            employeeProfileId: event.employeeProfileId,
          },
        },
      });

      return NextResponse.json(event, { status: 201 });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/events');
    }
  }
);
