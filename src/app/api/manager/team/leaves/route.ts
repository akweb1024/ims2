/**
 * Unified Leave Requests API
 * 
 * Cross-company leave request viewing and approval for managers.
 * Allows managers to view and approve/reject leave requests for all team members
 * regardless of which company they belong to.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getManagerTeamUserIds, verifyTeamMemberAccess, verifyCompanyContext } from '@/lib/team-auth';
import { getUnifiedLeaveRequests } from '@/lib/team-service';
import { calculateLeaveBalance } from '@/lib/utils/leave-calculator';

/**
 * GET /api/manager/team/leaves
 * 
 * Get unified leave requests view across all team members
 * 
 * Query params:
 * - status (optional): Filter by status (PENDING, APPROVED, REJECTED)
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status') || undefined;
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;

            // Use reusable service to fetch leaves
            const leaves = await getUnifiedLeaveRequests(user.id, {
                status,
                userId,
                companyId
            });

            return NextResponse.json({ leaves });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/**
 * PATCH /api/manager/team/leaves/:id
 * 
 * Approve or reject a leave request
 * 
 * Body:
 * - status: "APPROVED" | "REJECTED"
 * - remarks (optional): Approval/rejection remarks
 */
export const PATCH = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, status, remarks } = body;

            if (!id || !status) {
                return createErrorResponse('id and status are required', 400);
            }

            if (!['APPROVED', 'REJECTED'].includes(status)) {
                return createErrorResponse('status must be APPROVED or REJECTED', 400);
            }

            // Get the leave request
            const existing = await prisma.leaveRequest.findUnique({
                where: { id },
                include: {
                    employee: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            if (!existing) {
                return createErrorResponse('Leave request not found', 404);
            }

            // Verify manager has access to this team member
            const hasAccess = await verifyTeamMemberAccess(user.id, existing.employee.userId);
            if (!hasAccess) {
                return createErrorResponse('Forbidden: Not in your team', 403);
            }

            // Transaction to update status and balance atomically
            const resultLeave = await prisma.$transaction(async (tx) => {
                const updatedLeave = await tx.leaveRequest.update({
                    where: { id },
                    data: {
                        status,
                        approvedById: user.id,
                        ...(remarks && { remarks })
                    },
                    include: {
                        employee: {
                            select: {
                                id: true,
                                userId: true,
                                user: {
                                    select: {
                                        name: true,
                                        email: true,
                                        companyId: true,
                                        company: {
                                            select: {
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                // Logic: If transitioning TO 'APPROVED', deduct balance.
                if (status === 'APPROVED' && existing.status !== 'APPROVED') {
                    // Calculate days
                    const start = new Date(existing.startDate);
                    const end = new Date(existing.endDate);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                    const currentMonth = new Date().getMonth() + 1;
                    const currentYear = new Date().getFullYear();

                    const currentLedger = await tx.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month: currentMonth,
                                year: currentYear
                            }
                        }
                    });

                    const opening = currentLedger?.openingBalance || 0;
                    const autoCredit = currentLedger?.autoCredit || 0;
                    const newTaken = (currentLedger?.takenLeaves || 0) + diffDays;
                    const lateDeds = (currentLedger?.lateDeductions || 0) + (currentLedger?.shortLeaveDeductions || 0);

                    const { displayBalance } = calculateLeaveBalance(opening, autoCredit, newTaken, lateDeds, 0);

                    await tx.leaveLedger.upsert({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month: currentMonth,
                                year: currentYear
                            }
                        },
                        update: {
                            takenLeaves: newTaken
                        },
                        create: {
                            employeeId: existing.employeeId,
                            month: currentMonth,
                            year: currentYear,
                            openingBalance: opening,
                            autoCredit: autoCredit,
                            takenLeaves: newTaken,
                            companyId: existing.employee.user.companyId || ''
                        }
                    });

                    await tx.employeeProfile.update({
                        where: { id: existing.employeeId },
                        data: {
                            currentLeaveBalance: displayBalance,
                            leaveBalance: displayBalance
                        }
                    });
                }

                return updatedLeave;
            });

            // Transform response
            const transformed = {
                ...resultLeave,
                companyId: resultLeave.employee.user.companyId || '',
                companyName: resultLeave.employee.user.company?.name || 'Unknown'
            };

            return NextResponse.json(transformed);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
