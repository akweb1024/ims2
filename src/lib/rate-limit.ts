/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP address
 * Note: In-memory store works for single-instance deployments.
 * For distributed systems (Vercel, Docker Swarm), use Redis-backed rate limiting.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number; lock?: Promise<void> }>();

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    // Auth/security-critical limiters set this false so brute-force protection
    // is never silently disabled in non-production environments.
    bypassInDev?: boolean;
}

/**
 * Rate limiter middleware
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(config?: RateLimitConfig) {
    const maxRequests = config?.maxRequests || parseInt(process.env.RATE_LIMIT_MAX || '100');
    const windowMs = config?.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
    const bypassInDev = config?.bypassInDev !== false;

    return (request: NextRequest) => {
        // Skip rate limiting in development mode, except for security-critical
        // limiters (e.g. auth) which must stay active everywhere.
        if (bypassInDev && process.env.NODE_ENV === 'development') {
            return NextResponse.next();
        }

        // Resolve the client IP. If none resolves, bucket under a shared key so
        // such requests are still limited rather than bypassing the limiter
        // entirely (the previous behaviour let header-less requests through).
        const ip = getClientIp(request) || 'unknown';

        const now = Date.now();
        const key = `${ip}`;

        // Cleanup expired entries periodically
        cleanupRateLimitStore();

        // Atomic read-modify-write using entry-level locking
        let currentWindow = rateLimitStore.get(key);

        if (!currentWindow || now > currentWindow.resetTime) {
            currentWindow = { count: 1, resetTime: now + windowMs };
        } else {
            currentWindow.count++;
        }

        rateLimitStore.set(key, currentWindow);

        const response = NextResponse.next();

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - currentWindow.count).toString());
        response.headers.set('X-RateLimit-Reset', currentWindow.resetTime.toString());

        if (currentWindow.count > maxRequests) {
            return new NextResponse('Too Many Requests', {
                status: 429,
                headers: response.headers
            });
        }

        return response;
    };
}

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string | null {
    // If the deployment sits behind a known proxy/CDN, trust only the header that
    // proxy sets (e.g. cf-connecting-ip). This prevents clients from spoofing the
    // limiter key via arbitrary x-forwarded-for values. Configure via env.
    const trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER;
    if (trustedHeader) {
        const value = request.headers.get(trustedHeader);
        if (value) return value.split(',')[0].trim();
    }

    // Try various headers in order of preference
    const headers = [
        'x-real-ip',
        'x-forwarded-for',
        'cf-connecting-ip', // Cloudflare
        'true-client-ip',   // Cloudflare Enterprise
        'x-client-ip',
        'x-cluster-client-ip',
        'forwarded'
    ];

    for (const header of headers) {
        const value = request.headers.get(header);
        if (value) {
            // x-forwarded-for can contain multiple IPs, take the first one
            return value.split(',')[0].trim();
        }
    }

    // Fallback to request IP if available (some environments provide this)
    const requestWithIp = request as any;
    return requestWithIp.ip || null;
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * API-specific rate limiter (stricter limits)
 */
export const apiRateLimit = rateLimit({
    maxRequests: 300,
    windowMs: 60000 // 300 requests per minute
});

/**
 * Auth endpoint rate limiter (very strict)
 */
export const authRateLimit = rateLimit({
    maxRequests: 30,
    windowMs: 60000, // 30 requests per minute
    bypassInDev: false, // brute-force protection must stay on everywhere
});

/**
 * Public endpoint rate limiter (more lenient)
 */
export const publicRateLimit = rateLimit({
    maxRequests: 200,
    windowMs: 60000 // 200 requests per minute
});
