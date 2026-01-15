import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, TokenPayload } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const DEFAULT_SERVICES = [
    { name: 'Google Meet Link Generation', description: 'Generating a new meeting link for internal/external sessions', price: 200, unit: 'each', estimatedDays: 1 },
    { name: 'Recording Share', description: 'Sharing of recorded session via cloud/drive', price: 600, unit: 'each', estimatedDays: 1 },
    { name: 'Payment Link', description: 'Generation and sharing of financial payment links', price: 100, unit: 'each', estimatedDays: 1 },
    { name: 'Issue Create in Journals', description: 'Creating and configuring new issues in journal publications', price: 200, unit: 'each', estimatedDays: 2 },
    { name: 'New Page', description: 'Creating and configuring a new webpage or module', price: 1000, unit: 'page', estimatedDays: 3 },
    { name: 'Data Entry', description: 'Manual entry of data records into the system (Price per 5 items)', price: 1, unit: '5 items', estimatedDays: 2 },
    { name: 'Correction after Acceptance', description: 'Re-working or correcting a task that was already accepted', price: 500, unit: 'each', estimatedDays: 2 },
    { name: 'Recording Download', description: 'Requesting a downloadable copy of a recorded session', price: 50, unit: 'recording', estimatedDays: 1 },
    { name: 'Retraining', description: 'Staff retraining or system walkthrough sessions', price: 400, unit: 'hour', estimatedDays: 3 },
    { name: 'SEO', description: 'Search Engine Optimization for specific pages', price: 100, unit: 'page', estimatedDays: 5 },
];

// GET /api/it/services - List available IT services
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        let services = await prisma.iTServiceDefinition.findMany({
            where: { companyId, isActive: true },
            orderBy: { name: 'asc' }
        });

        // Initialize defaults if none exist
        if (services.length === 0) {
            await prisma.iTServiceDefinition.createMany({
                data: DEFAULT_SERVICES.map(s => ({
                    ...s,
                    companyId,
                    category: 'GENERAL'
                }))
            });

            services = await prisma.iTServiceDefinition.findMany({
                where: { companyId, isActive: true },
                orderBy: { name: 'asc' }
            });
        }

        return NextResponse.json(services);
    } catch (error) {
        console.error('Fetch IT Services Error:', error);
        return createErrorResponse(error);
    }
}

// POST /api/it/services - Create new IT service
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only IT managers or admins can manage services
        const canManage = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role);
        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const companyId = user.companyId;
        const body = await req.json();
        const { name, description, category, price, unit, estimatedDays } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
        }

        const service = await prisma.iTServiceDefinition.create({
            data: {
                companyId,
                name,
                description,
                category: category || 'GENERAL',
                price: parseFloat(price),
                unit: unit || 'each',
                estimatedDays: estimatedDays ? parseInt(estimatedDays) : null
            }
        });

        return NextResponse.json(service, { status: 201 });
    } catch (error) {
        console.error('Create IT Service Error:', error);
        return createErrorResponse(error);
    }
}
