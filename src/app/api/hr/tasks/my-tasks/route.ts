import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getISTDateRangeForPeriod, normalizePeriod } from '@/lib/date-utils';

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
                OR: [
                    { employeeIds: { array_contains: employee.id } },
                    { employeeId: employee.id }, // Individual assignment
                    {
                        AND: [
                            { employeeId: null },
                            { employeeIds: { equals: Prisma.DbNull } },
                            {
                                OR: [
                                    { designationId: employee.designationId },
                                    { designationIds: { array_contains: employee.designationId } }
                                ]
                                    }
                                ]
                            },
                            {
                                AND: [
                                    { employeeId: null },
                            { designationId: null },
                            { designationIds: { equals: Prisma.DbNull } },
                            {
                                OR: [
                                    { departmentId: userDeptId },
                                    { departmentIds: { array_contains: userDeptId } }
                                        ]
                                    }
                                ]
                            },
                            {
                                AND: [
                            { employeeId: null },
                            { employeeIds: { equals: Prisma.DbNull } },
                            { designationId: null },
                            { designationIds: { equals: Prisma.DbNull } },
                            { departmentId: null },
                                    { departmentIds: { equals: Prisma.DbNull } }
                                ]
                            } // Global tasks
                        ]
                    }
                ]
            },
            orderBy: { title: 'asc' }
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching my tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
