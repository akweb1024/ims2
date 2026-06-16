import { TokenPayload } from '@/lib/auth-core';
import { DashboardScope, DashboardWidgetDefinition, DashboardWidgetKey, DASHBOARD_WIDGETS, getAccessibleDashboardWidgets, getDashboardWidget } from './widgets';

export interface DashboardWidgetState {
  key: DashboardWidgetKey;
  title: string;
  description: string;
  category: string;
  scope: DashboardScope;
  visible: boolean;
  locked: boolean;
  order: number;
  size: 'SM' | 'MD' | 'LG';
  config: Record<string, any>;
  allowed: boolean;
}

export interface ResolvedDashboardLayout {
  context: DashboardScope;
  selectedScope: DashboardScope;
  widgets: DashboardWidgetState[];
  roleDefaultSource: 'ROLE' | 'USER' | 'CATALOG';
  availableWidgets: DashboardWidgetDefinition[];
}

export interface DashboardLayoutSnapshot {
  accessibleWidgets: DashboardWidgetDefinition[];
  roleDefault?: {
    widgetVisibility?: unknown;
    widgetOrder?: unknown;
    widgetConfig?: unknown;
  } | null;
  userPref?: {
    widgetVisibility?: unknown;
    widgetOrder?: unknown;
    widgetConfig?: unknown;
    selectedScope?: unknown;
  } | null;
  policies?: Array<{
    widgetKey: string;
    locked: boolean;
    allowedRoles: string[] | null;
    allowedUserIds: string[] | null;
  }>;
}

const defaultVisibility = (widgets: DashboardWidgetDefinition[]) => {
  const visibility: Record<string, boolean> = {};
  widgets.forEach((widget) => {
    visibility[widget.key] = true;
  });
  return visibility;
};

const defaultOrder = (widgets: DashboardWidgetDefinition[]) => widgets.map((widget) => widget.key);

const asRecord = (value: unknown) => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
);

const asStringArray = (value: unknown) => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
);

const asDashboardScope = (value: unknown, fallback: DashboardScope) => (
  value === 'TEAM' || value === 'INDIVIDUAL' ? value : fallback
);

