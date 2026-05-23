import { NextResponse } from 'next/server';
import {
    AppError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    handleApiError,
} from '@/lib/error-handler';

// ============================================================================
// createErrorResponse → delegates to the centralized handleApiError
// This adapter ensures backward-compatible routes get enterprise-grade error
// handling (structured pino logging, Zod/Prisma mapping, consistent shape)
// without requiring manual migration of every file.
// ============================================================================
export function createErrorResponse(
    error: unknown,
    status: number = 500
): NextResponse {
    const message = typeof error === 'string'
        ? error
        : error instanceof Error
            ? error.message
            : 'Internal Server Error';

    // Normalize legacy callsites to centralized error handling semantics.
    const normalizedError = (() => {
        if (error instanceof Error && status === 500) {
            return error;
        }

        switch (status) {
            case 400:
                return new ValidationError(message);
            case 401:
                return new AuthenticationError(message);
            case 403:
                return new AuthorizationError(message);
            case 404:
                return new NotFoundError(message);
            case 409:
                return new ConflictError(message);
            case 429:
                return new RateLimitError(message);
            default:
                return new AppError(status, message);
        }
    })();

    return handleApiError(normalizedError);
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
