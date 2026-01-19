import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import prisma from '@/lib/prisma';

// POST - Unmark a task completion for today
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await req.json();

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

        // Find the completion record
        const completion = await prisma.dailyTaskCompletion.findFirst({
            where: {
                employeeId: employee.id,
                taskId,
                completedAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            include: { task: true }
        });

        if (!completion) {
            return NextResponse.json({ error: 'Task completion not found' }, { status: 404 });
        }

        // Calculate points to deduct
        let pointsDeducted = 0;
        if (completion.task.calculationType === 'SCALED') {
            const quantity = completion.quantity || 0;
            const effectiveQty = completion.task.maxThreshold && quantity > completion.task.maxThreshold
                ? completion.task.maxThreshold
                : quantity;
            pointsDeducted = Math.floor(effectiveQty * (completion.task.pointsPerUnit || 0));
        } else {
            pointsDeducted = completion.task.points;
        }

        // Delete the completion record
        await prisma.dailyTaskCompletion.delete({
            where: { id: completion.id }
        });

        return NextResponse.json({
            success: true,
            pointsDeducted,
            message: 'Task unmarked'
        });
    } catch (error) {
        console.error('Error unmarking task:', error);
        return NextResponse.json({ error: 'Failed to unmark task' }, { status: 500 });
    }
}
