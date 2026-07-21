/**
 * Pure shaping logic for the per-employee publication workload view
 * (GET /api/staff/publication-workload). Kept free of Prisma/IO so it can be
 * unit-tested directly. The route does the queries and hands plain rows here.
 */

export type ManuscriptStatus =
  | 'SUBMITTED' | 'INITIAL_REVIEW' | 'PLAGIARISM_CHECK' | 'UNDER_REVIEW'
  | 'QUALITY_CHECK' | 'REVISION_REQUIRED' | 'REVISED_SUBMITTED' | 'ACCEPTED'
  | 'COPYRIGHT_CHECK' | 'FORMATTING' | 'GALLEY_PROOF' | 'PUBLISHED'
  | 'REJECTED' | 'WITHDRAWN';

export type LiveStageKey = 'IN_LINE' | 'IN_PROCESS' | 'BOARD_REVIEW' | 'COPY_EDITING' | 'GALLEY';
export type PipelineStageKey = LiveStageKey | 'PUBLISHED_TODAY' | 'REJECTED';
export type StageGroup = 'INTAKE' | 'REVIEW' | 'QUALITY' | 'PRODUCTION' | 'PUBLISHED';
export type DueState = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'NONE';
export type KpiDirection = 'HIGHER_BETTER' | 'LOWER_BETTER';
export type KpiState = 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
export type ReleaseState = 'ON_TIME' | 'AT_RISK' | 'OVERDUE';
export type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

/** Live manuscriptStatus values, folded into the display stages (order matters). */
export const LIVE_STAGE_SOURCES: Record<LiveStageKey, ManuscriptStatus[]> = {
  IN_LINE: ['SUBMITTED', 'INITIAL_REVIEW'],
  IN_PROCESS: ['PLAGIARISM_CHECK', 'UNDER_REVIEW', 'QUALITY_CHECK', 'REVISION_REQUIRED', 'REVISED_SUBMITTED'],
  BOARD_REVIEW: ['ACCEPTED'], // accepted; awaiting board sign-off / production handoff
  COPY_EDITING: ['COPYRIGHT_CHECK', 'FORMATTING'],
  GALLEY: ['GALLEY_PROOF'],
};

const LIVE_STAGE_LABELS: Record<LiveStageKey, string> = {
  IN_LINE: 'In line',
  IN_PROCESS: 'In process',
  BOARD_REVIEW: 'Board review',
  COPY_EDITING: 'Copy-editing',
  GALLEY: 'Galley / binding',
};

/** Every manuscriptStatus that counts as "live" (non-terminal) for the pipeline. */
export const LIVE_STATUSES: ManuscriptStatus[] = Object.values(LIVE_STAGE_SOURCES).flat();

/** manuscriptStatus values that count as "ready to release" for issue completion. */
export const READY_STATUSES: ManuscriptStatus[] = ['GALLEY_PROOF', 'PUBLISHED'];

const STAGE_GROUP: Record<ManuscriptStatus, StageGroup> = {
  SUBMITTED: 'INTAKE', INITIAL_REVIEW: 'INTAKE',
  PLAGIARISM_CHECK: 'QUALITY', QUALITY_CHECK: 'QUALITY', REVISION_REQUIRED: 'QUALITY',
  UNDER_REVIEW: 'REVIEW', REVISED_SUBMITTED: 'REVIEW', ACCEPTED: 'REVIEW',
  COPYRIGHT_CHECK: 'PRODUCTION', FORMATTING: 'PRODUCTION', GALLEY_PROOF: 'PRODUCTION',
  PUBLISHED: 'PUBLISHED', REJECTED: 'REVIEW', WITHDRAWN: 'REVIEW',
};

/** Chip-colour group for a queue item's stage. */
export function stageGroupOf(stage: ManuscriptStatus): StageGroup {
  return STAGE_GROUP[stage] ?? 'REVIEW';
}

/** UTC midnight for `d` — day boundary used for all date comparisons. */
export function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole-day difference of `target` from `now` (negative = in the past). */
export function dayDiff(target: Date | string, now: Date): number {
  const t = startOfUTCDay(new Date(target)).getTime();
  const n = startOfUTCDay(now).getTime();
  return Math.round((t - n) / 86_400_000);
}

export interface DueInfo { dueState: DueState; daysToDue: number | null; }

/** Whole-day difference of the due date from `now` (negative = overdue). */
export function dueInfo(dueDate: Date | string | null | undefined, now: Date): DueInfo {
  if (!dueDate) return { dueState: 'NONE', daysToDue: null };
  const days = dayDiff(dueDate, now);
  if (days < 0) return { dueState: 'OVERDUE', daysToDue: days };
  if (days === 0) return { dueState: 'DUE_TODAY', daysToDue: 0 };
  return { dueState: 'UPCOMING', daysToDue: days };
}

/** Whether a lower value is better, from the unit convention then the metric. */
export function kpiDirection(unit?: string | null, metricDirection?: string | null): KpiDirection {
  const u = (unit ?? '').toUpperCase();
  if (u.endsWith('_MAX') || u.includes('MAX')) return 'LOWER_BETTER';
  const d = (metricDirection ?? '').toUpperCase();
  if (d.includes('LOWER') || d === 'DOWN' || d === 'MIN') return 'LOWER_BETTER';
  return 'HIGHER_BETTER';
}

