import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';

// GET - Fetch today's progress for the current user
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const employee = await prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch today's completed tasks
        const completedTasks = await prisma.dailyTaskCompletion.findMany({
            where: {
                employeeId: employee.id,
                completedAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: {
                task: true
            }
        });

        // Calculate total points
        const totalPoints = completedTasks.reduce((sum: number, ct) => {
            if (ct.task.calculationType === 'SCALED') {
                const quantity = ct.quantity || 0;
                const effectiveQty = ct.task.maxThreshold && quantity > ct.task.maxThreshold
                    ? ct.task.maxThreshold
                    : quantity;
                return sum + Math.floor(effectiveQty * (ct.task.pointsPerUnit || 0));
            }
            return sum + ct.task.points;
        }, 0);

        return NextResponse.json({
            completedTasks: completedTasks.map(ct => ({
                taskId: ct.taskId,
                quantity: ct.quantity,
                completedAt: ct.completedAt
            })),
            totalPoints
        });
    } catch (error) {
        console.error('Error fetching today progress:', error);
        return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }
}
