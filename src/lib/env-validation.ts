import { z } from 'zod';

/**
 * Environment Variable Validation Schema
 * Validates all required environment variables on application startup
 */
const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url().min(1, 'Database URL is required'),

    // Authentication & Security
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters').optional(),
    NEXTAUTH_URL: z.string().url().optional(),

    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    APP_PORT: z.string().regex(/^\d+$/).transform(Number).optional().default(3000),

    // Web Push (Optional)
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),

    // Payment Gateway (Optional)
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),

    // AWS SES (Optional)
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_SES_FROM_EMAIL: z.string().email().optional(),

    // Redis (Optional)
    REDIS_URL: z.string().url().optional(),

    // Monitoring (Optional)
    SENTRY_DSN: z.string().url().optional(),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().regex(/^\d+$/).transform(Number).optional().default(100),
    RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).optional().default(60000),

    // Prisma
    PRISMA_CLIENT_ENGINE_TYPE: z.enum(['library', 'binary']).default('library'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * Throws error if validation fails
 */
export const env = (() => {
    try {
        const parsed = envSchema.parse(process.env);

        // Additional validation for production
        if (parsed.NODE_ENV === 'production') {
            if (!parsed.AUTH_SECRET) {
                throw new Error('AUTH_SECRET is required in production');
            }
            if (!parsed.NEXTAUTH_URL) {
                throw new Error('NEXTAUTH_URL is required in production');
            }
            if (parsed.JWT_SECRET.length < 64) {
                console.warn('⚠️  WARNING: JWT_SECRET should be at least 64 characters in production');
            }
        }

        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Environment variable validation failed:');
            error.issues.forEach((err: z.ZodIssue) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            throw new Error('Invalid environment variables. Check the errors above.');
        }
        throw error;
    }
})();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';