export function normalizeDashboardOrder(order: string[], allowedKeys: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const key of order) {
    if (!allowedKeys.includes(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
  }

  for (const key of allowedKeys) {
    if (!seen.has(key)) normalized.push(key);
  }

  return normalized;
}

export function canAccessDashboardWidget(
  user: Pick<TokenPayload, 'role' | 'allowedModules'>,
  widgetKey: string,
  scope: DashboardScope,
  allowedRoles: string[] = []
) {
  const widget = getDashboardWidget(widgetKey);
  if (!widget || !widget.supportedScopes.includes(scope)) return false;
  const accessible = getAccessibleDashboardWidgets(user);
  if (!accessible.find((item) => item.key === widget.key)) return false;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') return false;
  return true;
}

export async function resolveDashboardLayout(params: {
  user: Pick<TokenPayload, 'id' | 'role' | 'companyId' | 'allowedModules'>;
  context: DashboardScope;
}) : Promise<ResolvedDashboardLayout> {
  const { user, context } = params;
  const { prisma } = await import('@/lib/prisma');
  const accessibleWidgets = getAccessibleDashboardWidgets(user).filter((widget) => widget.supportedScopes.includes(context));

  const [roleDefault, userPref, policies] = await Promise.all([
    prisma.dashboardRoleDefault.findFirst({
      where: {
        OR: [
          { companyId: user.companyId || null, role: user.role, context },
          { companyId: null, role: user.role, context },
        ],
      },
    }),
    prisma.dashboardLayoutPreference.findUnique({
      where: { userId_context: { userId: user.id, context } },
    }),
    prisma.dashboardWidgetPolicy.findMany({
      where: {
        OR: [
          { companyId: user.companyId || null, scope: context },
          { companyId: null, scope: context },
        ],
      },
    }),
  ]);

  const resolved = resolveDashboardLayoutFromSnapshot({
    accessibleWidgets,
    roleDefault,
    userPref,
    policies,
    context,
    user,
  });

  return {
    context,
    selectedScope: resolved.selectedScope,
    widgets: resolved.widgets,
    roleDefaultSource: resolved.roleDefaultSource,
    availableWidgets: resolved.availableWidgets,
  };
}

export function resolveDashboardLayoutFromSnapshot(params: {
  accessibleWidgets: DashboardWidgetDefinition[];
  roleDefault?: DashboardLayoutSnapshot['roleDefault'];
  userPref?: DashboardLayoutSnapshot['userPref'];
  policies?: DashboardLayoutSnapshot['policies'];
  context: DashboardScope;
  user: Pick<TokenPayload, 'id' | 'role'>;
}): ResolvedDashboardLayout {
  const { accessibleWidgets, roleDefault, userPref, policies = [], context, user } = params;

  const baseVisibility = {
    ...defaultVisibility(accessibleWidgets),
    ...asRecord(roleDefault?.widgetVisibility),
    ...asRecord(userPref?.widgetVisibility),
  };

  const policyMap = new Map(
    policies.map((policy) => [policy.widgetKey, policy])
  );

  const configMap = {
    ...asRecord(roleDefault?.widgetConfig),
    ...asRecord(userPref?.widgetConfig),
  };

  const isPolicyAllowed = (key: string) => {
    const policy = policyMap.get(key);
    if (!policy) return true;
    const roles = policy.allowedRoles || [];
    const users = policy.allowedUserIds || [];
    const rolesAllowed = roles.length === 0 || roles.includes(user.role) || user.role === 'SUPER_ADMIN';
    const usersAllowed = users.length === 0 || users.includes(user.id) || user.role === 'SUPER_ADMIN';
    return rolesAllowed && usersAllowed;
  };

  const availableWidgets = accessibleWidgets.filter((widget) => isPolicyAllowed(widget.key));
  const allowedKeys = availableWidgets.map((widget) => widget.key);
  const preferredOrder = asStringArray(userPref?.widgetOrder);
  const roleOrder = asStringArray(roleDefault?.widgetOrder);
  const resolvedOrder = normalizeDashboardOrder(
    preferredOrder.length > 0
      ? preferredOrder
      : roleOrder.length > 0
        ? roleOrder
        : defaultOrder(availableWidgets),
    allowedKeys
  );

  const widgets = resolvedOrder.map((key, index) => {
    const widget = getDashboardWidget(key);
    const policy = policyMap.get(key);
    return {
      key: key as DashboardWidgetKey,
      title: widget?.title || key,
      description: widget?.description || '',
      category: widget?.category || 'General',
      scope: context,
      visible: policy?.locked ? true : baseVisibility[key] !== false,
      locked: !!policy?.locked,
      order: index + 1,
      size: widget?.defaultSize || 'MD',
      config: (configMap[key] || {}) as Record<string, any>,
      allowed: !!widget && isPolicyAllowed(key),
    };
  });

  return {
    context,
    selectedScope: asDashboardScope(userPref?.selectedScope, context),
    widgets,
    roleDefaultSource: userPref ? 'USER' : roleDefault ? 'ROLE' : 'CATALOG',
    availableWidgets,
  };
}

export async function saveDashboardLayoutPreference(params: {
  user: Pick<TokenPayload, 'id' | 'companyId' | 'role'>;
  context: DashboardScope;
  selectedScope: DashboardScope;
  widgetOrder: string[];
  widgetVisibility: Record<string, boolean>;
  widgetConfig?: Record<string, any>;
}) {
  const { user, context, selectedScope, widgetOrder, widgetVisibility, widgetConfig } = params;
  const { prisma } = await import('@/lib/prisma');
  const availableWidgets = getAccessibleDashboardWidgets(user).filter((widget) => widget.supportedScopes.includes(context));
  const allowedKeys = availableWidgets.map((widget) => widget.key);
  const normalizedOrder = normalizeDashboardOrder(widgetOrder, allowedKeys);

  return prisma.dashboardLayoutPreference.upsert({
    where: { userId_context: { userId: user.id, context } },
    update: {
      companyId: user.companyId || null,
      selectedScope,
      widgetOrder: normalizedOrder,
      widgetVisibility,
      widgetConfig: widgetConfig || {},
    },
    create: {
      companyId: user.companyId || null,
      userId: user.id,
      context,
      selectedScope,
      widgetOrder: normalizedOrder,
      widgetVisibility,
      widgetConfig: widgetConfig || {},
    },
  });
}
