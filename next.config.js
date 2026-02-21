/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
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
    experimental: {
        // experimental options
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
