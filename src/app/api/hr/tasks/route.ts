import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    if (!user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const designationId = searchParams.get('designationId');

    const whereClause: any = {
        isActive: true,
        companyId: user.companyId,
    };

    // For non-admin roles, we force the filter to their own department/designation if not provided
    const isRestrictedRole = !['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'FINANCE_ADMIN'].includes(user.role);

    // Fetch full user if needed for department filtering
    let userDeptId = null;
    if (isRestrictedRole) {
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { departmentId: true }
        });
        userDeptId = fullUser?.departmentId;
    }

    // Effective filters
    const effDeptId = isRestrictedRole ? (userDeptId || departmentId) : departmentId;

    if ((effDeptId && effDeptId !== 'ALL') || (designationId && designationId !== 'ALL')) {
        const conditions: any[] = [];

        // Department Filter
        if (effDeptId && effDeptId !== 'ALL') {
            conditions.push({
                OR: [
                    { departmentId: effDeptId },
                    { departmentIds: { array_contains: effDeptId } },
                    { AND: [{ departmentId: null }, { departmentIds: { equals: null } }] }
                ]
            });
        }

        // Designation Filter
        if (designationId && designationId !== 'ALL') {
            conditions.push({
                OR: [
                    { designationId: designationId },
                    { designationIds: { array_contains: designationId } },
                    { AND: [{ designationId: null }, { designationIds: { equals: null } }] }
                ]
            });
        }

        if (conditions.length > 0) {
            whereClause.AND = conditions;
        }
    } else if (isRestrictedRole && userDeptId) {
        // Force filter for restricted roles even if params are missing
        whereClause.AND = [
            {
                OR: [
                    { departmentId: userDeptId },
                    { departmentIds: { array_contains: userDeptId } },
                    { AND: [{ departmentId: null }, { departmentIds: { equals: null } }] }
                ]
            }
        ];
    }

    const tasks = await prisma.employeeTaskTemplate.findMany({
        where: whereClause,
        include: {
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tasks);
});

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'], async (req: NextRequest, user) => {
    if (!user.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
        title, description, points,
        departmentId, designationId,
        departmentIds, designationIds,
        calculationType, minThreshold, maxThreshold, pointsPerUnit
    } = body;

    const task = await prisma.employeeTaskTemplate.create({
        data: {
            title,
            description,
            points: Number(points),
            departmentId: departmentId === 'ALL' ? null : departmentId,
            designationId: designationId === 'ALL' ? null : designationId,
            departmentIds: (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? departmentIds : null) as any,
            designationIds: (designationIds && Array.isArray(designationIds) && designationIds.length > 0 ? designationIds : null) as any,
            companyId: user.companyId,
            calculationType: calculationType as any,
            minThreshold: minThreshold ? Number(minThreshold) : null,
            maxThreshold: maxThreshold ? Number(maxThreshold) : null,
            pointsPerUnit: pointsPerUnit ? Number(pointsPerUnit) : null
        }
    });

    return NextResponse.json(task);
});

export const PUT = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'], async (req: NextRequest, user) => {
    const body = await req.json();
    const {
        id, title, description, points, isActive,
        departmentId, designationId,
        departmentIds, designationIds,
        calculationType, minThreshold, maxThreshold, pointsPerUnit
    } = body;

    const task = await prisma.employeeTaskTemplate.update({
        where: { id },
        data: {
            title,
            description,
            points: Number(points),
            isActive,
            departmentId: departmentId === 'ALL' ? null : departmentId,
            designationId: designationId === 'ALL' ? null : designationId,
            departmentIds: (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0 ? departmentIds : null) as any,
            designationIds: (designationIds && Array.isArray(designationIds) && designationIds.length > 0 ? designationIds : null) as any,
            calculationType: calculationType as any,
            minThreshold: minThreshold ? Number(minThreshold) : null,
            maxThreshold: maxThreshold ? Number(maxThreshold) : null,
            pointsPerUnit: pointsPerUnit ? Number(pointsPerUnit) : null
        }
    });

    return NextResponse.json(task);
});

export const DELETE = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'], async (req: NextRequest, user) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.employeeTaskTemplate.delete({
        where: { id }
    });

    return NextResponse.json({ success: true });
});
