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
            // `own=1` forces the caller's own company even for SUPER_ADMIN. Used by company-
            // scoped actions (e.g. KRA templates/assignment) so the list shows this company's
            // copy of each (shared) department once, and the chosen departmentId is valid here.
            const ownOnly = ['1', 'true'].includes((searchParams.get('own') || '').toLowerCase());

            const where: any = {};
            if (ownOnly && user.companyId) {
                where.companyId = user.companyId;
            } else if (queryCompanyId) {
                where.companyId = queryCompanyId;
            } else if (user.role !== 'SUPER_ADMIN' && user.companyId) {
                where.companyId = user.companyId;
            }

            const departments = await prisma.department.findMany({
                where,
                include: {
                    company: true,
                    headUser: { select: { id: true, name: true, email: true } },
                    parentDepartment: { select: { id: true, name: true } },
                    _count: { select: { users: true, subDepartments: true } }
                },
                orderBy: { name: 'asc' }
            });

            return NextResponse.json(departments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Empty string means "clear this relation"; absent means "leave it alone".
const normalizeRelationId = (value: unknown): string | null | undefined => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return String(value);
};

// The head must exist; non-SUPER_ADMIN callers can only appoint users from
// the department's own company.
const validateHead = async (headUserId: string, companyId: string, callerRole: string) => {
    const head = await prisma.user.findUnique({ where: { id: headUserId }, select: { companyId: true } });
    if (!head) return 'Selected department head does not exist';
    if (callerRole !== 'SUPER_ADMIN' && head.companyId && head.companyId !== companyId) {
        return 'Department head must belong to the same company';
    }
    return null;
};

// The parent must exist in the same company, and must not be the department
// itself or one of its descendants (which would create a cycle).
const validateParent = async (parentDepartmentId: string, companyId: string, selfId?: string) => {
    if (selfId && parentDepartmentId === selfId) return 'A department cannot be its own parent';
    const parent = await prisma.department.findUnique({
        where: { id: parentDepartmentId },
        select: { id: true, companyId: true, parentDepartmentId: true }
    });
    if (!parent) return 'Selected parent department does not exist';
    if (parent.companyId !== companyId) return 'Parent department must belong to the same company';

    if (selfId) {
        let cursor = parent.parentDepartmentId;
        for (let depth = 0; cursor && depth < 50; depth++) {
            if (cursor === selfId) return 'That parent would create a circular hierarchy';
            const next: { parentDepartmentId: string | null } | null = await prisma.department.findUnique({
                where: { id: cursor },
                select: { parentDepartmentId: true }
            });
            cursor = next?.parentDepartmentId ?? null;
        }
    }
    return null;
};

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
            const parentDepartmentId = normalizeRelationId(body.parentDepartmentId) ?? null;
            const headUserId = normalizeRelationId(body.headUserId) ?? null;

            if (!name) return createErrorResponse('Name is required', 400);

            if (headUserId) {
                const headError = await validateHead(headUserId, companyId, user.role);
                if (headError) return createErrorResponse(headError, 400);
            }
            if (parentDepartmentId) {
                const parentError = await validateParent(parentDepartmentId, companyId);
                if (parentError) return createErrorResponse(parentError, 400);
            }

            const department = await prisma.department.create({
                data: {
                    companyId,
                    name,
                    code,
                    description,
                    parentDepartmentId,
                    headUserId
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
            const parentDepartmentId = normalizeRelationId(body.parentDepartmentId);
            const headUserId = normalizeRelationId(body.headUserId);

            if (!id) return createErrorResponse('ID is required', 400);

            const existing = await prisma.department.findUnique({
                where: { id }
            });

            if (!existing) return createErrorResponse('Department not found', 404);

            // Access Control: Must belong to the same company
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return createErrorResponse('Unauthorized', 403);
            }

            if (headUserId) {
                const headError = await validateHead(headUserId, existing.companyId, user.role);
                if (headError) return createErrorResponse(headError, 400);
            }
            if (parentDepartmentId) {
                const parentError = await validateParent(parentDepartmentId, existing.companyId, id);
                if (parentError) return createErrorResponse(parentError, 400);
            }

            const updated = await prisma.department.update({
                where: { id },
                data: {
                    name,
                    code,
                    description,
                    // undefined = not sent = untouched; null = explicit clear
                    parentDepartmentId,
                    headUserId
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
