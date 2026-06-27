import { z } from 'zod';

const PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;
const DATA_SOURCES = ['SYSTEM', 'MANUAL', 'HYBRID'] as const;
const AGGREGATIONS = ['SUM', 'COUNT', 'AVG'] as const;
const DIRECTIONS = ['HIGHER_BETTER', 'LOWER_BETTER'] as const;

/** Create/update a KRA metric (stored in PerformanceMetricDefinition, scope=KRA). */
export const kraMetricSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'lowercase letters, numbers, underscore only'),
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(32),
  direction: z.enum(DIRECTIONS).default('HIGHER_BETTER'),
  dataSource: z.enum(DATA_SOURCES).default('MANUAL'),
  sourceType: z.string().max(64).nullish(),
  aggregation: z.enum(AGGREGATIONS).default('SUM'),
  department: z.string().max(64).nullish(),
  isActive: z.boolean().default(true),
});

export const kraMetricUpdateSchema = kraMetricSchema.partial().extend({
  id: z.string().min(1),
});

/** One metric line inside a template. */
export const kraTemplateItemSchema = z.object({
  metricId: z.string().min(1),
  defaultTarget: z.number().nonnegative().default(0),
  weight: z.number().positive().default(1),
  periodType: z.enum(PERIOD_TYPES).default('MONTHLY'),
  minThreshold: z.number().nonnegative().nullish(),
});

export const kraTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullish(),
  departmentId: z.string().nullish(),
  designationId: z.string().nullish(),
  isActive: z.boolean().default(true),
  items: z.array(kraTemplateItemSchema).default([]),
});

export const kraTemplateUpdateSchema = kraTemplateSchema.partial().extend({
  id: z.string().min(1),
});

/** Apply a template to a set of employees for a period. */
export const kraAssignSchema = z
  .object({
    templateId: z.string().min(1),
    periodType: z.enum(PERIOD_TYPES).default('MONTHLY'),
    // reference date inside the target period; defaults to "today" server-side
    periodRef: z.string().datetime().optional(),
    employeeIds: z.array(z.string()).optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    reviewerId: z.string().optional(),
    // per-employee per-metric target tweaks
    overrides: z
      .array(
        z.object({
          employeeId: z.string().min(1),
          metricId: z.string().min(1),
          target: z.number().nonnegative(),
        })
      )
      .optional(),
  })
  .refine(
    (v) => (v.employeeIds && v.employeeIds.length > 0) || v.departmentId || v.designationId,
    { message: 'Provide employeeIds, departmentId, or designationId to target employees' }
  );

export type KraAssignInput = z.infer<typeof kraAssignSchema>;

/** Employee submits reported metric values (from a work report or standalone). */
export const kraContributionSubmitSchema = z.object({
  employeeId: z.string().optional(), // managers may submit on behalf; defaults to self
  workReportId: z.string().optional(),
  date: z.string().datetime().optional(),
  entries: z
    .array(z.object({ metricId: z.string().min(1), value: z.number().finite() }))
    .min(1, 'At least one metric value is required'),
});

/** Manager approves or rejects a pending/flagged contribution. */
export const kraContributionReviewSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  verifiedValue: z.number().nonnegative().optional(),
  note: z.string().max(500).optional(),
});
