/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP address
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

/**
 * Rate limiter middleware
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(config?: RateLimitConfig) {
    const maxRequests = config?.maxRequests || parseInt(process.env.RATE_LIMIT_MAX || '100');
    const windowMs = config?.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

    return (request: NextRequest) => {
        // Skip rate limiting in development mode
        if (process.env.NODE_ENV === 'development') {
            return NextResponse.next();
        }

        // Get client IP
        const ip = getClientIp(request);

        if (!ip) {
            // If we can't get IP, allow the request but log it
            console.warn('Could not determine client IP for rate limiting');
            return NextResponse.next();
        }

        const now = Date.now();
        const rateLimitKey = `ratelimit:${ip}`;

        // Get or create rate limit entry
        let entry = rateLimitStore.get(rateLimitKey);

        // Reset if window has passed
        if (!entry || now > entry.resetTime) {
            entry = {
                count: 0,
                resetTime: now + windowMs
            };
        }

        // Increment request count
        entry.count++;
        rateLimitStore.set(rateLimitKey, entry);

        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance to clean up
            cleanupRateLimitStore();
        }

        // Check if rate limit exceeded
        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

            return NextResponse.json(
                {
                    error: 'Too many requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
                    }
                }
            );
        }

        // Add rate limit headers to response
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
        response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

        return response;
    };
}

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string | null {
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
    maxRequests: 60,
    windowMs: 60000 // 60 requests per minute
});

/**
 * Auth endpoint rate limiter (very strict)
 */
export const authRateLimit = rateLimit({
    maxRequests: 5,
    windowMs: 60000 // 5 requests per minute
});

/**
 * Public endpoint rate limiter (more lenient)
 */
export const publicRateLimit = rateLimit({
    maxRequests: 200,
    windowMs: 60000 // 200 requests per minute
});
