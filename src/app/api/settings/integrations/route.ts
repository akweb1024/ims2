import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { SUPPORTED_INTEGRATION_PROVIDER_IDS } from '@/lib/integrations';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        // Allow Super Admin and Admins to manage integrations
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId;
        if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });

        const integrations = await (prisma as any).companyIntegration.findMany({
            where: { companyId },
            orderBy: { provider: 'asc' }
        });

        const integrationIds = integrations.map((integration: any) => integration.id);
        const auditLogs = integrationIds.length > 0
            ? await prisma.auditLog.findMany({
                where: {
                    entity: 'integration',
                    entityId: { in: integrationIds }
                },
                orderBy: { createdAt: 'desc' }
            })
            : [];

        // Blank out the actual keys on GET for security. We will just show if it's "Active" or has a value.
        const safeIntegrations = (integrations as any[]).map((i: any) => ({
            id: i.id,
            provider: i.provider,
            isActive: i.isActive,
            isSet: !!i.key,
            updatedAt: i.updatedAt,
            lastRotatedAt: i.updatedAt,
            lastTestedAt: auditLogs.find((log) => log.entityId === i.id && log.action === 'test')?.createdAt || null,
            lastTestStatus: (() => {
                const latestTest = auditLogs.find((log) => log.entityId === i.id && log.action === 'test');
                if (!latestTest) return null;
                try {
                    const parsed = typeof latestTest.changes === 'string' ? JSON.parse(latestTest.changes) : latestTest.changes;
                    return parsed?.ok ? 'SUCCESS' : 'FAILED';
                } catch {
                    return null;
                }
            })(),
            lastTestMessage: (() => {
                const latestTest = auditLogs.find((log) => log.entityId === i.id && log.action === 'test');
                if (!latestTest) return null;
                try {
                    const parsed = typeof latestTest.changes === 'string' ? JSON.parse(latestTest.changes) : latestTest.changes;
                    return parsed?.message || null;
                } catch {
                    return null;
                }
            })(),
            // Keep value null generally unless editing specific configurations
            value: i.value 
        }));

        return NextResponse.json(safeIntegrations);
    } catch (error: any) {
        console.error('Fetch Integrations error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId;
        if (!companyId) return NextResponse.json({ error: 'Company ID required' }, { status: 400 });

        const body = await req.json();
        const { provider, key, value, isActive } = body;

        if (!provider) {
             return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
        }

        const normalizedProvider = String(provider).toUpperCase();
        if (!SUPPORTED_INTEGRATION_PROVIDER_IDS.includes(normalizedProvider as any)) {
            return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
        }

        // Upsert the integration key securely
        const integration = await (prisma as any).companyIntegration.upsert({
            where: {
                companyId_provider: {
                    companyId,
                    provider: normalizedProvider
                }
            },
            update: {
                ...(key ? { key } : {}), // only update key if strictly provided 
                value,
                isActive: isActive ?? true
            },
            create: {
                companyId,
                provider: normalizedProvider,
                key: key || '',
                value,
                isActive: isActive ?? true
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: key ? 'rotate' : 'update',
                entity: 'integration',
                entityId: integration.id,
                changes: JSON.stringify({
                    provider: integration.provider,
                    hasSecret: Boolean(key),
                    hasValue: value !== undefined,
                    isActive: integration.isActive
                })
            }
        });

        // Send back a safe version without the raw key
        return NextResponse.json({
            id: integration.id,
            provider: integration.provider,
            isActive: integration.isActive,
            isSet: !!integration.key,
            updatedAt: integration.updatedAt,
            lastRotatedAt: integration.updatedAt
        });

    } catch (error: any) {
        console.error('Update Integration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
