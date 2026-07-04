import * as Sentry from '@sentry/nextjs';

// No-ops entirely when SENTRY_DSN is unset — safe to ship before the
// Sentry project exists. Errors-first configuration: no performance
// tracing, no replays, to keep quota usage minimal.
Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    enableLogs: false,
});
