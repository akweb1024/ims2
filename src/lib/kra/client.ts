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
export const DATA_SOURCES = ['MANUAL', 'SYSTEM', 'HYBRID'] as const;
export const AGGREGATIONS = ['SUM', 'COUNT', 'AVG'] as const;

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
  minThreshold?: number | null;
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
