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

    const tasks = await prisma.employeeTaskTemplate.findMany({
        where: {
            companyId: user.companyId,
            isActive: true,
            ...(departmentId && departmentId !== 'ALL' ? { departmentId } : {}),
            ...(designationId && designationId !== 'ALL' ? { designationId } : {})
        },
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
    const { title, description, points, departmentId, designationId, calculationType, minThreshold, maxThreshold, pointsPerUnit } = body;

    const task = await prisma.employeeTaskTemplate.create({
        data: {
            title,
            description,
            points: Number(points),
            departmentId: departmentId === 'ALL' ? null : departmentId,
            designationId: designationId === 'ALL' ? null : designationId,
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
    const { id, title, description, points, isActive, departmentId, designationId, calculationType, minThreshold, maxThreshold, pointsPerUnit } = body;

    const task = await prisma.employeeTaskTemplate.update({
        where: { id },
        data: {
            title,
            description,
            points: Number(points),
            isActive,
            departmentId: departmentId === 'ALL' ? null : departmentId,
            designationId: designationId === 'ALL' ? null : designationId,
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
