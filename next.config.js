/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    images: {
        domains: ['localhost'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.amazonaws.com',
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
