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
    eslint: {
        ignoreDuringBuilds: false,
    },
    typescript: {
        ignoreBuildErrors: false,
    },
    productionBrowserSourceMaps: false,
    compress: true,
    poweredByHeader: false,
};

module.exports = nextConfig;
