import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

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

        // Blank out the actual keys on GET for security. We will just show if it's "Active" or has a value.
        const safeIntegrations = (integrations as any[]).map((i: any) => ({
            id: i.id,
            provider: i.provider,
            isActive: i.isActive,
            isSet: !!i.key,
            updatedAt: i.updatedAt,
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

        // Upsert the integration key securely
        const integration = await (prisma as any).companyIntegration.upsert({
            where: {
                companyId_provider: {
                    companyId,
                    provider: provider.toUpperCase()
                }
            },
            update: {
                ...(key ? { key } : {}), // only update key if strictly provided 
                value,
                isActive: isActive ?? true
            },
            create: {
                companyId,
                provider: provider.toUpperCase(),
                key: key || '',
                value,
                isActive: isActive ?? true
            }
        });

        // Send back a safe version without the raw key
        return NextResponse.json({
            id: integration.id,
            provider: integration.provider,
            isActive: integration.isActive,
            isSet: !!integration.key,
            updatedAt: integration.updatedAt
        });

    } catch (error: any) {
        console.error('Update Integration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
