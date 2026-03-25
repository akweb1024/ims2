import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/error-handler';

// ============================================================================
// createErrorResponse → delegates to the centralized handleApiError
// This adapter ensures backward-compatible routes get enterprise-grade error
// handling (structured pino logging, Zod/Prisma mapping, consistent shape)
// without requiring manual migration of every file.
// ============================================================================
export function createErrorResponse(
    error: unknown,
    statusOrPath: number | string = 500
): NextResponse {
    if (typeof statusOrPath === 'number') {
        const status = statusOrPath;
        const message =
            typeof error === 'string'
                ? error
                : error instanceof Error
                    ? error.message
                    : 'Internal Server Error';

        return NextResponse.json(
            {
                error: message,
                message,
                statusCode: status,
                timestamp: new Date().toISOString(),
            },
            { status }
        );
    }

    // If called with a numeric status (legacy: createErrorResponse(error, 404))
    // we wrap the error in a form handleApiError understands, or we can just
    // call handleApiError with a synthetic path.
    const path = statusOrPath;
    return handleApiError(error, path);
}

export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
}

export async function fetchJson(url: string, method: string = 'GET', body?: any) {
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'API request failed');
    }
    return res.json();
}
