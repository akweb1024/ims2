import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, TokenPayload } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// PATCH /api/it/services/[id] - Update service
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const canManage = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role);
        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const service = await prisma.iTServiceDefinition.findUnique({
            where: { id: id }
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        const companyId = user.companyId;
        if (service.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const updateData: any = {};

        const fields = ['name', 'description', 'category', 'price', 'unit', 'isActive', 'estimatedDays'];
        for (const field of fields) {
            if (body[field] !== undefined) {
                if (field === 'price') {
                    updateData[field] = parseFloat(body[field]);
                } else if (field === 'estimatedDays') {
                    updateData[field] = body[field] ? parseInt(body[field]) : null;
                } else {
                    updateData[field] = body[field];
                }
            }
        }

        const updatedService = await prisma.iTServiceDefinition.update({
            where: { id: id },
            data: updateData
        });

        return NextResponse.json(updatedService);
    } catch (error) {
        console.error('Update IT Service Error:', error);
        return createErrorResponse(error);
    }
}

// DELETE /api/it/services/[id] - Delete (deactivate) service
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const canManage = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(user.role);
        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const service = await prisma.iTServiceDefinition.findUnique({
            where: { id: id }
        });

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
        }

        const companyId = user.companyId;
        if (service.companyId !== companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // We use soft delete by setting isActive to false
        await prisma.iTServiceDefinition.update({
            where: { id: id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Delete IT Service Error:', error);
        return createErrorResponse(error);
    }
}
