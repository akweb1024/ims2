import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getISTDateRangeForPeriod, normalizePeriod } from '@/lib/date-utils';
import { getEmployeeTaskTemplateColumns, hasTaskTemplateColumn } from '@/lib/task-template-columns';

// GET - Fetch tasks assigned to the current user
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get employee record with department from User
        const employee = await prisma.employeeProfile.findUnique({
            where: { userId: user.id },
            include: { 
                designatRef: true,
                user: { select: { departmentId: true } }
            }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        const userDeptId = (employee as any).user?.departmentId;
        const { searchParams } = new URL(req.url);
        const period = normalizePeriod(searchParams.get('period'));
        const { start, end } = getISTDateRangeForPeriod(period);
        const taskColumns = await getEmployeeTaskTemplateColumns();

        const assignmentScopes: Prisma.EmployeeTaskTemplateWhereInput[] = [
            { employeeId: employee.id }
        ];

        if (hasTaskTemplateColumn(taskColumns, 'employeeIds')) {
            assignmentScopes.push({ employeeIds: { array_contains: employee.id } });
        }

        if (employee.designationId) {
            assignmentScopes.push({ designationId: employee.designationId });

            if (hasTaskTemplateColumn(taskColumns, 'designationIds')) {
                assignmentScopes.push({ designationIds: { array_contains: employee.designationId } });
            }
        }

        if (userDeptId) {
            assignmentScopes.push({ departmentId: userDeptId });

            if (hasTaskTemplateColumn(taskColumns, 'departmentIds')) {
                assignmentScopes.push({ departmentIds: { array_contains: userDeptId } });
            }
        }

        const globalTaskConditions: Prisma.EmployeeTaskTemplateWhereInput[] = [
            { employeeId: null },
            { designationId: null },
            { departmentId: null }
        ];

        if (hasTaskTemplateColumn(taskColumns, 'employeeIds')) {
            globalTaskConditions.push({ employeeIds: { equals: Prisma.DbNull } });
        }

        if (hasTaskTemplateColumn(taskColumns, 'designationIds')) {
            globalTaskConditions.push({ designationIds: { equals: Prisma.DbNull } });
        }

        if (hasTaskTemplateColumn(taskColumns, 'departmentIds')) {
            globalTaskConditions.push({ departmentIds: { equals: Prisma.DbNull } });
        }

        assignmentScopes.push({ AND: globalTaskConditions });

        const taskSelect: Prisma.EmployeeTaskTemplateSelect = {
            id: true,
            title: true,
            description: true,
            points: true,
            frequency: true,
            targetValue: true,
            targetUnit: true,
            ...(hasTaskTemplateColumn(taskColumns, 'calculationType') ? { calculationType: true } : {}),
            ...(hasTaskTemplateColumn(taskColumns, 'minThreshold') ? { minThreshold: true } : {}),
            ...(hasTaskTemplateColumn(taskColumns, 'maxThreshold') ? { maxThreshold: true } : {}),
            ...(hasTaskTemplateColumn(taskColumns, 'pointsPerUnit') ? { pointsPerUnit: true } : {})
        };

        // Fetch tasks assigned to this employee (Individual, Designation, or Department based)
        const tasks = await prisma.employeeTaskTemplate.findMany({
            where: {
                companyId: user.companyId!,
                isActive: true,
                ...(period !== 'YEARLY' ? { frequency: period } : {}),
                OR: [
                    { startDate: null },
                    { startDate: { lte: end } }
                ],
                AND: [
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: start } }
                        ]
                    },
                    {
                        OR: assignmentScopes
                    }
                ]
            },
            select: taskSelect,
            orderBy: { title: 'asc' }
        });

        return NextResponse.json(tasks.map((task) => ({
            ...task,
            calculationType: task.calculationType ?? 'FLAT',
            pointsPerUnit: task.pointsPerUnit ?? 1,
            minThreshold: task.minThreshold ?? 1,
            maxThreshold: task.maxThreshold ?? null
        })));
    } catch (error) {
        console.error('Error fetching my tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
