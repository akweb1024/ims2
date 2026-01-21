/**
 * Security Headers Middleware
 * Adds production-grade security headers to all responses
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function securityHeaders(request: NextRequest) {
    const response = NextResponse.next();

    // Content Security Policy
    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https: http:;
        font-src 'self' data: https://fonts.gstatic.com;
        connect-src 'self' https://api.razorpay.com wss: ws:;
        frame-src 'self' https://api.razorpay.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    // Security Headers
    const headers = {
        // Prevent clickjacking
        'X-Frame-Options': 'DENY',

        // Prevent MIME type sniffing
        'X-Content-Type-Options': 'nosniff',

        // Enable XSS protection
        'X-XSS-Protection': '1; mode=block',

        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',

        // Content Security Policy
        'Content-Security-Policy': cspHeader,

        // Permissions Policy (formerly Feature Policy)
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',

        // Strict Transport Security (HSTS) - only in production with HTTPS
        ...(process.env.NODE_ENV === 'production' && {
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        }),

        // Remove X-Powered-By header (already done in next.config.js)
        'X-Powered-By': '',
    };

    // Apply headers
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}
