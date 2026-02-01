import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

/**
 * Standard error response format
 */
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    details?: any;
}

/**
 * Custom error classes
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(400, message, details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(401, message);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions') {
        super(403, message);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(404, `${resource} not found`);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(409, message);
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(429, message);
        this.name = 'RateLimitError';
    }
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, path?: string): NextResponse<ErrorResponse> {
    console.error('API Error:', error);

    // Handle custom app errors
    if (error instanceof AppError) {
        return NextResponse.json(
            {
                error: error.name,
                message: error.message,
                statusCode: error.statusCode,
                timestamp: new Date().toISOString(),
                path,
                details: error.details,
            },
            { status: error.statusCode }
        );
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error, path);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return NextResponse.json(
            {
                error: 'ValidationError',
                message: 'Invalid data provided',
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path,
            },
            { status: 400 }
        );
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        const zodError = error as any;
        return NextResponse.json(
            {
                error: 'ValidationError',
                message: 'Validation failed',
                statusCode: 400,
                timestamp: new Date().toISOString(),
                path,
                details: zodError.errors,
            },
            { status: 400 }
        );
    }

    // Handle generic errors
    if (error instanceof Error) {
        // Don't expose internal error details in production
        const isProduction = process.env.NODE_ENV === 'production';

        return NextResponse.json(
            {
                error: 'InternalServerError',
                message: isProduction ? 'An unexpected error occurred' : error.message,
                statusCode: 500,
                timestamp: new Date().toISOString(),
                path,
                details: isProduction ? undefined : { stack: error.stack },
            },
            { status: 500 }
        );
    }

    // Unknown error type
    return NextResponse.json(
        {
            error: 'UnknownError',
            message: 'An unknown error occurred',
            statusCode: 500,
            timestamp: new Date().toISOString(),
            path,
        },
        { status: 500 }
    );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    path?: string
): NextResponse<ErrorResponse> {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const target = (error.meta?.target as string[]) || [];
            return NextResponse.json(
                {
                    error: 'ConflictError',
                    message: `A record with this ${target.join(', ')} already exists`,
                    statusCode: 409,
                    timestamp: new Date().toISOString(),
                    path,
                },
                { status: 409 }
            );

        case 'P2025':
            // Record not found
            return NextResponse.json(
                {
                    error: 'NotFoundError',
                    message: 'Record not found',
                    statusCode: 404,
                    timestamp: new Date().toISOString(),
                    path,
                },
                { status: 404 }
            );

        case 'P2003':
            // Foreign key constraint violation
            return NextResponse.json(
                {
                    error: 'ValidationError',
                    message: 'Invalid reference to related record',
                    statusCode: 400,
                    timestamp: new Date().toISOString(),
                    path,
                },
                { status: 400 }
            );

        default:
            return NextResponse.json(
                {
                    error: 'DatabaseError',
                    message: 'A database error occurred',
                    statusCode: 500,
                    timestamp: new Date().toISOString(),
                    path,
                    details: process.env.NODE_ENV === 'production' ? undefined : { code: error.code },
                },
                { status: 500 }
            );
    }
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler<T extends any[], R>(
    handler: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        try {
            return await handler(...args);
        } catch (error) {
            throw error; // Let Next.js error boundary handle it
        }
    };
}
