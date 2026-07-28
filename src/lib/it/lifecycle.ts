/**
 * Shared lifecycle model for the IT module.
 *
 * Projects, tasks and support tickets each carry their own status enum, but operationally
 * they answer the same questions: what is running right now, what is coming up, what has
 * landed and what died on the way. Every IT surface maps its own statuses onto these buckets
 * so the Projects grid, the Task Board and the Tickets queue read the same way.
 *
 * Pure module — no React, no Prisma. Safe to import from both client pages and API routes.
 */

export type LifecycleKey =
  | 'RUNNING'
  | 'UPCOMING'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'FAILED'
  | 'ARCHIVED';

/** Display order used by tab bars and grouped sections — active work first. */
export const LIFECYCLE_ORDER: LifecycleKey[] = [
  'RUNNING',
  'UPCOMING',
  'ON_HOLD',
  'COMPLETED',
  'FAILED',
  'ARCHIVED',
];

interface SurfaceStyles {
  text: string;
  bg: string;
  border: string;
}

export interface LifecycleTheme {
  /** Generic label; each surface may override it (a ticket's "upcoming" is a "new" ticket). */
  label: string;
  blurb: string;
  dot: string;
  bar: string;
  glow: string;
  dark: SurfaceStyles;
  light: SurfaceStyles;
}

