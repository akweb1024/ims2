import NextAuth from "next-auth";
import { authConfig } from "./lib/nextauth/config";
import { securityHeaders } from "./lib/security-headers";
import { rateLimit, authRateLimit } from "./lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const auth = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
    const serverActionId = request.headers.get('next-action');
    const isServerActionRequest = request.method === 'POST' && !!serverActionId;
    const isInvalidServerActionId = !!serverActionId && /^0+$/.test(serverActionId);

    // Guard against stale or malformed Server Action calls that can happen during mixed/stale deploy states.
    if (isInvalidServerActionId) {
        const staleActionResponse = NextResponse.json(
            {
                error: 'StaleClientBuild',
                message: 'Your app version is outdated. Please refresh and try again.',
                statusCode: 409,
            },
            { status: 409 }
        );
        staleActionResponse.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
        staleActionResponse.headers.set('Pragma', 'no-cache');
        staleActionResponse.headers.set('Expires', '0');
        staleActionResponse.headers.set('Vary', 'next-action');
        return staleActionResponse;
    }

    // Apply rate limiting based on path
    let rateLimitResponse: NextResponse | undefined;

    if (request.nextUrl.pathname.startsWith('/api/auth') ||
        request.nextUrl.pathname.startsWith('/login')) {
        // Strict rate limiting for auth endpoints
        rateLimitResponse = authRateLimit(request);
    } else if (request.nextUrl.pathname.startsWith('/api')) {
        // Standard rate limiting for API endpoints
        rateLimitResponse = rateLimit()(request);
    }

    // If rate limit exceeded, return early
    if (rateLimitResponse && rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    // Apply authentication
    const authResponse = await auth(request as any);

    // Apply security headers
    const secureResponse = securityHeaders(request);

    // Merge headers from rate limiting
    if (rateLimitResponse) {
        rateLimitResponse.headers.forEach((value: string, key: string) => {
            secureResponse.headers.set(key, value);
        });
    }

    if (isServerActionRequest) {
        // Server Actions should never be cached across deploys.
        secureResponse.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
        secureResponse.headers.set('Pragma', 'no-cache');
        secureResponse.headers.set('Expires', '0');
        secureResponse.headers.set('Vary', 'next-action');
    }

    // If auth returned a response (redirect, etc), apply security headers to it
    if (authResponse && authResponse instanceof Response) {
        const finalResponse = new NextResponse(authResponse.body, {
            status: authResponse.status,
            statusText: authResponse.statusText,
            headers: authResponse.headers
        });

        // Apply security headers
        secureResponse.headers.forEach((value: string, key: string) => {
            finalResponse.headers.set(key, value);
        });

        if (isServerActionRequest) {
            finalResponse.headers.set('Cache-Control', 'no-store, no-cache, max-age=0, must-revalidate');
            finalResponse.headers.set('Pragma', 'no-cache');
            finalResponse.headers.set('Expires', '0');
            finalResponse.headers.set('Vary', 'next-action');
        }

        return finalResponse;
    }

    return secureResponse;
}

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)'],
};
