import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { decryptConfigValueSafe } from '@/lib/config-crypto';
import { PrismaClient } from '@prisma/client';

type RazorpayIntegrationConfig = {
    keyId?: string;
    webhookSecret?: string;
    accountLabel?: string;
};

function parseRazorpayIntegrationValue(raw: string | null | undefined): RazorpayIntegrationConfig {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as RazorpayIntegrationConfig;
    } catch {
        // Backward-compatible fallback: value may be plain keyId
        return { keyId: raw };
    }
    return {};
}

/**
 * Get Razorpay credentials for a specific company
 * Falls back to environment variables if company-specific credentials are not found
 */
export async function getRazorpayCredentials(companyId: string) {
    try {
        const prismaTyped = prisma as PrismaClient;
        // Preferred source: CompanyIntegration provider="RAZORPAY"
        const razorpayIntegration = await prisma.companyIntegration.findUnique({
            where: {
                companyId_provider: {
                    companyId,
                    provider: 'RAZORPAY',
                },
            },
        });

        if (razorpayIntegration?.isActive && razorpayIntegration?.key) {
            const integrationConfig = parseRazorpayIntegrationValue(razorpayIntegration.value);
            const keyId = integrationConfig.keyId;
            if (keyId) {
                return {
                    key_id: keyId,
                    key_secret: razorpayIntegration.key,
                    source: 'integration' as const,
                };
            }
        }

        // Fetch company-specific Razorpay credentials from database
        const configs = await prisma.appConfiguration.findMany({
            where: {
                companyId,
                category: 'PAYMENT_GATEWAY',
                key: {
                    in: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
                },
                isActive: true
            }
        });

        // These are written encrypted by /api/settings/configurations, so they must
        // be decrypted here. Reading .value raw handed the ciphertext to the SDK,
        // which surfaced as an opaque Razorpay auth error rather than a config problem.
        const keyId = decryptConfigValueSafe(configs.find(c => c.key === 'RAZORPAY_KEY_ID')?.value);
        const keySecret = decryptConfigValueSafe(configs.find(c => c.key === 'RAZORPAY_KEY_SECRET')?.value);

        // If company-specific credentials exist, use them
        if (keyId && keySecret) {
            return {
                key_id: keyId,
                key_secret: keySecret,
                source: 'database' as const
            };
        }

        // Configured but undecryptable (e.g. rotated CONFIG_ENCRYPTION_KEY) — say so
        // rather than silently falling through to another company's env credentials.
        if (configs.length > 0 && (!keyId || !keySecret)) {
            logger.warn('Razorpay AppConfiguration present but could not be decrypted; falling back', { companyId });
        }

        // Fallback to environment variables
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            return {
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
                source: 'env' as const
            };
        }

        throw new Error('Razorpay credentials not found for this company');
    } catch (error) {
        logger.error('Error fetching Razorpay credentials', error as Error);
        throw error;
    }
}

/**
 * Create a Razorpay instance for a specific company
 */
export async function getRazorpayInstance(companyId: string): Promise<Razorpay> {
    const credentials = await getRazorpayCredentials(companyId);

    return new Razorpay({
        key_id: credentials.key_id,
        key_secret: credentials.key_secret,
    });
}

/**
 * Resolves which secret to verify an incoming Razorpay webhook against: the target company's
 * own configured secret (CompanyIntegration RAZORPAY value.webhookSecret) if set, else the
 * platform-wide RAZORPAY_WEBHOOK_SECRET env var — preserving today's behavior for companies
 * that haven't configured their own. companyId is a routing hint derived from the (as yet
 * unverified) webhook payload; using it to pick a secret is safe because the actual
 * authenticity check is the signature comparison against that secret, not this lookup.
 */
export async function getRazorpayWebhookSecret(companyId: string | null): Promise<string | null> {
    if (companyId) {
        const integration = await prisma.companyIntegration.findUnique({
            where: { companyId_provider: { companyId, provider: 'RAZORPAY' } },
        });
        if (integration?.isActive) {
            const config = parseRazorpayIntegrationValue(integration.value);
            if (config.webhookSecret) return config.webhookSecret;
        }
    }
    return process.env.RAZORPAY_WEBHOOK_SECRET || null;
}

export async function getRazorpaySyncAccounts() {
    const accountsToSync: Array<{
        key_id: string;
        key_secret: string;
        companyId: string | null;
        alias: string;
        source: 'integration' | 'appConfiguration' | 'env';
    }> = [];

    const integrations = await prisma.companyIntegration.findMany({
        where: {
            provider: 'RAZORPAY',
            isActive: true,
        },
    });

    for (const integration of integrations) {
        const parsedValue = parseRazorpayIntegrationValue(integration.value);
        if (!integration.key || !parsedValue.keyId) continue;
        accountsToSync.push({
            key_id: parsedValue.keyId,
            key_secret: integration.key,
            companyId: integration.companyId,
            alias: `RAZORPAY:${integration.companyId}`,
            source: 'integration',
        });
    }

    // Legacy compatibility: AppConfiguration-based Razorpay credentials
    const allConfigs = await prisma.appConfiguration.findMany({
        where: {
            category: 'PAYMENT_GATEWAY',
            key: { startsWith: 'RAZORPAY_KEY_ID' },
            isActive: true,
        },
    });

    for (const config of allConfigs) {
        const secretKey = config.key.replace('ID', 'SECRET');
        const secretConfig = await prisma.appConfiguration.findFirst({
            where: {
                companyId: config.companyId,
                category: 'PAYMENT_GATEWAY',
                key: secretKey,
                isActive: true,
            },
        });
        if (!secretConfig) continue;

        const alreadyExists = accountsToSync.some(
            (account) => account.companyId === config.companyId && account.key_id === config.value,
        );
        if (alreadyExists) continue;

        accountsToSync.push({
            key_id: config.value,
            key_secret: secretConfig.value,
            companyId: config.companyId,
            alias: config.key,
            source: 'appConfiguration',
        });
    }

    if (accountsToSync.length === 0 && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        accountsToSync.push({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
            companyId: null,
            alias: 'ENV_DEFAULT',
            source: 'env',
        });
    }

    return accountsToSync;
}

/**
 * Legacy instance for backward compatibility (uses env variables)
 * @deprecated Use getRazorpayInstance(companyId) instead
 */
const getLegacyRazorpayCredentials = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for legacy Razorpay usage');
    }

    return { keyId, keySecret };
};

export const razorpay = (() => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
})();

/**
 * Get any configuration value for a company
 */
export async function getCompanyConfig(companyId: string, category: string, key: string): Promise<string | null> {
    try {
        const config = await prisma.appConfiguration.findFirst({
            where: {
                companyId,
                category,
                key,
                isActive: true
            }
        });

        return config?.value || null;
    } catch (error) {
        logger.error(`Error fetching config ${category}:${key}`, error as Error);
        return null;
    }
}

/**
 * Get multiple configuration values for a company
 */
export async function getCompanyConfigs(companyId: string, category: string, keys: string[]): Promise<Record<string, string>> {
    try {
        const configs = await prisma.appConfiguration.findMany({
            where: {
                companyId,
                category,
                key: { in: keys },
                isActive: true
            }
        });

        return configs.reduce((acc, config) => {
            acc[config.key] = config.value;
            return acc;
        }, {} as Record<string, string>);
    } catch (error) {
        logger.error(`Error fetching configs ${category}`, error as Error);
        return {};
    }
}
 
/**
 * Validate Razorpay Payment Signature
 */
import crypto from 'crypto';
 
export function validateSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');
        
    return expectedSignature === signature;
}
 
export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
        
    return expectedSignature === signature;
}
