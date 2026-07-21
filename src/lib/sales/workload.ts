/**
 * Pure shaping logic for the per-employee Sales & Marketing workload view
 * (GET /api/staff/sales-workload). Kept free of Prisma/IO so it is unit-testable.
 *
 * The generic KRA/date helpers (toKpi, dueInfo, dayDiff, startOfUTCDay, …) are
 * reused from the publication workload module — they operate on plain shapes and
 * carry no publication-specific behaviour.
 */
import { dueInfo, dayDiff, type DueState } from '@/lib/publication/workload';

export { toKpi, type GoalInput, type KpiOut } from '@/lib/publication/workload';

// ---- Deal pipeline ------------------------------------------------------

export type DealStage = 'DISCOVERY' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';

export const DEAL_STAGE_ORDER: DealStage[] = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  DISCOVERY: 'Discovery',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed won',
  CLOSED_LOST: 'Closed lost',
};
/** Stages that are still active (not closed) — used for "open deals" counts. */
export const OPEN_DEAL_STAGES: DealStage[] = ['DISCOVERY', 'PROPOSAL', 'NEGOTIATION'];

export interface DealGroupRow { stage: DealStage; count: number; value: number; }
export interface DealStageOut { stage: DealStage; label: string; count: number; value: number; open: boolean; }

/** Fold deal.groupBy(stage) rows into an ordered, labelled pipeline. */
export function buildDealPipeline(rows: DealGroupRow[]): DealStageOut[] {
  const byStage = new Map(rows.map((r) => [r.stage, r]));
  return DEAL_STAGE_ORDER.map((stage) => ({
    stage,
    label: DEAL_STAGE_LABEL[stage],
    count: byStage.get(stage)?.count ?? 0,
    value: byStage.get(stage)?.value ?? 0,
    open: OPEN_DEAL_STAGES.includes(stage),
  }));
}

export interface DealTotals { openCount: number; openValue: number; wonValue: number; }
export function dealTotals(pipeline: DealStageOut[]): DealTotals {
  let openCount = 0, openValue = 0, wonValue = 0;
  for (const s of pipeline) {
    if (s.open) { openCount += s.count; openValue += s.value; }
    if (s.stage === 'CLOSED_WON') wonValue += s.value;
  }
  return { openCount, openValue, wonValue };
}

// ---- Lead funnel --------------------------------------------------------

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';

export const LEAD_STATUS_ORDER: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST'];
const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', PROPOSAL_SENT: 'Proposal sent',
  NEGOTIATION: 'Negotiation', CONVERTED: 'Converted', LOST: 'Lost',
};

export interface LeadGroupRow { leadStatus: LeadStatus | null; count: number; }
export interface LeadStageOut { status: LeadStatus; label: string; count: number; }

export function buildLeadFunnel(rows: LeadGroupRow[]): LeadStageOut[] {
  const byStatus = new Map(rows.filter((r) => r.leadStatus).map((r) => [r.leadStatus as LeadStatus, r.count]));
  return LEAD_STATUS_ORDER.map((status) => ({ status, label: LEAD_STATUS_LABEL[status], count: byStatus.get(status) ?? 0 }));
}

// ---- Follow-up work queue ----------------------------------------------

export interface FollowUpInput {
  id: string;
  type: string;
  channel: string;
  subject: string;
  nextFollowUpDate: Date | string | null;
  customer: { id: string; name: string; leadStatus: string | null } | null;
}

export interface FollowUpOut {
  id: string; customerId: string | null; customerName: string; type: string; channel: string;
  subject: string; leadStatus: string | null; dueDate: string | null; dueState: DueState; daysToDue: number | null;
}

export function toFollowUp(f: FollowUpInput, now: Date): FollowUpOut {
  const { dueState, daysToDue } = dueInfo(f.nextFollowUpDate, now);
  return {
    id: f.id,
    customerId: f.customer?.id ?? null,
    customerName: f.customer?.name ?? 'Unknown',
    type: f.type,
    channel: f.channel,
    subject: f.subject,
    leadStatus: f.customer?.leadStatus ?? null,
    dueDate: f.nextFollowUpDate ? new Date(f.nextFollowUpDate).toISOString() : null,
    dueState,
    daysToDue,
  };
}

export interface FollowUpSummary { openFollowUps: number; overdue: number; dueToday: number; }
export function summarizeFollowUps(items: FollowUpOut[]): FollowUpSummary {
  let overdue = 0, dueToday = 0;
  for (const i of items) {
    if (i.dueState === 'OVERDUE') overdue++;
    else if (i.dueState === 'DUE_TODAY') dueToday++;
  }
  return { openFollowUps: items.length, overdue, dueToday };
}

// ---- Renewals (the "releases" analog) -----------------------------------

export type RenewalState = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';
/** A subscription within this many days of expiry that won't auto-renew is at risk. */
export const RENEWAL_AT_RISK_WINDOW_DAYS = 14;

export interface RenewalInput {
  id: string;
  endDate: Date | string;
  autoRenew: boolean;
  total: number;
  currency: string;
  customer: { id: string; name: string } | null;
}

export interface RenewalOut {
  subscriptionId: string; customerId: string | null; customerName: string; total: number; currency: string;
  endDate: string; daysToRenew: number; autoRenew: boolean; renewalState: RenewalState;
}

export function renewalState(endDate: Date | string, autoRenew: boolean, now: Date): { renewalState: RenewalState; daysToRenew: number } {
  const days = dayDiff(endDate, now);
  if (days < 0) return { renewalState: 'OVERDUE', daysToRenew: days };
  if (days <= RENEWAL_AT_RISK_WINDOW_DAYS && !autoRenew) return { renewalState: 'AT_RISK', daysToRenew: days };
  return { renewalState: 'ON_TRACK', daysToRenew: days };
}

export function toRenewal(s: RenewalInput, now: Date): RenewalOut {
  const r = renewalState(s.endDate, s.autoRenew, now);
  return {
    subscriptionId: s.id,
    customerId: s.customer?.id ?? null,
    customerName: s.customer?.name ?? 'Unknown',
    total: s.total,
    currency: s.currency,
    endDate: new Date(s.endDate).toISOString(),
    daysToRenew: r.daysToRenew,
    autoRenew: s.autoRenew,
    renewalState: r.renewalState,
  };
}
