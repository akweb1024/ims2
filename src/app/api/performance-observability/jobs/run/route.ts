import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { runPerformanceObservabilityPhase2 } from '@/lib/performance-observability/jobs';
import { prisma } from '@/lib/prisma';

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN', 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json().catch(() => ({}));
      const requestedCompanyId = typeof body?.companyId === 'string' ? body.companyId : undefined;
      const companyId =
        user.role === 'SUPER_ADMIN' && requestedCompanyId ? requestedCompanyId : user.companyId;

      if (!companyId) throw new ValidationError('Company context is required');

      const result = await runPerformanceObservabilityPhase2(companyId);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PERFORMANCE_PHASE2_JOBS_RUN',
          entity: 'performance_observability',
          entityId: companyId,
          changes: result,
        },
      });

      return NextResponse.json({ success: true, companyId, ...result });
    } catch (error) {
      return handleApiError(error, '/api/performance-observability/jobs/run');
    }
  }
);
