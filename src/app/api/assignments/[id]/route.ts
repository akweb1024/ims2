import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/assignments/[id] - Get assignment details
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id },
                include: {
                    article: {
                        include: {
                            journal: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            },
                            authors: true
                        }
                    },
                    reviewer: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    assignedByUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    report: true
                }
            });

            if (!assignment) {
                return createErrorResponse('Assignment not found', 404);
            }

            // Check permissions: reviewer can only see their own assignments
            const isReviewer = assignment.reviewer.userId === user.id;
            const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isReviewer && !isAdmin) {
                return createErrorResponse('Forbidden', 403);
            }

            return NextResponse.json(assignment);
        } catch (error) {
            console.error('Assignment GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

// PATCH /api/assignments/[id] - Update assignment
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const { status, dueDate, priority, notes } = body;

            const updateData: any = {};

            if (status) updateData.status = status;
            if (dueDate) updateData.dueDate = new Date(dueDate);
            if (priority) updateData.priority = priority;
            if (notes !== undefined) updateData.notes = notes;

            const assignment = await prisma.reviewAssignment.update({
                where: { id },
                data: updateData,
                include: {
                    reviewer: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            });

            return NextResponse.json(assignment);
        } catch (error) {
            console.error('Assignment PATCH Error:', error);
            return createErrorResponse(error);
        }
    }
);

// DELETE /api/assignments/[id] - Remove assignment
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            // Check if report has been submitted
            const assignment = await prisma.reviewAssignment.findUnique({
                where: { id },
                include: { report: true }
            });

            if (!assignment) {
                return createErrorResponse('Assignment not found', 404);
            }

            if (assignment.report) {
                return createErrorResponse('Cannot delete assignment with submitted report', 400);
            }

            await prisma.reviewAssignment.delete({
                where: { id }
            });

            // Decrement reviewer's total reviews count
            await prisma.journalReviewer.update({
                where: { id: assignment.reviewerId },
                data: {
                    totalReviews: {
                        decrement: 1
                    }
                }
            });

            return NextResponse.json({ success: true, message: 'Assignment removed successfully' });
        } catch (error) {
            console.error('Assignment DELETE Error:', error);
            return createErrorResponse(error);
        }
    }
);
