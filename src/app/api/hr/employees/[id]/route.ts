import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

import { verifyTeamMemberAccess } from '@/lib/team-auth';

export const GET = authorizedRoute(
    [], // Open to all authenticated users — handler enforces role-based access internally
    async (req: NextRequest, user) => {
        try {
            const url = new URL(req.url);
            const id = url.pathname.split('/').pop();

            if (!id) {
                return createErrorResponse('Employee ID is required', 400);
            }

            let employee: any = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [
                        { id },
                        { userId: id }
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                            isActive: true,
                            name: true,
                            managerId: true,
                            companyId: true,
                            allowedModules: true,
                            departmentId: true,
                            department: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            },
                            companies: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        } as any
                    },
                    salaryStructure: true,
                    incrementHistory: {
                        orderBy: { date: 'desc' }
                    },
                    hrComments: {
                        orderBy: { createdAt: 'desc' },
                        include: {
                            author: { select: { email: true, name: true } }
                        }
                    },
                    workReports: {
                        orderBy: { date: 'desc' },
                        take: 50
                    },
                    attendance: {
                        orderBy: { date: 'desc' },
                        take: 180
                    },
                    documents: true,
                    designatRef: true,
                    leaveRequests: {
                        orderBy: {
                            startDate: 'desc'
                        }
                    },
                    goals: {
                        orderBy: { endDate: 'desc' },
                        include: { kpi: true }
                    },
                    kpis: true,
                    companyDesignations: {
                        include: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                    employeeIdPrefix: true
                                }
                            }
                        },
                        orderBy: [
                            { isPrimary: 'desc' },
                            { assignedAt: 'desc' }
                        ]
                    }
                }
            });

            // If no profile found, try auto-creating a stub for a valid user
            if (!employee) {
                // Check if a User with this ID exists
                const targetUser = await prisma.user.findUnique({ where: { id } });
                if (!targetUser) {
                    return createErrorResponse('Employee not found', 404);
                }

                // Auto-create a minimal EmployeeProfile so the page can render
                await prisma.employeeProfile.upsert({
                    where: { userId: targetUser.id },
                    create: { userId: targetUser.id },
                    update: {}
                });

                // Re-fetch with full includes
                employee = await prisma.employeeProfile.findUnique({
                    where: { userId: targetUser.id },
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                role: true,
                                isActive: true,
                                name: true,
                                managerId: true,
                                companyId: true,
                                allowedModules: true,
                                departmentId: true,
                                department: { select: { id: true, name: true } },
                                companies: { select: { id: true, name: true } }
                            } as any
                        },
                        salaryStructure: true,
                        incrementHistory: { orderBy: { date: 'desc' } },
                        hrComments: {
                            orderBy: { createdAt: 'desc' },
                            include: { author: { select: { email: true, name: true } } }
                        },
                        workReports: { orderBy: { date: 'desc' }, take: 50 },
                        attendance: { orderBy: { date: 'desc' }, take: 30 },
                        documents: true,
                        designatRef: true,
                        leaveRequests: { orderBy: { startDate: 'desc' } },
                        goals: { orderBy: { endDate: 'desc' }, include: { kpi: true } },
                        kpis: true,
                        companyDesignations: {
                            include: {
                                company: {
                                    select: { id: true, name: true, employeeIdPrefix: true }
                                }
                            },
                            orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'desc' }]
                        }
                    }
                });
            }

            if (!employee) {
                return createErrorResponse('Employee not found', 404);
            }

            // Access Control
            const empAny = employee as any;
            const isSelf = empAny.user.id === user.id;
            const isPrivileged = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'FINANCE', 'FINANCE_ADMIN'].includes(user.role);
            const isManagerRole = ['MANAGER', 'TEAM_LEADER'].includes(user.role);

            if (isPrivileged) {
                // Full access — no restriction
            } else if (isManagerRole) {
                // Can only view their own team members (+ themselves) — checks hierarchy + TeamMember assignments
                const hasAccess = await verifyTeamMemberAccess(user.id, empAny.user.id);
                if (!isSelf && !hasAccess) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            } else {
                // All other roles (EXECUTIVE, etc.) — can only view their own profile
                if (!isSelf) {
                    return createErrorResponse('Forbidden: You can only view your own profile', 403);
                }
            }

            // RBAC: Mask Salary Data for non-privileged roles
            if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'FINANCE_ADMIN'].includes(user.role)) {
                delete empAny.salaryStructure;
                delete empAny.baseSalary;
                delete empAny.salaryFixed;
                delete empAny.salaryVariable;
                delete empAny.salaryIncentive;
                delete empAny.incrementHistory;
            }

            return NextResponse.json(empAny);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
