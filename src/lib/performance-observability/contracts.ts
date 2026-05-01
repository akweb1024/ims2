export const PERFORMANCE_SCOPES = ['EMPLOYEE', 'TEAM', 'COMPANY'] as const;
export type PerformanceScope = (typeof PERFORMANCE_SCOPES)[number];

export const PERFORMANCE_DIRECTIONS = ['HIGHER_IS_BETTER', 'LOWER_IS_BETTER'] as const;
export type PerformanceDirection = (typeof PERFORMANCE_DIRECTIONS)[number];

export const PERFORMANCE_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export type PerformanceSeverity = (typeof PERFORMANCE_SEVERITIES)[number];

export interface DefaultMetricDefinition {
  scope: PerformanceScope;
  key: string;
  name: string;
  description: string;
  unit: string;
  direction: PerformanceDirection;
  warningThreshold?: number;
  criticalThreshold?: number;
  sourceModule: string;
}

export const DEFAULT_PERFORMANCE_METRICS: DefaultMetricDefinition[] = [
  {
    scope: 'EMPLOYEE',
    key: 'attendance_rate_7d',
    name: 'Attendance Rate (7d)',
    description: 'Attendance ratio over the rolling last 7 days.',
    unit: 'PERCENT',
    direction: 'HIGHER_IS_BETTER',
    warningThreshold: 80,
    criticalThreshold: 60,
    sourceModule: 'HR',
  },
  {
    scope: 'EMPLOYEE',
    key: 'task_completion_rate_7d',
    name: 'Task Completion Rate (7d)',
    description: 'Completed tasks divided by assigned tasks over 7 days.',
    unit: 'PERCENT',
    direction: 'HIGHER_IS_BETTER',
    warningThreshold: 75,
    criticalThreshold: 50,
    sourceModule: 'TASKS',
  },
  {
    scope: 'COMPANY',
    key: 'revenue_per_employee_mtd',
    name: 'Revenue per Employee (MTD)',
    description: 'Month-to-date verified revenue divided by active employees.',
    unit: 'INR',
    direction: 'HIGHER_IS_BETTER',
    sourceModule: 'FINANCE',
  },
  {
    scope: 'COMPANY',
    key: 'dispatch_sla_breach_rate_7d',
    name: 'Dispatch SLA Breach Rate (7d)',
    description: 'Ratio of delayed dispatches in the last 7 days.',
    unit: 'PERCENT',
    direction: 'LOWER_IS_BETTER',
    warningThreshold: 20,
    criticalThreshold: 35,
    sourceModule: 'SUPPLY_CHAIN',
  },
];
