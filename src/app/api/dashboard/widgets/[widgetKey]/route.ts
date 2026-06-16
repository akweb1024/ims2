import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { canAccessDashboardWidget } from '@/lib/dashboard/customization';
import { DashboardScope, getDashboardWidget } from '@/lib/dashboard/widgets';
import { getDashboardWidgetPayload } from '@/lib/dashboard/data';

function resolveContext(userRole: string, requested?: string | null): DashboardScope {
  if (requested === 'TEAM' || requested === 'INDIVIDUAL') return requested;
  if (['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(userRole)) return 'TEAM';
  return 'INDIVIDUAL';
}

export const GET = authorizedRoute([], async (req: NextRequest, user, context) => {
  try {
    const widgetKey = context?.params?.widgetKey as string;
    const widget = getDashboardWidget(widgetKey);
    if (!widget) {
      return createErrorResponse('Widget not found', 404);
    }

    const { searchParams } = new URL(req.url);
    const scope = resolveContext(user.role, searchParams.get('context'));

    if (!canAccessDashboardWidget(user, widgetKey, scope, [])) {
      return createErrorResponse('Forbidden', 403);
    }

    const payload = await getDashboardWidgetPayload(widget.key, {
      user,
      scope,
      filters: {
        companyId: searchParams.get('companyId'),
        employeeId: searchParams.get('employeeId'),
        departmentId: searchParams.get('departmentId'),
        teamId: searchParams.get('teamId'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
      },
    });

    return NextResponse.json({
      widgetKey,
      scope,
      payload,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