export function kpiState(current: number, target: number, direction: KpiDirection): KpiState {
  if (target <= 0) return 'ON_TRACK';
  if (direction === 'LOWER_BETTER') {
    if (current <= target) return 'ON_TRACK';
    if (current <= target * 1.2) return 'AT_RISK';
    return 'BEHIND';
  }
  const pct = current / target;
  if (pct >= 1) return 'ON_TRACK';
  if (pct >= 0.8) return 'AT_RISK';
  return 'BEHIND';
}

const PERIODS: Period[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
export function periodFromGoalType(type?: string | null): Period {
  const t = (type ?? '').toUpperCase() as Period;
  return PERIODS.includes(t) ? t : 'MONTHLY';
}

/** kebab slug of a KPI title, used as a stable client key. */
export function slugKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'kpi';
}

// ---- KPI ----------------------------------------------------------------

export interface GoalInput {
  id: string;
  title: string;
  unit: string | null;
  type: string | null;
  targetValue: number;
  currentValue: number;
  achievementPercentage: number;
  metricId: string | null;
  metric?: { direction: string | null } | null;
}

export interface KpiOut {
  key: string; label: string; goalId: string | null; metricId: string | null;
  current: number; target: number; unit: string; period: Period;
  achievementPercentage: number; direction: KpiDirection; state: KpiState;
}

export function toKpi(g: GoalInput): KpiOut {
  const direction = kpiDirection(g.unit, g.metric?.direction);
  return {
    key: slugKey(g.title),
    label: g.title,
    goalId: g.id,
    metricId: g.metricId,
    current: g.currentValue,
    target: g.targetValue,
    unit: g.unit ?? '',
    period: periodFromGoalType(g.type),
    achievementPercentage: g.achievementPercentage,
    direction,
    state: kpiState(g.currentValue, g.targetValue, direction),
  };
}

// ---- Work queue ---------------------------------------------------------

export interface AssignmentInput {
  id: string;
  stage: ManuscriptStatus;
  status: string;
  dueDate: Date | string | null;
  assignedAt: Date | string;
  article: {
    id: string;
    title: string;
    manuscriptId: string | null;
    journalId: string;
    journal: { id: string; name: string; domainId: string | null; domain: { name: string } | null };
  };
}

export interface QueueItem {
  assignmentId: string; articleId: string; manuscriptId: string | null; title: string;
  stage: ManuscriptStatus; stageGroup: StageGroup; status: string;
  dueDate: string | null; dueState: DueState; daysToDue: number | null; assignedAt: string;
}
export interface QueueJournal { journalId: string; journalName: string; items: QueueItem[]; }
export interface QueueDomain { domainId: string | null; domain: string; journals: QueueJournal[]; }

const normStatus = (s: string): QueueItem['status'] => {
  const v = (s || '').toUpperCase();
  return v === 'IN_PROGRESS' || v === 'COMPLETED' || v === 'BLOCKED' ? v : 'PENDING';
};

/** Group open assignments Journal.domain → Journal, preserving input order
 * (callers pass them already sorted by dueDate, so the most urgent lead). */
export function groupQueue(assignments: AssignmentInput[], now: Date): QueueDomain[] {
  const domains: QueueDomain[] = [];
  const domainIndex = new Map<string, QueueDomain>();
  const journalIndex = new Map<string, QueueJournal>();

  for (const a of assignments) {
    const j = a.article.journal;
    const domainName = j.domain?.name ?? 'Unassigned';
    const domainKey = j.domainId ?? '__unassigned__';

    let domain = domainIndex.get(domainKey);
    if (!domain) {
      domain = { domainId: j.domainId, domain: domainName, journals: [] };
      domainIndex.set(domainKey, domain);
      domains.push(domain);
    }
    let journal = journalIndex.get(j.id);
    if (!journal) {
      journal = { journalId: j.id, journalName: j.name, items: [] };
      journalIndex.set(j.id, journal);
      domain.journals.push(journal);
    }
    const { dueState, daysToDue } = dueInfo(a.dueDate, now);
    journal.items.push({
      assignmentId: a.id,
      articleId: a.article.id,
      manuscriptId: a.article.manuscriptId,
      title: a.article.title,
      stage: a.stage,
      stageGroup: stageGroupOf(a.stage),
      status: normStatus(a.status),
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString() : null,
      dueState,
      daysToDue,
      assignedAt: new Date(a.assignedAt).toISOString(),
    });
  }
  return domains;
}

export interface Summary { openAssignments: number; overdue: number; dueToday: number; }
export function summarize(assignments: AssignmentInput[], now: Date): Summary {
  let overdue = 0, dueToday = 0;
  for (const a of assignments) {
    const { dueState } = dueInfo(a.dueDate, now);
    if (dueState === 'OVERDUE') overdue++;
    else if (dueState === 'DUE_TODAY') dueToday++;
  }
  return { openAssignments: assignments.length, overdue, dueToday };
}

