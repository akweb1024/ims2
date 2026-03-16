import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';
import { getISTDateRangeForPeriod } from '@/lib/date-utils';

// POST - Mark a task as complete for today
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId, quantity } = await req.json();

        const employee = await prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        // Fetch the task
        const task = await prisma.employeeTaskTemplate.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Validate scaled task
        if (task.calculationType === 'SCALED') {
            if (!quantity || quantity <= 0) {
                return NextResponse.json({ error: 'Quantity is required for scaled tasks' }, { status: 400 });
            }
            if (task.minThreshold && quantity < task.minThreshold) {
                return NextResponse.json({
                    error: `Minimum ${task.minThreshold} units required`
                }, { status: 400 });
            }
        }

        const { start, end } = getISTDateRangeForPeriod(task.frequency as any);

        // Check if already completed in this period
        const existing = await prisma.dailyTaskCompletion.findFirst({
            where: {
                employeeId: employee.id,
                taskId,
                completedAt: {
                    gte: start,
                    lte: end
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Task already completed in this period' }, { status: 400 });
        }

        // Create completion record
        await prisma.dailyTaskCompletion.create({
            data: {
                employeeId: employee.id,
                taskId,
                quantity: task.calculationType === 'SCALED' ? quantity : null,
                completedAt: new Date()
            }
        });

        // Calculate points earned
        let pointsEarned = 0;
        if (task.calculationType === 'SCALED') {
            const effectiveQty = task.maxThreshold && quantity > task.maxThreshold
                ? task.maxThreshold
                : quantity;
            pointsEarned = Math.floor(effectiveQty * (task.pointsPerUnit || 0));
        } else {
            pointsEarned = task.points;
        }

        return NextResponse.json({
            success: true,
            pointsEarned,
            message: 'Task marked as complete'
        });
    } catch (error) {
        console.error('Error marking task complete:', error);
        return NextResponse.json({ error: 'Failed to mark task as complete' }, { status: 500 });
    }
}
