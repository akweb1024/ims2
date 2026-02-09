import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/employees/[id]/full-profile
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;

            // Fetch comprehensive employee data
            // We fetch starting from User to get authentication/role details + EmployeeProfile
            const employee = await prisma.user.findUnique({
                where: { id },
                include: {
                    // Organization
                    company: { select: { id: true, name: true, logoUrl: true } },
                    department: { select: { id: true, name: true, code: true } },
                    manager: { select: { id: true, name: true, email: true } },

                    // Profile Relations
                    employeeProfile: {
                        include: {
                            designatRef: true,

                            // History & Records
                            companyDesignations: {
                                orderBy: { assignedAt: 'desc' },
                                include: { company: { select: { name: true } } }
                            },

                            // Financials
                            salaryStructure: true,
                            incrementHistory: {
                                orderBy: { effectiveDate: 'desc' },
                                take: 10
                            },
                            salaryAdvances: {
                                orderBy: { createdAt: 'desc' },
                                include: { emis: true }
                            },
                            revenueClaims: {
                                orderBy: { claimDate: 'desc' },
                                take: 5
                            },

                            // Documents
                            documents: true,
                            digitalDocuments: {
                                orderBy: { createdAt: 'desc' }
                            },

                            // Attendance & Leaves
                            attendance: {
                                orderBy: { date: 'desc' },
                                take: 30 // Last 30 days
                            },
                            leaveRequests: {
                                orderBy: { startDate: 'desc' },
                                take: 10
                            },
                            leaveLedgers: {
                                orderBy: { createdAt: 'desc' },
                                take: 20
                            },

                            // Performance
                            performanceReviews: {
                                orderBy: { date: 'desc' },
                                take: 5,
                                include: { reviewer: { select: { name: true } } }
                            },
                            evaluations: { // PerformanceEvaluation
                                orderBy: { createdAt: 'desc' },
                                take: 5
                            }
                        }
                    },

                    // User Relations
                    assignedAssets: true, // IT Assets
                    ledProjects: { // IT Projects
                        select: { id: true, name: true, status: true },
                        take: 5
                    },
                    assignedITTasks: {
                        orderBy: { createdAt: 'desc' },
                        take: 5,
                        include: { project: { select: { name: true } } }
                    }
                }
            });

            if (!employee) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }

            // Transform/Sanitize if necessary (e.g. remove password hash)
            const { password, ...sanitizedEmployee } = employee;

            return NextResponse.json(sanitizedEmployee);

        } catch (error) {
            logger.error('Error fetching full employee profile:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
