
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET all goals for an employee or company
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const type = searchParams.get('type'); // MONTHLY, QUARTERLY, etc.
            const status = searchParams.get('status');

            const where: any = {
                companyId: user.companyId || undefined
            };

            // If employee, they can only see their own goals unless they are a manager/admin
            if (user.role === 'EMPLOYEE') {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
                where.employeeId = profile.id;
            } else if (employeeId) {
                where.employeeId = employeeId;
            }

            if (type) where.type = type;
            if (status) where.status = status;

            const goals = await prisma.employeeGoal.findMany({
                where,
                orderBy: { startDate: 'desc' },
                include: {
                    employee: {
                        select: {
                            user: {
                                select: { name: true, email: true }
                            }
                        }
                    },
                    evaluations: {
                        include: {
                            evaluator: {
                                select: { name: true }
                            }
                        }
                    }
                }
            });

            return NextResponse.json(goals);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST create a new goal
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { employeeId, title, description, targetValue, unit, type, startDate, endDate, kra, kpiId } = body;

            if (!employeeId || !title || !targetValue || !type || !startDate || !endDate) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            const goal = await prisma.employeeGoal.create({
                data: {
                    employeeId,
                    companyId: user.companyId || '',
                    title,
                    description,
                    targetValue: parseFloat(targetValue),
                    unit,
                    type,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    kra,
                    kpiId,
                    status: 'IN_PROGRESS'
                }
            });

            logger.info(`Goal created for employee ${employeeId} by ${user.email}`);
            return NextResponse.json(goal);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH update goal progress or status
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, currentValue, status, reviewNotes } = body;

            if (!id) {
                return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
            }

            const existingGoal = await prisma.employeeGoal.findUnique({
                where: { id }
            });

            if (!existingGoal) {
                return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
            }

            // Authorization check
            if (user.role === 'EMPLOYEE') {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile || existingGoal.employeeId !== profile.id) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
                }
                // Employees can only update currentValue
                const updateData: any = {};
                if (currentValue !== undefined) {
                    updateData.currentValue = parseFloat(currentValue);
                    updateData.achievementPercentage = (parseFloat(currentValue) / existingGoal.targetValue) * 100;
                }

                const updated = await prisma.employeeGoal.update({
                    where: { id },
                    data: updateData
                });
                return NextResponse.json(updated);
            }

            // Manager/Admin can update everything
            const updateData: any = {};
            if (currentValue !== undefined) {
                updateData.currentValue = parseFloat(currentValue);
                updateData.achievementPercentage = (parseFloat(currentValue) / existingGoal.targetValue) * 100;
            }
            if (status) updateData.status = status;
            if (reviewNotes) {
                updateData.reviewNotes = reviewNotes;
                updateData.reviewerId = user.id;
            }

            const updated = await prisma.employeeGoal.update({
                where: { id },
                data: updateData
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE goal
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
            }

            await prisma.employeeGoal.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
