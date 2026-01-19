import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';

// GET - Fetch tasks assigned to the current user
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get employee record
        const employee = await prisma.employeeProfile.findUnique({
            where: { userId: user.id },
            include: { designatRef: true }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        // Fetch tasks assigned to this designation
        const tasks = await prisma.employeeTaskTemplate.findMany({
            where: {
                companyId: user.companyId!,
                isActive: true,
                OR: [
                    { designationId: employee.designationId },
                    { designationId: null } // Global tasks
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
