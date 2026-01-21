import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const asset = await prisma.iTAsset.findUnique({
            where: { id: id },
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

        // Basic company check
        if (asset.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(asset);
    } catch (error) {
        console.error('Fetch Asset Error:', error);
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
        const existingAsset = await prisma.iTAsset.findUnique({ where: { id: id } });

        if (!existingAsset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        if (existingAsset.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedAsset = await prisma.iTAsset.update({
            where: { id: id },
            data: {
                name: body.name,
                type: body.type,
                serialNumber: body.serialNumber,
                status: body.status,
                value: body.value ? parseFloat(body.value) : undefined,
                assignedToId: body.assignedToId || null,
                details: body.details,
                purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
                warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
            }
        });

        return NextResponse.json(updatedAsset);
    } catch (error) {
        console.error('Update Asset Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const existingAsset = await prisma.iTAsset.findUnique({ where: { id: id } });
        if (!existingAsset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

        if (existingAsset.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.iTAsset.delete({ where: { id: id } });

        return NextResponse.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Delete Asset Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
