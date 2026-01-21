import NextAuth from "next-auth";
import { authConfig } from "./lib/nextauth/config";
import { securityHeaders } from "./lib/security-headers";
import { rateLimit, authRateLimit } from "./lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

const auth = NextAuth(authConfig).auth;

export default async function middleware(request: NextRequest) {
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

        return finalResponse;
    }

    return secureResponse;
}

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)'],
};
