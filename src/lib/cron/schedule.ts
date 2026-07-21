/**
 * In-app cron schedule (pure logic — the runner lives in src/instrumentation.ts).
 *
 * The app's /api/cron/* endpoints were never scheduled anywhere (no vercel.json,
 * no host cron), so everything they compute — Performance Index & KRA roll-ups,
 * attendance digests/snapshots, agenda generation, renewals — silently went
 * stale. This module defines WHEN each endpoint should fire; the instrumentation
 * runner ticks once a minute and calls whatever is due.
 *
 * Times are IST (UTC+05:30, no DST) because the business day is IST-centric
 * (attendance digest slots, agenda generation).
 *
 * Semantics: a job fires at most once per occurrence (minute-resolution). Missed
 * occurrences while the server was down are skipped — every target endpoint is
 * idempotent and self-healing on its next run.
 */

export interface CronJob {
    name: string;
    /** Path + query to call on the local server. */
    path: string;
    /** Fire every N minutes (aligned to minutes-of-day % N == 0). */
    everyMinutes?: number;
    /** Fire once daily at 'HH:mm' IST. */
    dailyAt?: string;
    /** With dailyAt: fire only on this IST day of month (1-31). */
    dayOfMonth?: number;
}

export const IST_OFFSET_MINUTES = 5 * 60 + 30;

export interface IstParts { minutesOfDay: number; dayOfMonth: number; dateKey: string }

/** Wall-clock parts of `now` in IST. */
export function istParts(now: Date): IstParts {
    const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
    return {
        minutesOfDay: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
        dayOfMonth: ist.getUTCDate(),
        dateKey: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
    };
}

export function parseHHMM(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

/**
 * The occurrence key `now` falls on for this job, or null when the job is not
 * due at this minute. Firing at most once per key makes ticks idempotent even
 * if the runner ticks more than once inside the same minute.
 */
export function dueOccurrence(job: CronJob, now: Date): string | null {
    const { minutesOfDay, dayOfMonth, dateKey } = istParts(now);

    if (job.everyMinutes) {
        if (minutesOfDay % job.everyMinutes !== 0) return null;
        return `${job.name}@${dateKey}T${minutesOfDay}`;
    }
    if (job.dailyAt) {
        if (job.dayOfMonth && dayOfMonth !== job.dayOfMonth) return null;
        if (minutesOfDay !== parseHHMM(job.dailyAt)) return null;
        return `${job.name}@${dateKey}`;
    }
    return null;
}

/**
 * The full schedule. Cadence rationale:
 *  - performance-observability: the route itself expects 15m and 60m cadences.
 *  - kra-snapshot: nightly — recomputes every employee's Performance Index and
 *    the team/department/company roll-ups (dashboard freshness).
 *  - kra-rollover: monthly on the 1st, before the snapshot, so carried-forward
 *    goals exist when the first snapshot of the month runs.
 *  - work-agenda: before the workday, after rollover/snapshot windows.
 *  - attendance digests: the four slots hard-coded in the digest route.
 *  - process-renewals: just after midnight, per the route's own comment.
 *  - razorpay-sync / think-tank: hourly / nightly housekeeping (idempotent).
 */
export const CRON_JOBS: CronJob[] = [
    { name: 'observability-15m', path: '/api/cron/performance-observability?cadence=15m', everyMinutes: 15 },
    { name: 'observability-60m', path: '/api/cron/performance-observability?cadence=60m', everyMinutes: 60 },
    { name: 'razorpay-sync', path: '/api/cron/razorpay-sync', everyMinutes: 60 },
    { name: 'process-renewals', path: '/api/cron/process-renewals', dailyAt: '00:15' },
    { name: 'kra-rollover', path: '/api/cron/kra-rollover', dailyAt: '02:30', dayOfMonth: 1 },
    { name: 'kra-snapshot', path: '/api/cron/kra-snapshot?periods=MONTHLY,QUARTERLY', dailyAt: '03:00' },
    { name: 'think-tank-tally', path: '/api/cron/think-tank/tally', dailyAt: '03:30' },
    { name: 'think-tank-reveal', path: '/api/cron/think-tank/reveal', dailyAt: '03:45' },
    { name: 'work-agenda', path: '/api/cron/work-agenda/generate', dailyAt: '06:00' },
    { name: 'digest-0930', path: '/api/cron/attendance-whatsapp-digest?slot=0930', dailyAt: '09:30' },
    { name: 'digest-1100', path: '/api/cron/attendance-whatsapp-digest?slot=1100', dailyAt: '11:00' },
    { name: 'digest-1730', path: '/api/cron/attendance-whatsapp-digest?slot=1730', dailyAt: '17:30' },
    { name: 'digest-1830', path: '/api/cron/attendance-whatsapp-digest?slot=1830', dailyAt: '18:30' },
];
