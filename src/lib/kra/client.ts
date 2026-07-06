'use client';

/** Authenticated fetch helper for KRA client pages (mirrors the app's Bearer-token pattern). */
export async function kraFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;
/** Goal-loop periods include DAILY/WEEKLY (Plan B). */
export const GOAL_PERIOD_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'] as const;
export const KRA_DIMENSIONS = ['OUTPUT', 'QUALITY', 'TAT', 'COLLABORATION', 'IMPROVEMENT', 'BEHAVIOR'] as const;
export const DATA_SOURCES = ['MANUAL', 'SYSTEM', 'HYBRID'] as const;
export const AGGREGATIONS = ['SUM', 'COUNT', 'AVG'] as const;

/** A dated progress log (backed by MetricContribution). */
export interface KraLog {
  id: string;
  metricId: string;
  reportedValue: number;
  verifiedValue: number | null;
  status: string;
  source: string;
  note: string | null;
  date: string;
}

export interface KraProof {
  id: string;
  type: string;
  url: string | null;
  note: string | null;
  createdAt: string;
}

export interface KraGoalVerification {
  id: string;
  level: string;
  verifierId: string;
  status: string;
  comment: string | null;
  createdAt: string;
}

export interface KraPace {
  remaining: number;
  remainingDays: number;
  pacePerDay: number;
  neededPerRemainingDay: number;
  onTrack: boolean;
}

/** Enriched goal returned by /api/kra/my. */
export interface MyGoal {
  id: string;
  metricId: string | null;
  title: string;
  dimension: string | null;
  unit: string;
  target: number;
  dailyTarget: number | null;
  current: number;
  remaining: number;
  overflow: number;
  verifiedValue: number | null;
  achievementPercentage: number;
  weight: number;
  dataSource: string | null;
  ratePerUnit: number | null;
  earned: number;
  status: string;
  locked: boolean;
  pace: KraPace;
  logs: KraLog[];
  proofs: KraProof[];
  verifications: KraGoalVerification[];
}

export interface KraMetric {
  id: string;
  key: string;
  name: string;
  unit: string;
  direction: string;
  dataSource: string | null;
  sourceType: string | null;
  aggregation: string | null;
  department: string | null;
  isActive: boolean;
}

export interface KraTemplateItem {
  id?: string;
  metricId: string;
  defaultTarget: number;
  weight: number;
  periodType: string;
  dimension?: string;
  minThreshold?: number | null;
  dailyTarget?: number | null;
  ratePerUnit?: number | null;
  metric?: KraMetric;
}

export interface KraTemplate {
  id: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  designationId: string | null;
  isActive: boolean;
  items: KraTemplateItem[];
}
