import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user, { params }: any) => {
        try {
            const { id } = await params;

            const targetUser = await prisma.user.findUnique({
                where: { id },
                include: {
                    customerProfile: true,
                    companies: true,
                    _count: {
                        select: {
                            assignedSubscriptions: true,
                            tasks: true,
                            auditLogs: true
                        }
                    }
                }
            });

            if (!targetUser) return createErrorResponse('User not found', 404);

            // Access control logic
            if (user.role !== 'SUPER_ADMIN') {
                if (user.role === 'ADMIN' && targetUser.companyId !== user.companyId) {
                    return createErrorResponse('Forbidden', 403);
                }
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role) && targetUser.managerId !== user.id && targetUser.id !== user.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            }

            const { password, ...safeUser } = targetUser;
            return NextResponse.json(safeUser);
        } catch (error: any) {
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user, { params }: any) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const { role, isActive, password, companyId, companyIds, email } = body;

            const existingUser = await prisma.user.findUnique({ where: { id } });
            if (!existingUser) return createErrorResponse('User not found', 404);

            // Access control
            if (user.role !== 'SUPER_ADMIN') {
                if (user.role === 'ADMIN' && existingUser.companyId !== user.companyId) {
                    return createErrorResponse('Forbidden', 403);
                }
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role) && id !== user.id) {
                    return createErrorResponse('Forbidden', 403);
                }
            }

            const updateData: any = {};
            if (role) updateData.role = role;
            if (isActive !== undefined) updateData.isActive = isActive;
            if (email && user.role === 'SUPER_ADMIN') updateData.email = email;
            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }
            if (companyId !== undefined && user.role === 'SUPER_ADMIN') {
                updateData.companyId = companyId;
                // If companyId is being changed, we should also update the EmployeeProfile
                // to reset company-specific fields like designationId
                if (companyId !== existingUser.companyId) {
                    await prisma.employeeProfile.updateMany({
                        where: { userId: id },
                        data: {
                            designationId: null,
                            designation: null
                        }
                    });
                }
            }

            if (companyIds !== undefined && user.role === 'SUPER_ADMIN') {
                updateData.companies = {
                    set: companyIds.map((cid: string) => ({ id: cid }))
                };
            }

            const updatedUser = await prisma.user.update({
                where: { id },
                data: updateData
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'update',
                    entity: 'user',
                    entityId: updatedUser.id,
                    changes: body
                }
            });

            const { password: _, ...safeUser } = updatedUser;
            return NextResponse.json(safeUser);
        } catch (error: any) {
            console.error('Update User Error:', error);
            if (error.code === 'P2002') {
                return createErrorResponse('Email already in use', 400);
            }
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user, { params }: any) => {
        try {
            const { id } = await params;

            if (user.id === id) {
                return createErrorResponse('Cannot delete yourself', 400);
            }

            const existingUser = await prisma.user.findUnique({ where: { id } });
            if (!existingUser) return createErrorResponse('User not found', 404);

            if (user.role !== 'SUPER_ADMIN') {
                if (user.role === 'ADMIN' && existingUser.companyId !== user.companyId) {
                    return createErrorResponse('Forbidden', 403);
                }
            }

            await prisma.user.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'User deleted successfully' });
        } catch (error: any) {
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
