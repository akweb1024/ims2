import * as Sentry from '@sentry/nextjs';

// Edge runtime (middleware). No-ops when the DSN is unset.
Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
});
