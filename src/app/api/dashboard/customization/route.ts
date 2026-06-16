import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { dashboardWidgetLayoutSchema } from '@/lib/validation/schemas';
import { canAccessDashboardWidget, resolveDashboardLayout, saveDashboardLayoutPreference } from '@/lib/dashboard/customization';
import { resolveEffectiveAttendancePolicy } from '@/lib/attendance-policy';
import { DashboardScope, getDashboardWidget } from '@/lib/dashboard/widgets';
import { prisma } from '@/lib/prisma';

function resolveContext(userRole: string, requested?: string | null): DashboardScope {
  if (requested === 'TEAM' || requested === 'INDIVIDUAL') return requested;
  if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(userRole)) return 'TEAM';
  return 'INDIVIDUAL';
}

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const context = resolveContext(user.role, searchParams.get('context'));
    const layout = await resolveDashboardLayout({ user, context });
    const attendancePolicy = await resolveEffectiveAttendancePolicy({
      employeeId: user.id,
      companyId: user.companyId || null,
    });

    return NextResponse.json({
      ...layout,
      attendancePolicy,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const PATCH = authorizedRoute([], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = dashboardWidgetLayoutSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const input = validation.data;
    const lockedPolicies = await prisma.dashboardWidgetPolicy.findMany({
      where: {
        OR: [
          { companyId: user.companyId || null, scope: input.context },
          { companyId: null, scope: input.context },
        ],
        locked: true,
      },
      select: { widgetKey: true },
    });

    for (const policy of lockedPolicies) {
      if (input.widgetVisibility[policy.widgetKey] === false) {
        return createErrorResponse(`Widget ${policy.widgetKey} is locked and cannot be hidden`, 400);
      }
    }

    for (const widgetKey of input.widgetOrder) {
      const widget = getDashboardWidget(widgetKey);
      if (!widget) {
        return createErrorResponse(`Unknown widget: ${widgetKey}`, 400);
      }
      if (!canAccessDashboardWidget(user, widgetKey, input.context, [])) {
        return createErrorResponse(`You do not have access to widget: ${widgetKey}`, 403);
      }
    }

    const saved = await saveDashboardLayoutPreference({
      user,
      context: input.context,
      selectedScope: input.selectedScope,
      widgetOrder: input.widgetOrder,
      widgetVisibility: input.widgetVisibility,
      widgetConfig: input.widgetConfig || {},
    });

    return NextResponse.json(saved);
  } catch (error) {
    return createErrorResponse(error);
  }
});
