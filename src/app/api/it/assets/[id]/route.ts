import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const asset = await prisma.iTAsset.findUnique({
            where: { id },
            include: {
                assignedTo: {
                    select: { id: true, name: true, email: true }
                },
                tickets: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        requester: { select: { name: true } }
                    }
                }
            }
        });

        if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        if (asset.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(asset);
    } catch (error: any) {
        console.error('Fetch Asset Error:', error?.message || error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const existingAsset = await prisma.iTAsset.findUnique({ where: { id } });
        if (!existingAsset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        const userCompanyId = (user as any).companyId;
        if (userCompanyId && existingAsset.companyId !== userCompanyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Sanitize assignedToId: empty string → null
        const assignedToId = body.assignedToId && String(body.assignedToId).trim() !== ''
            ? String(body.assignedToId).trim()
            : null;

        // Validate that assignedToId is a real User ID (not EmployeeProfile ID)
        if (assignedToId) {
            const userExists = await prisma.user.findUnique({
                where: { id: assignedToId },
                select: { id: true }
            });
            if (!userExists) {
                console.error(`[IT Assets] Invalid assignedToId '${assignedToId}': not found in User table. May be an EmployeeProfile.id.`);
                return NextResponse.json({
                    error: 'Invalid assignment: the selected user ID is not valid. Please re-select from the dropdown and try again.'
                }, { status: 400 });
            }
        }

        const updatedAsset = await prisma.iTAsset.update({
            where: { id },
            data: {
                name: body.name,
                type: body.type,
                serialNumber: body.serialNumber || null,
                status: body.status,
                value: body.value ? parseFloat(body.value) : null,
                assignedToId,
                details: body.details || null,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
                warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
            }
        });

        return NextResponse.json(updatedAsset);
    } catch (error: any) {
        console.error('[IT Assets PATCH] Error:', error?.message || error, { code: error?.code, meta: error?.meta });
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const existingAsset = await prisma.iTAsset.findUnique({ where: { id } });
        if (!existingAsset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        const userCompanyId = (user as any).companyId;
        if (userCompanyId && existingAsset.companyId !== userCompanyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.iTAsset.delete({ where: { id } });

        return NextResponse.json({ message: 'Asset deleted successfully' });
    } catch (error: any) {
        console.error('[IT Assets DELETE] Error:', error?.message || error);
        return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
    }
}
