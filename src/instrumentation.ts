/**
 * Next.js instrumentation hook — in-app cron scheduler.
 *
 * The /api/cron/* endpoints (Performance Index + KRA roll-up snapshots,
 * attendance digests, agenda generation, renewals, …) previously relied on an
 * external scheduler that no deployment actually configured, so their data
 * silently went stale. This runner makes the app schedule itself: once per
 * minute it checks the schedule (src/lib/cron/schedule.ts) and calls whatever
 * is due on the local server, authenticated with CRON_SECRET.
 *
 * Enabled only when BOTH are set on the deployment:
 *   ENABLE_INTERNAL_CRON=true
 *   CRON_SECRET=<same secret the cron routes validate>
 *
 * Notes:
 *  - fires at most once per occurrence (minute-keyed), so overlapping ticks
 *    can't double-run a job; occurrences missed while the process was down are
 *    skipped — every endpoint is idempotent and heals on its next run.
 *  - single-replica assumption: with multiple app replicas, enable the flag on
 *    exactly one (or keep using an external scheduler) to avoid duplicate runs
 *    in the same minute.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    if (process.env.ENABLE_INTERNAL_CRON !== 'true') return;

    const secret = process.env.CRON_SECRET;
    if (!secret) {
        console.error('[internal-cron] ENABLE_INTERNAL_CRON=true but CRON_SECRET is not set — scheduler disabled.');
        return;
    }

    const { CRON_JOBS, dueOccurrence } = await import('@/lib/cron/schedule');
    const port = process.env.PORT || '3000';
    const base = `http://127.0.0.1:${port}`;
    const fired = new Map<string, string>(); // job name -> last occurrence key

    console.log(`[internal-cron] scheduler enabled — ${CRON_JOBS.length} jobs, ticking every 60s (IST schedule).`);

    const tick = async () => {
        const now = new Date();
        for (const job of CRON_JOBS) {
            try {
                const occurrence = dueOccurrence(job, now);
                if (!occurrence || fired.get(job.name) === occurrence) continue;
                fired.set(job.name, occurrence);

                const res = await fetch(`${base}${job.path}`, {
                    headers: { authorization: `Bearer ${secret}` },
                    signal: AbortSignal.timeout(10 * 60_000),
                });
                if (res.ok) {
                    console.log(`[internal-cron] ${job.name} ok (${res.status})`);
                } else {
                    console.error(`[internal-cron] ${job.name} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
                }
            } catch (err) {
                console.error(`[internal-cron] ${job.name} error:`, err instanceof Error ? err.message : err);
            }
        }
    };

    // Align ticks to the top of each minute so minute-keyed occurrences match.
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    setTimeout(() => {
        void tick();
        setInterval(() => void tick(), 60_000);
    }, msToNextMinute);
}
