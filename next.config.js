/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    async rewrites() {
        return [
            {
                source: '/uploads/:path*',
                destination: '/api/files/:path*',
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3000',
            }
        ]
    },
    outputFileTracingRoot: __dirname,
    // Bound build-time memory. With 800+ routes/pages, the "Collecting page data"
    // phase spawns one worker per CPU and each (via NODE_OPTIONS max-old-space-size)
    // may grow to several GB, OOM-killing the build on memory-constrained hosts.
    // A single, memory-aware worker keeps peak RAM bounded (slower, but it fits).
    experimental: {
        workerThreads: false,
        cpus: 1,
        memoryBasedWorkersCount: true,
    },
    // Skip the in-build lint + type-check pass: it is the heaviest phase of `next build`
    // and OOM/255-kills the memory-constrained Coolify (1-CPU) source builder right after
    // "Compiled successfully". Type safety + lint are still enforced separately — the CI
    // "Lint & Type Check" job runs `tsc --noEmit` + `eslint src` — so nothing is lost,
    // only a redundant, resource-heavy pass is removed.
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,
    compress: true,
    poweredByHeader: false,
};

const { withSentryConfig } = require('@sentry/nextjs');

// Sentry wrapping is inert without a DSN at runtime. Source-map upload is
// disabled (no SENTRY_AUTH_TOKEN required; keeps the memory-fragile build
// unchanged) — errors report against minified frames, which is acceptable
// for errors-first monitoring.
module.exports = withSentryConfig(nextConfig, {
    silent: true,
    telemetry: false,
    sourcemaps: { disable: true },
    disableLogger: true,
    automaticVercelMonitors: false,
    widenClientFileUpload: false,
});
