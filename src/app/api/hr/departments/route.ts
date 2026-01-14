import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const queryCompanyId = searchParams.get('companyId');

            const where: any = {};
            if (queryCompanyId) {
                where.companyId = queryCompanyId;
            } else if (user.role !== 'SUPER_ADMIN' && user.companyId) {
                where.companyId = user.companyId;
            }

            const departments = await prisma.department.findMany({
                where,
                include: { company: true },
                orderBy: { name: 'asc' }
            });

            return NextResponse.json(departments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Allow SUPER_ADMIN to specify companyId, otherwise use user's company context
            let companyId = user.companyId;
            if (user.role === 'SUPER_ADMIN' && body.companyId) {
                companyId = body.companyId;
            }

            if (!companyId) return createErrorResponse('No company context. Super Admins must provide companyId.', 400);

            const { name, code, description } = body;

            if (!name) return createErrorResponse('Name is required', 400);

            const department = await prisma.department.create({
                data: {
                    companyId,
                    name,
                    code,
                    description
                }
            });

            return NextResponse.json(department);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, name, code, description } = body;

            if (!id) return createErrorResponse('ID is required', 400);

            const existing = await prisma.department.findUnique({
                where: { id }
            });

            if (!existing) return createErrorResponse('Department not found', 404);

            // Access Control: Must belong to the same company
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return createErrorResponse('Unauthorized', 403);
            }

            const updated = await prisma.department.update({
                where: { id },
                data: {
                    name,
                    code,
                    description
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID is required', 400);

            const existing = await prisma.department.findUnique({
                where: { id }
            });

            if (!existing) return createErrorResponse('Department not found', 404);

            // Access Control
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return createErrorResponse('Unauthorized', 403);
            }

            // Check if there are employees in this department
            const employeesCount = await prisma.user.count({
                where: { departmentId: id }
            });

            if (employeesCount > 0) {
                return createErrorResponse('Cannot delete department with active employees', 400);
            }

            await prisma.department.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
