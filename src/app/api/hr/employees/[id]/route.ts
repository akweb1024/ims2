import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const url = new URL(req.url);
            const id = url.pathname.split('/').pop();

            if (!id) {
                return createErrorResponse('Employee ID is required', 400);
            }

            const employee = await prisma.employeeProfile.findFirst({
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
                        take: 30
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

            if (!employee) {
                return createErrorResponse('Employee not found', 404);
            }

            // Access Control: Manager/TL can only view their own team
            const empAny = employee as any;
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(empAny.user.id)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // RBAC: Mask Salary Data for Managers & others
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
