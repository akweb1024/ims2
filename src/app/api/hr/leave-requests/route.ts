import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { calculateLeaveBalance } from '@/lib/utils/leave-calculator';
import { leaveRequestSchema, updateLeaveRequestSchema } from '@/lib/validators/hr';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const showAll = searchParams.get('all') === 'true';



            // ...

            const where: any = {};

            if (employeeId) {
                // Resolve ID to EmployeeProfile ID (handle both User ID and Profile ID)
                let resolvedEmployeeId = employeeId;
                const profile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [
                            { id: employeeId },
                            { userId: employeeId }
                        ]
                    },
                    select: { id: true, userId: true }
                });

                if (profile) {
                    resolvedEmployeeId = profile.id;
                } else {
                    return createErrorResponse('Employee not found', 404);
                }

                // Manager/Team Leader/Admin viewing specific employee
                if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    return createErrorResponse('Forbidden', 403);
                }

                // For Manager/Team Leader, verify target is in hierarchy (cross-company)
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, null); // Cross-company
                    const allowedUserIds = [...subIds, user.id]; // Can see self too

                    if (!allowedUserIds.includes(profile.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }

                where.employeeId = resolvedEmployeeId;
                if (user.companyId) {
                    where.employee = { user: { companyId: user.companyId } };
                }
            } else if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, null); // Cross-company
                    // Usually "All" for a manager means "My Team" (across all companies)
                    where.employee = { userId: { in: subIds } };
                } else {
                    // Admin sees all in company
                    if (user.companyId) {
                        where.employee = { user: { companyId: user.companyId } };
                    }
                }
            } else {
                // Employee viewing own
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            }

            const leaves = await prisma.leaveRequest.findMany({
                where,
                include: {
                    approvedBy: {
                        select: { email: true, name: true }
                    },
                    employee: {
                        include: {
                            user: { select: { email: true, name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return NextResponse.json(leaves);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const result = leaveRequestSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }
            const { startDate, endDate, reason, type } = result.data;

            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });

            if (!profile) {
                return createErrorResponse('Employee profile not found', 404);
            }

            const leave = await prisma.leaveRequest.create({
                data: {
                    employeeId: profile.id,
                    startDate,
                    endDate,
                    reason,
                    type,
                    status: 'PENDING'
                }
            });

            return NextResponse.json(leave);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const result = updateLeaveRequestSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }
            const { leaveId, status } = result.data;

            const existing = await prisma.leaveRequest.findUnique({
                where: { id: leaveId },
                include: { employee: true }
            });

            if (!existing) return createErrorResponse('Leave request not found', 404);

            // Access Control: Manager/TL can only approve/deny their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(existing.employee.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // Transaction to update status and balance atomically
            const resultLeave = await prisma.$transaction(async (tx) => {
                const updatedLeave = await tx.leaveRequest.update({
                    where: { id: leaveId },
                    data: {
                        status,
                        approvedById: user.id
                    }
                });

                // Logic: If transitioning TO 'APPROVED', deduct balance.
                // If transitioning FROM 'APPROVED' to 'REJECTED' (undo), refund balance.

                if (status === 'APPROVED' && existing.status !== 'APPROVED') {
                    // Calculate days
                    const start = new Date(existing.startDate);
                    const end = new Date(existing.endDate);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

                    // Balance will be set precisely by the ledger logic below to ensure synchronization

                    // Update Ledger for the month
                    const month = start.getMonth() + 1;
                    const year = start.getFullYear();

                    const currentLedger = await tx.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month,
                                year
                            }
                        }
                    });

                    const opening = currentLedger?.openingBalance || existing.employee.currentLeaveBalance || 0;
                    const autoCredit = currentLedger?.autoCredit || 0;
                    const newTaken = (currentLedger?.takenLeaves || 0) + diffDays;
                    const lateDeds = (currentLedger?.lateDeductions || 0) + (currentLedger?.shortLeaveDeductions || 0);

                    const { displayBalance } = calculateLeaveBalance(opening, autoCredit, newTaken, lateDeds, 0);

                    await tx.leaveLedger.upsert({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month,
                                year
                            }
                        },
                        update: {
                            takenLeaves: newTaken,
                            closingBalance: displayBalance
                        },
                        create: {
                            employeeId: existing.employeeId,
                            month,
                            year,
                            openingBalance: opening,
                            autoCredit,
                            takenLeaves: newTaken,
                            closingBalance: displayBalance,
                            companyId: user.companyId
                        }
                    });

                    // Update employee profile
                    await tx.employeeProfile.update({
                        where: { id: existing.employeeId },
                        data: {
                            currentLeaveBalance: displayBalance,
                            leaveBalance: displayBalance
                        }
                    });

                } else if (status === 'REJECTED' && existing.status === 'APPROVED') {
                    // Refund
                    const start = new Date(existing.startDate);
                    const diffTime = Math.abs(new Date(existing.endDate).getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                    // Balance will be reset precisely by the ledger logic below

                    const month = start.getMonth() + 1;
                    const year = start.getFullYear();

                    const currentLedger = await tx.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month,
                                year
                            }
                        }
                    });

                    const opening = currentLedger?.openingBalance || existing.employee.currentLeaveBalance || 0;
                    const autoCredit = currentLedger?.autoCredit || 0;
                    const newTaken = Math.max(0, (currentLedger?.takenLeaves || 0) - diffDays);
                    const lateDeds = (currentLedger?.lateDeductions || 0) + (currentLedger?.shortLeaveDeductions || 0);

                    const { displayBalance } = calculateLeaveBalance(opening, autoCredit, newTaken, lateDeds, 0);

                    await tx.leaveLedger.upsert({
                        where: {
                            employeeId_month_year: {
                                employeeId: existing.employeeId,
                                month,
                                year
                            }
                        },
                        update: {
                            takenLeaves: newTaken,
                            closingBalance: displayBalance
                        },
                        create: {
                            employeeId: existing.employeeId,
                            month,
                            year,
                            openingBalance: opening,
                            autoCredit,
                            takenLeaves: newTaken,
                            closingBalance: displayBalance,
                            companyId: user.companyId
                        }
                    });

                    // Update employee profile
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

            return NextResponse.json(resultLeave);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
