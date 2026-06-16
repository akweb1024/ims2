import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { dashboardWidgetPolicySchema } from '@/lib/validation/schemas';
import { DASHBOARD_WIDGETS } from '@/lib/dashboard/widgets';

export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async (_req: NextRequest, user) => {
  try {
    const [catalogRows, policies, roleDefaults] = await Promise.all([
      prisma.dashboardWidgetCatalog.findMany({ orderBy: [{ defaultOrder: 'asc' }, { title: 'asc' }] }),
      prisma.dashboardWidgetPolicy.findMany({
        where: {
          OR: [
            { companyId: user.companyId || null },
            { companyId: null },
          ],
        },
        orderBy: [{ widgetKey: 'asc' }, { scope: 'asc' }],
      }),
      prisma.dashboardRoleDefault.findMany({
        where: {
          OR: [
            { companyId: user.companyId || null },
            { companyId: null },
          ],
        },
        orderBy: [{ role: 'asc' }, { context: 'asc' }],
      }),
    ]);

    const catalogMap = new Map(catalogRows.map((item) => [item.key, item]));
    const catalog = DASHBOARD_WIDGETS.map((widget) => {
      const row = catalogMap.get(widget.key);
      return row || {
        key: widget.key,
        title: widget.title,
        description: widget.description,
        category: widget.category,
        supportedScopes: widget.supportedScopes,
        defaultSize: widget.defaultSize,
        defaultOrder: widget.defaultOrder,
        isActive: true,
      };
    });

    const [globalAttendancePolicy, companyAttendancePolicy] = await Promise.all([
      prisma.attendancePolicy.findUnique({ where: { id: 'singleton' } }),
      user.companyId ? prisma.companyAttendancePolicy.findUnique({ where: { companyId: user.companyId } }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      catalog,
      policies,
      roleDefaults,
      attendancePolicy: {
        global: globalAttendancePolicy,
        company: companyAttendancePolicy,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const PATCH = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();

    if (body.target === 'catalog') {
      const { key, isActive, title, description, category, defaultSize, defaultOrder, supportedScopes } = body;
      if (!key) return createErrorResponse('Widget key is required', 400);

      const updated = await prisma.dashboardWidgetCatalog.upsert({
        where: { key },
        update: {
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(title ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(category ? { category } : {}),
          ...(defaultSize ? { defaultSize } : {}),
          ...(defaultOrder !== undefined ? { defaultOrder: Number(defaultOrder) || 0 } : {}),
          ...(Array.isArray(supportedScopes) ? { supportedScopes } : {}),
        },
        create: {
          key,
          title: title || key,
          description: description || null,
          category: category || 'General',
          defaultSize: defaultSize || 'MD',
          defaultOrder: Number(defaultOrder) || 0,
          supportedScopes: Array.isArray(supportedScopes) ? supportedScopes : ['TEAM', 'INDIVIDUAL'],
          isActive: typeof isActive === 'boolean' ? isActive : true,
        },
      });
      return NextResponse.json(updated);
    }

    if (body.target === 'roleDefault') {
      const { role, context, widgetOrder, widgetVisibility, widgetConfig, companyId } = body;
      if (!role || !context || !Array.isArray(widgetOrder) || !widgetVisibility) {
        return createErrorResponse('role, context, widgetOrder, and widgetVisibility are required', 400);
      }

      const targetCompanyId = companyId !== undefined ? companyId : user.companyId ?? null;
      const existing = await prisma.dashboardRoleDefault.findFirst({
        where: { companyId: targetCompanyId, role, context },
      });
      const updated = existing
        ? await prisma.dashboardRoleDefault.update({
            where: { id: existing.id },
            data: {
              widgetOrder,
              widgetVisibility,
              widgetConfig: widgetConfig || {},
            },
          })
        : await prisma.dashboardRoleDefault.create({
            data: {
              companyId: targetCompanyId,
              role,
              context,
              widgetOrder,
              widgetVisibility,
              widgetConfig: widgetConfig || {},
            },
          });

      return NextResponse.json(updated);
    }

    const validation = dashboardWidgetPolicySchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const data = validation.data;
    const targetCompanyId = data.companyId !== undefined ? data.companyId : user.companyId ?? null;
    const existing = await prisma.dashboardWidgetPolicy.findFirst({
      where: {
        companyId: targetCompanyId,
        widgetKey: data.widgetKey,
        scope: data.scope,
      },
    });

    const updated = existing
      ? await prisma.dashboardWidgetPolicy.update({
          where: { id: existing.id },
          data: {
            allowedRoles: data.allowedRoles,
            allowedUserIds: data.allowedUserIds,
            defaultVisible: data.defaultVisible,
            locked: data.locked,
            minRole: data.minRole || null,
            config: data.config || {},
          },
        })
      : await prisma.dashboardWidgetPolicy.create({
          data: {
            companyId: targetCompanyId,
            widgetKey: data.widgetKey,
            scope: data.scope,
            allowedRoles: data.allowedRoles,
            allowedUserIds: data.allowedUserIds,
            defaultVisible: data.defaultVisible,
            locked: data.locked,
            minRole: data.minRole || null,
            config: data.config || {},
          },
        });

    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error);
  }
});
