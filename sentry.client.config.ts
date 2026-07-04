import * as Sentry from '@sentry/nextjs';

// Browser-side error capture. No-ops when NEXT_PUBLIC_SENTRY_DSN is unset.
// Errors only: tracing and session replay stay off to keep the client
// bundle lean and quota usage minimal.
Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
    // Stale-deploy chunk errors are expected churn (handled by error.tsx
    // with a refresh prompt), not actionable bugs.
    ignoreErrors: [
        'ChunkLoadError',
        /Loading chunk [\d]+ failed/,
        'Failed to fetch dynamically imported module',
    ],
});
