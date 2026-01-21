import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import crypto from 'crypto';

// Encryption key - In production, use environment variable
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt function
function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// Decrypt function
function decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// GET /api/settings/configurations - Get all configurations
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(req.url);
            const category = searchParams.get('category');
            const showValues = searchParams.get('showValues') === 'true';

            const where: any = {};

            // Super admin can see all, admin sees only their company's
            if (user.role !== 'SUPER_ADMIN') {
                where.companyId = user.companyId;
            } else if (searchParams.get('companyId')) {
                where.companyId = searchParams.get('companyId');
            }

            if (category) {
                where.category = category;
            }

            const configurations = await prisma.appConfiguration.findMany({
                where,
                orderBy: [
                    { category: 'asc' },
                    { key: 'asc' }
                ]
            });

            // Decrypt values if requested and mask sensitive data
            const result = configurations.map(config => ({
                ...config,
                value: showValues ? decrypt(config.value) : '••••••••',
                maskedValue: config.value.substring(0, 8) + '••••'
            }));

            return NextResponse.json(result);
        } catch (error) {
            console.error('Get Configurations Error:', error);
            return createErrorResponse(error);
        }
    }
);

// POST /api/settings/configurations - Create or update configuration
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user: any) => {
        try {
            const body = await req.json();
            const { category, key, value, description, isActive, companyId } = body;

            if (!category || !key || !value) {
                return createErrorResponse('Category, key, and value are required', 400);
            }

            // Determine company ID
            let targetCompanyId = companyId;
            if (user.role !== 'SUPER_ADMIN') {
                targetCompanyId = user.companyId; // Admin can only manage their company
            }

            // Encrypt the value
            const encryptedValue = encrypt(value);

            // Upsert configuration
            const configuration = await prisma.appConfiguration.upsert({
                where: {
                    companyId_category_key: {
                        companyId: targetCompanyId || null,
                        category,
                        key
                    }
                },
                update: {
                    value: encryptedValue,
                    description,
                    isActive: isActive !== undefined ? isActive : true,
                    createdBy: user.id
                },
                create: {
                    companyId: targetCompanyId,
                    category,
                    key,
                    value: encryptedValue,
                    description,
                    isActive: isActive !== undefined ? isActive : true,
                    createdBy: user.id
                }
            });

            return NextResponse.json({
                ...configuration,
                value: '••••••••' // Don't return decrypted value
            });
        } catch (error) {
            console.error('Create/Update Configuration Error:', error);
            return createErrorResponse(error);
        }
    }
);

// DELETE /api/settings/configurations - Delete configuration
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user: any) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return createErrorResponse('Configuration ID is required', 400);
            }

            // Check if user has permission
            const config = await prisma.appConfiguration.findUnique({
                where: { id }
            });

            if (!config) {
                return createErrorResponse('Configuration not found', 404);
            }

            if (user.role !== 'SUPER_ADMIN' && config.companyId !== user.companyId) {
                return createErrorResponse('Unauthorized', 403);
            }

            await prisma.appConfiguration.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Delete Configuration Error:', error);
            return createErrorResponse(error);
        }
    }
);

// Helper function to get decrypted configuration value (for internal use)
async function getConfigValue(category: string, key: string, companyId?: string): Promise<string | null> {
    try {
        const config = await prisma.appConfiguration.findFirst({
            where: {
                category,
                key,
                companyId: companyId || null,
                isActive: true
            }
        });

        if (!config) return null;
        return decrypt(config.value);
    } catch (error) {
        console.error('Get Config Value Error:', error);
        return null;
    }
}