// ---- Pipeline -----------------------------------------------------------

export interface PipelineStage { key: PipelineStageKey; label: string; count: number; sources: ManuscriptStatus[]; }
export interface Pipeline { totalLive: number; asOf: string; stages: PipelineStage[]; }

/** Fold live status counts into the display stages and append today's terminal
 * transitions (published / rejected), which come from status history. */
export function buildPipeline(
  liveCounts: Partial<Record<ManuscriptStatus, number>>,
  publishedToday: number,
  rejectedToday: number,
  asOfISO: string,
): Pipeline {
  const stages: PipelineStage[] = [];
  let totalLive = 0;
  for (const key of Object.keys(LIVE_STAGE_SOURCES) as LiveStageKey[]) {
    const sources = LIVE_STAGE_SOURCES[key];
    const count = sources.reduce((sum, s) => sum + (liveCounts[s] ?? 0), 0);
    totalLive += count;
    stages.push({ key, label: LIVE_STAGE_LABELS[key], count, sources });
  }
  stages.push({ key: 'PUBLISHED_TODAY', label: 'Published today', count: publishedToday, sources: ['PUBLISHED'] });
  stages.push({ key: 'REJECTED', label: 'Rejected', count: rejectedToday, sources: ['REJECTED'] });
  return { totalLive, asOf: asOfISO, stages };
}

// ---- Releases -----------------------------------------------------------

/** An issue this many days out (or fewer) that isn't production-ready is at risk. */
export const RELEASE_AT_RISK_WINDOW_DAYS = 7;
/** Completion (%) at or above which an issue counts as production-ready. */
export const RELEASE_READY_THRESHOLD = 80;

export interface IssueInput {
  id: string;
  issueNumber: number;
  month: string | null;
  status: string;
  isComplete: boolean;
  plannedReleaseAt: Date | string | null;
  expectedManuscripts: number;
  volume: { volumeNumber: number; journal: { id: string; name: string; domain: { name: string } | null } };
  articles: { manuscriptStatus: ManuscriptStatus | null }[];
}

export interface ReleaseOut {
  issueId: string; journalId: string; journalName: string; domain: string; label: string;
  month: string | null; status: string; expectedManuscripts: number; readyArticles: number;
  completion: number; plannedReleaseAt: string | null; daysToRelease: number | null;
  releaseState: ReleaseState;
}

export function issueCompletion(ready: number, expected: number, isComplete: boolean): number {
  if (isComplete) return 100;
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((ready / expected) * 100));
}

export interface ReleaseRiskInput {
  plannedReleaseAt: Date | string | null;
  completion: number;
  isComplete: boolean;
  status: string;
  now: Date;
}

/**
 * Date-driven release risk. An already-published/complete issue is ON_TIME.
 * Otherwise: past its planned date → OVERDUE; within the risk window and not yet
 * production-ready → AT_RISK; else ON_TIME. With no planned date we can't judge
 * against a schedule, so we degrade to a completion signal.
 */
export function releaseState(args: ReleaseRiskInput): { releaseState: ReleaseState; daysToRelease: number | null } {
  const { plannedReleaseAt, completion, isComplete, status, now } = args;
  const days = plannedReleaseAt != null ? dayDiff(plannedReleaseAt, now) : null;

  if (isComplete || status === 'PUBLISHED') return { releaseState: 'ON_TIME', daysToRelease: days };
  if (days === null) {
    return { releaseState: completion >= RELEASE_READY_THRESHOLD ? 'ON_TIME' : 'AT_RISK', daysToRelease: null };
  }
  if (days < 0) return { releaseState: 'OVERDUE', daysToRelease: days };
  if (days <= RELEASE_AT_RISK_WINDOW_DAYS && completion < RELEASE_READY_THRESHOLD) {
    return { releaseState: 'AT_RISK', daysToRelease: days };
  }
  return { releaseState: 'ON_TIME', daysToRelease: days };
}

export function toRelease(i: IssueInput, now: Date): ReleaseOut {
  const ready = i.articles.filter((a) => a.manuscriptStatus && READY_STATUSES.includes(a.manuscriptStatus)).length;
  const completion = issueCompletion(ready, i.expectedManuscripts, i.isComplete);
  const risk = releaseState({
    plannedReleaseAt: i.plannedReleaseAt,
    completion,
    isComplete: i.isComplete,
    status: i.status,
    now,
  });
  return {
    issueId: i.id,
    journalId: i.volume.journal.id,
    journalName: i.volume.journal.name,
    domain: i.volume.journal.domain?.name ?? 'Unassigned',
    label: `Vol ${i.volume.volumeNumber} · Issue ${i.issueNumber}`,
    month: i.month,
    status: i.status,
    expectedManuscripts: i.expectedManuscripts,
    readyArticles: ready,
    completion,
    plannedReleaseAt: i.plannedReleaseAt ? new Date(i.plannedReleaseAt).toISOString() : null,
    daysToRelease: risk.daysToRelease,
    releaseState: risk.releaseState,
  };
}
