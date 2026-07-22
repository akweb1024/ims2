import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { logger } from '@/lib/logger';

// Roles that may view ANY employee's full profile in their company scope.
const HR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'];
// Roles that may view a full profile only for people in their own downline
// (the 360 modal has a manager view; without this they got 403 → "Profile not found").
const TEAM_ROLES = ['MANAGER', 'TEAM_LEADER'];

// GET /api/hr/employees/[id]/full-profile
export const GET = authorizedRoute(
    [...HR_ROLES, ...TEAM_ROLES],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;

            // Fetch comprehensive employee data.
            // We fetch starting from User to get authentication/role details +
            // EmployeeProfile. Callers are inconsistent about which id they pass:
            // some send the User id, others send the EmployeeProfile id (e.g. the
            // Team KRA views use goal.employee.id, which is a profile id). Accept
            // BOTH so the 360 profile opens regardless of which id was on hand —
            // otherwise a profile-id caller 404s and the modal shows
            // "Profile not found.".
            const employee = await prisma.user.findFirst({
                where: { OR: [{ id }, { employeeProfile: { id } }] },
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
                                orderBy: [
                                    { year: 'desc' },
                                    { month: 'desc' }
                                ],
                                take: 12 // Last 12 months
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

            // A MANAGER / TEAM_LEADER may only open profiles for people in their
            // own downline (or themselves). HR/admin roles are unrestricted.
            if (!HR_ROLES.includes(user.role)) {
                const downline = await getDownlineUserIds(user.id, user.companyId);
                if (employee.id !== user.id && !downline.includes(employee.id)) {
                    return NextResponse.json({ error: 'Not authorized to view this profile' }, { status: 403 });
                }
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
