import pino from 'pino';
import { isDevelopment } from './env-validation';

/**
 * Production-ready Logger using Pino
 * Structured logging for high performance and observability
 */

interface LogContext {
    [key: string]: any;
}

const pinoOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    formatters: {
        level: (label: string) => {
            return { level: label.toUpperCase() };
        },
    },
};

// Create pino instance
const pinoLogger = pino(pinoOptions);

// Wrapper class for better DX and backward compatibility
class Logger {
    error(message: string, error?: Error | unknown, context?: LogContext) {
        pinoLogger.error({
            ...(error instanceof Error && {
                err: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    ...((error as any).details && { details: (error as any).details })
                }
            }),
            ...context
        }, message);
    }

    warn(message: string, context?: LogContext) {
        pinoLogger.warn(context || {}, message);
    }

    info(message: string, context?: LogContext) {
        pinoLogger.info(context || {}, message);
    }

    debug(message: string, context?: LogContext) {
        pinoLogger.debug(context || {}, message);
    }

    // Specialized logging methods
    apiRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
        this.info(`API Request: ${method} ${path}`, {
            type: 'api_request',
            method,
            path,
            statusCode,
            duration,
            ...context
        });
    }

    dbQuery(query: string, duration: number, context?: LogContext) {
        this.debug('Database Query', {
            type: 'db_query',
            query: query.substring(0, 500), // Increased truncation for better debugging
            duration,
            ...context
        });
    }

    security(event: string, context?: LogContext) {
        this.warn(`Security Event: ${event}`, {
            type: 'security',
            event,
            ...context
        });
    }

    // Trace a specific scope
    child(name: string, context?: LogContext) {
        return pinoLogger.child({ module: name, ...context });
    }
}

export const logger = new Logger();

/**
 * Higher-order function for API route logging and telemetry
 */
export async function logApiRoute(
    method: string,
    path: string,
    handler: () => Promise<Response>
): Promise<Response> {
    const startTime = Date.now();
    
    try {
        const response = await handler();
        const duration = Date.now() - startTime;
        
        // Only log non-2xx/3xx as info/warn, others as debug to reduce noise
        if (response.status >= 400) {
            logger.warn(`API Request Failed: ${method} ${path}`, {
                statusCode: response.status,
                duration,
                type: 'api_request'
            });
        } else {
            logger.apiRequest(method, path, response.status, duration);
        }
        
        return response;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Unhandled API Error: ${method} ${path}`, error, { 
            duration,
            type: 'api_error'
        });
        throw error;
    }
}
