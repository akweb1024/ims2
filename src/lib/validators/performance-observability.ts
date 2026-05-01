import { z } from 'zod';
import {
  PERFORMANCE_DIRECTIONS,
  PERFORMANCE_SCOPES,
  PERFORMANCE_SEVERITIES,
} from '@/lib/performance-observability/contracts';

export const performanceMetricDefinitionSchema = z.object({
  companyId: z.string().optional(),
  scope: z.enum(PERFORMANCE_SCOPES),
  key: z.string().min(2).max(80),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  unit: z.string().min(2).max(20),
  direction: z.enum(PERFORMANCE_DIRECTIONS),
  warningThreshold: z.number().optional(),
  criticalThreshold: z.number().optional(),
  sourceModule: z.string().min(2).max(60),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const performanceSignalEventSchema = z.object({
  companyId: z.string().optional(),
  employeeProfileId: z.string().optional(),
  metricKey: z.string().min(2).max(80),
  metricScope: z.enum(PERFORMANCE_SCOPES),
  value: z.number(),
  baselineValue: z.number().optional(),
  severity: z.enum(PERFORMANCE_SEVERITIES).optional(),
  sourceModule: z.string().min(2).max(60),
  sourceEntityType: z.string().max(80).optional(),
  sourceEntityId: z.string().max(80).optional(),
  context: z.record(z.string(), z.any()).optional(),
  capturedAt: z.string().datetime().optional(),
});
