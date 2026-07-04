import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
        return;
    }

    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    await import('./sentry.server.config');

    const { startRazorpaySyncScheduler } = await import('@/lib/jobs/razorpay-sync-scheduler');
    const { startWorkAgendaScheduler } = await import('@/lib/jobs/work-agenda-scheduler');
    startRazorpaySyncScheduler();
    startWorkAgendaScheduler();
}

// Captures errors from React Server Components, route handlers and
// middleware that Next.js surfaces through the request-error hook.
export const onRequestError = Sentry.captureRequestError;
