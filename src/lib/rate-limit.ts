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
        // RATE LIMITING DISABLED PER USER REQUEST
        return NextResponse.next();

        /* 
        // Original logic preserved for potential future re-enablement
        // Skip rate limiting in development mode
        if (process.env.NODE_ENV === 'development') {
            return NextResponse.next();
        }

        // Get client IP
        const ip = getClientIp(request);
        
        // ... (rest of logic commented out)
        */
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
    maxRequests: 300,
    windowMs: 60000 // 300 requests per minute
});

/**
 * Auth endpoint rate limiter (very strict)
 */
export const authRateLimit = rateLimit({
    maxRequests: 30,
    windowMs: 60000 // 30 requests per minute
});

/**
 * Public endpoint rate limiter (more lenient)
 */
export const publicRateLimit = rateLimit({
    maxRequests: 200,
    windowMs: 60000 // 200 requests per minute
});
