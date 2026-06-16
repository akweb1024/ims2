import { TokenPayload } from '@/lib/auth-core';

export type DashboardScope = 'TEAM' | 'INDIVIDUAL';
export type DashboardWidgetKey =
  | 'marketing_sales_performance'
  | 'attendance_overview'
  | 'team_summary'
  | 'individual_summary'
  | 'follow_up_snapshot'
  | 'invoice_vs_proforma';

export type DashboardWidgetSize = 'SM' | 'MD' | 'LG';

export interface DashboardWidgetDefinition {
  key: DashboardWidgetKey;
  title: string;
  description: string;
  category: string;
  supportedScopes: DashboardScope[];
  requiredRoles: string[];
  requiredModules: string[];
  defaultSize: DashboardWidgetSize;
  defaultOrder: number;
}

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    key: 'marketing_sales_performance',
    title: 'Marketing / Sales Performance',
    description: 'Revenue, follow-up, and billing snapshot for the selected period.',
    category: 'Revenue',
    supportedScopes: ['TEAM', 'INDIVIDUAL'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN'],
    requiredModules: ['CORE', 'FINANCE'],
    defaultSize: 'LG',
    defaultOrder: 1,
  },
  {
    key: 'attendance_overview',
    title: 'Attendance Overview',
    description: 'Attendance, lateness, and absence comparison for current and previous month.',
    category: 'HR',
    supportedScopes: ['TEAM', 'INDIVIDUAL'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'HR_MANAGER', 'HR'],
    requiredModules: ['CORE', 'HR'],
    defaultSize: 'LG',
    defaultOrder: 2,
  },
  {
    key: 'team_summary',
    title: 'Team Summary',
    description: 'Managers get a quick summary of active team members and today’s status.',
    category: 'People',
    supportedScopes: ['TEAM'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER'],
    requiredModules: ['CORE', 'HR'],
    defaultSize: 'MD',
    defaultOrder: 3,
  },
  {
    key: 'individual_summary',
    title: 'Individual Summary',
    description: 'Employee self-summary for attendance, follow-ups, and work output.',
    category: 'People',
    supportedScopes: ['INDIVIDUAL'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN'],
    requiredModules: ['CORE'],
    defaultSize: 'MD',
    defaultOrder: 4,
  },
  {
    key: 'follow_up_snapshot',
    title: 'Follow-up Snapshot',
    description: 'Today’s completed, missed, and upcoming follow-ups.',
    category: 'CRM',
    supportedScopes: ['TEAM', 'INDIVIDUAL'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    requiredModules: ['CORE', 'CRM'],
    defaultSize: 'MD',
    defaultOrder: 5,
  },
  {
    key: 'invoice_vs_proforma',
    title: 'Invoice vs Proforma',
    description: 'Compares invoice and proforma totals for the selected range.',
    category: 'Finance',
    supportedScopes: ['TEAM', 'INDIVIDUAL'],
    requiredRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'FINANCE_ADMIN'],
    requiredModules: ['CORE', 'FINANCE'],
    defaultSize: 'MD',
    defaultOrder: 6,
  },
];

const WIDGET_MAP = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.key, widget] as const));

export function getDashboardWidget(key: string) {
  return WIDGET_MAP.get(key as DashboardWidgetKey) || null;
}

export function getAccessibleDashboardWidgets(user: Pick<TokenPayload, 'role' | 'allowedModules'>) {
  return DASHBOARD_WIDGETS.filter((widget) => {
    if (widget.requiredRoles.includes(user.role)) return true;
    if ((user.allowedModules || []).includes('*')) return true;
    return widget.requiredModules.some((moduleId) => (user.allowedModules || []).includes(moduleId));
  });
}

export function isWidgetAccessibleForScope(widgetKey: string, scope: DashboardScope) {
  const widget = getDashboardWidget(widgetKey);
  return !!widget && widget.supportedScopes.includes(scope);
}
