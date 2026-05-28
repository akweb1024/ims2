export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const { startRazorpaySyncScheduler } = await import('@/lib/jobs/razorpay-sync-scheduler');
    const { startWorkAgendaScheduler } = await import('@/lib/jobs/work-agenda-scheduler');
    startRazorpaySyncScheduler();
    startWorkAgendaScheduler();
}
