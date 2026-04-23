export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const { startRazorpaySyncScheduler } = await import('@/lib/jobs/razorpay-sync-scheduler');
    startRazorpaySyncScheduler();
}