export const LIFECYCLE_THEME: Record<LifecycleKey, LifecycleTheme> = {
  RUNNING: {
    label: 'Running',
    blurb: 'Work is actively in flight',
    dot: 'bg-blue-400',
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
    dark: { text: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
    light: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  },
  UPCOMING: {
    label: 'Upcoming',
    blurb: 'Planned but not started yet',
    dot: 'bg-violet-400',
    bar: 'bg-violet-500',
    glow: 'shadow-violet-500/20',
    dark: { text: 'text-violet-300', bg: 'bg-violet-500/15', border: 'border-violet-500/30' },
    light: { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
  },
  ON_HOLD: {
    label: 'On Hold',
    blurb: 'Paused — waiting on something',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
    dark: { text: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
    light: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  },
  COMPLETED: {
    label: 'Completed',
    blurb: 'Delivered and signed off',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
    glow: 'shadow-emerald-500/20',
    dark: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
    light: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  },
  FAILED: {
    label: 'Failed',
    blurb: 'Cancelled or abandoned',
    dot: 'bg-rose-400',
    bar: 'bg-rose-500',
    glow: 'shadow-rose-500/20',
    dark: { text: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
    light: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  },
  ARCHIVED: {
    label: 'Archived',
    blurb: 'Closed out and filed away',
    dot: 'bg-slate-400',
    bar: 'bg-slate-500',
    glow: 'shadow-slate-500/20',
    dark: { text: 'text-slate-300', bg: 'bg-slate-500/15', border: 'border-slate-500/30' },
    light: { text: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
  },
};

/* ─── Status → lifecycle mapping, one per surface ─────────────────────────── */

const PROJECT_LIFECYCLE: Record<string, LifecycleKey> = {
  PLANNING: 'UPCOMING',
  IN_PROGRESS: 'RUNNING',
  TESTING: 'RUNNING',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
};

const TASK_LIFECYCLE: Record<string, LifecycleKey> = {
  PENDING: 'UPCOMING',
  IN_PROGRESS: 'RUNNING',
  UNDER_REVIEW: 'RUNNING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'FAILED',
};

const TICKET_LIFECYCLE: Record<string, LifecycleKey> = {
  OPEN: 'UPCOMING',
  IN_PROGRESS: 'RUNNING',
  ON_HOLD: 'ON_HOLD',
  RESOLVED: 'COMPLETED',
  CLOSED: 'ARCHIVED',
};

export function projectLifecycle(status: string): LifecycleKey {
  return PROJECT_LIFECYCLE[status] ?? 'UPCOMING';
}
export function taskLifecycle(status: string): LifecycleKey {
  return TASK_LIFECYCLE[status] ?? 'UPCOMING';
}
export function ticketLifecycle(status: string): LifecycleKey {
  return TICKET_LIFECYCLE[status] ?? 'UPCOMING';
}

/* ─── Per-surface wording ─────────────────────────────────────────────────── */

export const PROJECT_LIFECYCLE_LABELS: Partial<Record<LifecycleKey, string>> = {
  RUNNING: 'Running',
  UPCOMING: 'Upcoming',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  ARCHIVED: 'Archived',
};

export const TASK_LIFECYCLE_LABELS: Partial<Record<LifecycleKey, string>> = {
  RUNNING: 'Running',
  UPCOMING: 'Not Started',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const TICKET_LIFECYCLE_LABELS: Partial<Record<LifecycleKey, string>> = {
  RUNNING: 'Being Worked',
  UPCOMING: 'New',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Resolved',
  ARCHIVED: 'Closed',
};

/** The lifecycle buckets each surface actually uses, in display order. */
export const PROJECT_LIFECYCLES: LifecycleKey[] = [
  'RUNNING', 'UPCOMING', 'ON_HOLD', 'COMPLETED', 'FAILED', 'ARCHIVED',
];
export const TASK_LIFECYCLES: LifecycleKey[] = ['RUNNING', 'UPCOMING', 'COMPLETED', 'FAILED'];
export const TICKET_LIFECYCLES: LifecycleKey[] = [
  'RUNNING', 'UPCOMING', 'ON_HOLD', 'COMPLETED', 'ARCHIVED',
];

export function lifecycleLabel(
  key: LifecycleKey,
  overrides?: Partial<Record<LifecycleKey, string>>,
): string {
  return overrides?.[key] ?? LIFECYCLE_THEME[key].label;
}

/* ─── "Has it actually started?" ──────────────────────────────────────────── */

export type StartTone = 'idle' | 'scheduled' | 'live' | 'late' | 'done' | 'stopped';

export interface StartState {
  tone: StartTone;
  /** Short pill text, e.g. "Day 12", "Starts in 3d", "Overdue 4d". */
  label: string;
  /** Longer line for tooltips / secondary text. */
  detail: string;
  /** Whether the item has actually kicked off (vs. merely being scheduled). */
  started: boolean;
}

const DAY_MS = 86_400_000;

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function atMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function dayDiff(to: Date, from: Date): number {
  return Math.round((atMidnight(to) - atMidnight(from)) / DAY_MS);
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

interface StartInput {
  lifecycle: LifecycleKey;
  /** Planned kickoff for projects/tasks; the raised date for tickets. */
  startDate?: string | Date | null;
  /** Deadline: project endDate, task dueDate, ticket dueAt. */
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
  /**
   * `plan` — the start date is a commitment, so a past start on an unstarted item is late.
   * `queue` — the start date is when the item landed in the queue, so waiting is normal
   * until the SLA due date passes.
   */
  kind?: 'plan' | 'queue';
  now?: Date;
}

/**
 * Turns dates + lifecycle into the one line a card should show about timing: whether work
 * kicked off, how long it has been running, and whether it has blown its deadline.
 */
export function lifecycleStart(input: StartInput): StartState {
  const { lifecycle, kind = 'plan' } = input;
  const now = input.now ?? new Date();
  const start = toDate(input.startDate);
  const due = toDate(input.dueDate);
  const done = toDate(input.completedAt);
  const began = kind === 'queue' ? 'Raised' : 'Started';

  if (lifecycle === 'COMPLETED') {
    const when = done ?? due;
    const ran = start && when ? Math.max(dayDiff(when, start), 0) : null;
    return {
      tone: 'done',
      label: when ? `Delivered ${formatDay(when)}` : 'Delivered',
      detail:
        start && ran !== null
          ? `${began} ${formatDay(start)} · took ${ran === 0 ? 'under a day' : `${ran} day${ran === 1 ? '' : 's'}`}`
          : 'Marked complete',
      started: true,
    };
  }

  if (lifecycle === 'FAILED') {
    return {
      tone: 'stopped',
      label: 'Cancelled',
      detail: start ? `${began} ${formatDay(start)}, never finished` : 'Cancelled before it started',
      started: Boolean(start && dayDiff(now, start) >= 0),
    };
  }

  if (lifecycle === 'ARCHIVED') {
    return {
      tone: 'stopped',
      label: kind === 'queue' ? 'Closed' : 'Archived',
      detail: start ? `${began} ${formatDay(start)}` : 'Filed away',
      started: Boolean(start),
    };
  }

  const overdueBy = due ? dayDiff(now, due) : 0;
  const isOverdue = Boolean(due) && overdueBy > 0;

  if (!start) {
    if (lifecycle === 'RUNNING') {
      return {
        tone: isOverdue ? 'late' : 'live',
        label: isOverdue ? `Overdue ${overdueBy}d` : 'In flight',
        detail: due ? `No ${began.toLowerCase()} date · due ${formatDay(due)}` : `No ${began.toLowerCase()} date recorded`,
        started: true,
      };
    }
    if (lifecycle === 'ON_HOLD') {
      return { tone: 'idle', label: 'Paused', detail: 'No start date recorded', started: false };
    }
    return {
      tone: isOverdue ? 'late' : 'idle',
      label: isOverdue ? `Overdue ${overdueBy}d` : 'Not scheduled',
      detail: due ? `No start date · due ${formatDay(due)}` : 'No start date set',
      started: false,
    };
  }

  const untilStart = dayDiff(start, now);
  const elapsed = Math.max(-untilStart, 0);

  // Work that is already underway outranks a kickoff date that has not arrived — someone
  // simply started ahead of plan, so only the non-running stages report "starts in N".
  if (untilStart > 0 && lifecycle !== 'RUNNING') {
    return {
      tone: 'scheduled',
      label: untilStart === 1 ? 'Starts tomorrow' : `Starts in ${untilStart}d`,
      detail: `Kickoff ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
      started: false,
    };
  }

  if (lifecycle === 'UPCOMING') {
    if (kind === 'queue') {
      return {
        tone: isOverdue ? 'late' : 'idle',
        label: isOverdue
          ? `SLA breached ${overdueBy}d`
          : elapsed === 0
            ? 'Raised today'
            : `Waiting ${elapsed}d`,
        detail: `Raised ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''} · nobody started it yet`,
        started: false,
      };
    }
    // Blowing the deadline without ever starting is the louder fact of the two.
    if (isOverdue) {
      return {
        tone: 'late',
        label: `Overdue ${overdueBy}d`,
        detail: `Never started · planned kickoff ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
        started: false,
      };
    }
    return {
      tone: elapsed > 0 ? 'late' : 'scheduled',
      label: elapsed > 0 ? `Late to start · ${elapsed}d` : 'Starts today',
      detail: `Planned kickoff ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
      started: false,
    };
  }

  if (lifecycle === 'ON_HOLD') {
    return {
      tone: 'idle',
      label: `Paused on day ${elapsed + 1}`,
      detail: `${began} ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
      started: true,
    };
  }

  // RUNNING with a real start date.
  if (isOverdue) {
    return {
      tone: 'late',
      label: `Overdue ${overdueBy}d`,
      detail: `${began} ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
      started: true,
    };
  }
  if (untilStart > 0) {
    return {
      tone: 'live',
      label: 'Started early',
      detail: `Underway ahead of the ${formatDay(start)} kickoff${due ? ` · due ${formatDay(due)}` : ''}`,
      started: true,
    };
  }
  return {
    tone: 'live',
    label: elapsed === 0 ? `${began} today` : `Day ${elapsed + 1}`,
    detail: `${began} ${formatDay(start)}${due ? ` · due ${formatDay(due)}` : ''}`,
    started: true,
  };
}
