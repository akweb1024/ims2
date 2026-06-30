import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { name, code, description, headUserId, isActive, parentDepartmentId, departmentType } = body;

        const department = await prisma.department.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code !== undefined && { code }),
                ...(description !== undefined && { description }),
                ...(headUserId !== undefined && { headUserId }),
                ...(isActive !== undefined && { isActive }),
                ...(parentDepartmentId !== undefined && { parentDepartmentId }),
                ...(departmentType !== undefined && { departmentType })
            },
            include: {
                headUser: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        users: true
                    }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'update',
                entity: 'department',
                entityId: id,
                changes: JSON.stringify(body)
            }
        });

        return NextResponse.json(department);
    } catch (error: any) {
        console.error('Update Department Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Check if department has users
        const department = await prisma.department.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        subDepartments: true
                    }
                }
            }
        });

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        if (department._count.users > 0) {
            return NextResponse.json({
                error: 'Cannot delete department with assigned users. Please reassign users first.'
            }, { status: 400 });
        }

        if (department._count.subDepartments > 0) {
            return NextResponse.json({
                error: 'Cannot delete department with sub-departments. Please delete or reassign sub-departments first.'
            }, { status: 400 });
        }

        await prisma.department.delete({
            where: { id }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'delete',
                entity: 'department',
                entityId: id,
                changes: JSON.stringify({ name: department.name })
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Department Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
