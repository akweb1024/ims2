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
        isActive: true, // Show only active tasks by default as per previous logic
    };

    // 1. Resolve Department Name for Global Sharing
    let deptName = null;
    if (departmentId && departmentId !== 'ALL') {
        const dept = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { name: true }
        });
        deptName = dept?.name;
    }

    // 2. Resolve Designation Name
    let desigName = null;
    if (designationId && designationId !== 'ALL') {
        const des = await prisma.designation.findUnique({
            where: { id: designationId },
            select: { name: true }
        });
        desigName = des?.name;
    }

    // 3. Construct Query
    if (deptName) {
        // SHARED MODE: Fetch tasks from ANY company matching the Department Name (or Generic tasks)
        whereClause.OR = [
            { department: { name: { equals: deptName, mode: 'insensitive' } } },
            { departmentId: null }
        ];

        // Apply Designation Filter if present
        if (desigName) {
            whereClause.AND = [
                {
                    OR: [
                        { designation: { name: { equals: desigName, mode: 'insensitive' } } },
                        { designationId: null }
                    ]
                }
            ];
        }
    } else {
        // LOCAL MODE: Fetch all tasks for this company (e.g. Admin View 'All Departments')
        whereClause.companyId = user.companyId;

        // Optional: Local filters if IDs passed but somehow names failed (fallback) or if we add more filters later
        // But logic says: if departmentId is ALL, we show all company tasks.
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
