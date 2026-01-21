/**
 * Production Logger
 * Structured logging for production environments
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
    [key: string]: any;
}

class Logger {
    private level: LogLevel;
    private isDevelopment: boolean;

    constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
        return levels.indexOf(level) <= levels.indexOf(this.level);
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();

        if (this.isDevelopment) {
            // Pretty print for development
            return {
                timestamp,
                level,
                message,
                ...context
            };
        }

        // JSON format for production (easier to parse by log aggregators)
        return JSON.stringify({
            timestamp,
            level,
            message,
            environment: process.env.NODE_ENV,
            ...context
        });
    }

    error(message: string, error?: Error | unknown, context?: LogContext) {
        if (!this.shouldLog('error')) return;

        const errorContext = {
            ...context,
            ...(error instanceof Error && {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            })
        };

        const formatted = this.formatMessage('error', message, errorContext);
        console.error(formatted);
    }

    warn(message: string, context?: LogContext) {
        if (!this.shouldLog('warn')) return;
        const formatted = this.formatMessage('warn', message, context);
        console.warn(formatted);
    }

    info(message: string, context?: LogContext) {
        if (!this.shouldLog('info')) return;
        const formatted = this.formatMessage('info', message, context);
        console.info(formatted);
    }

    debug(message: string, context?: LogContext) {
        if (!this.shouldLog('debug')) return;
        const formatted = this.formatMessage('debug', message, context);
        console.debug(formatted);
    }

    // Specialized logging methods
    apiRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
        this.info('API Request', {
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
            query: query.substring(0, 100), // Truncate long queries
            duration,
            ...context
        });
    }

    security(event: string, context?: LogContext) {
        this.warn('Security Event', {
            type: 'security',
            event,
            ...context
        });
    }
}

// Export singleton instance
export const logger = new Logger();

// Export helper for API route logging
export function logApiRoute(
    method: string,
    path: string,
    handler: () => Promise<Response>
): Promise<Response> {
    const startTime = Date.now();

    return handler()
        .then(response => {
            const duration = Date.now() - startTime;
            logger.apiRequest(method, path, response.status, duration);
            return response;
        })
        .catch(error => {
            const duration = Date.now() - startTime;
            logger.error(`API Error: ${method} ${path}`, error, { duration });
            throw error;
        });
}
