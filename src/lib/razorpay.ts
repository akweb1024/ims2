import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';

/**
 * Get Razorpay credentials for a specific company
 * Falls back to environment variables if company-specific credentials are not found
 */
export async function getRazorpayCredentials(companyId: string) {
    try {
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

        const keyId = configs.find(c => c.key === 'RAZORPAY_KEY_ID')?.value;
        const keySecret = configs.find(c => c.key === 'RAZORPAY_KEY_SECRET')?.value;

        // If company-specific credentials exist, use them
        if (keyId && keySecret) {
            return {
                key_id: keyId,
                key_secret: keySecret,
                source: 'database' as const
            };
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
        console.error('Error fetching Razorpay credentials:', error);
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
 * Legacy instance for backward compatibility (uses env variables)
 * @deprecated Use getRazorpayInstance(companyId) instead
 */
export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
});

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
        console.error(`Error fetching config ${category}:${key}:`, error);
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
        console.error(`Error fetching configs ${category}:`, error);
        return {};
    }
}
