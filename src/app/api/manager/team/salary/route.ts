/**
 * Unified Salary & Increments API
 * 
 * Cross-company salary information and increment management for managers.
 * Allows managers to view salary structures and propose increments for team members.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getManagerTeamUserIds, verifyTeamMemberAccess } from '@/lib/team-auth';
import { getUnifiedSalaries } from '@/lib/team-service';

/**
 * GET /api/manager/team/salary
 * 
 * Get unified salary information across all team members
 * 
 * Query params:
 * - userId (optional): Filter by specific team member
 * - companyId (optional): Filter by company
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const userId = searchParams.get('userId') || undefined;
            const companyId = searchParams.get('companyId') || undefined;

            // Use reusable service to fetch salaries
            const salaries = await getUnifiedSalaries(user.id, {
                userId,
                companyId
            });

            return NextResponse.json({ salaries });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/**
 * POST /api/manager/team/salary/propose-increment
 * 
 * Propose a salary increment for a team member
 * 
 * Body:
 * - userId: The team member's user ID
 * - companyId: The company context
 * - incrementPercentage: Percentage increase
 * - effectiveDate: When the increment should take effect
 * - justification: Reason for the increment
 */
export const POST = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { userId, companyId, incrementPercentage, effectiveDate, justification } = body;

            if (!userId || !companyId || !incrementPercentage || !effectiveDate) {
                return createErrorResponse('userId, companyId, incrementPercentage, and effectiveDate are required', 400);
            }

            // Verify manager has access to this team member
            const hasAccess = await verifyTeamMemberAccess(user.id, userId, companyId);
            if (!hasAccess) {
                return createErrorResponse('Forbidden: User not in your team', 403);
            }

            // Get employee profile
            const employeeProfile = await prisma.employeeProfile.findUnique({
                where: { userId: userId },
                select: {
                    id: true,
                    baseSalary: true,
                    fixedSalary: true,
                    salaryFixed: true,
                    user: {
                        select: {
                            companyId: true
                        }
                    }
                }
            });

            if (!employeeProfile) {
                return createErrorResponse('Employee profile not found', 404);
            }

            // Verify company context
            if (employeeProfile.user.companyId !== companyId) {
                return createErrorResponse('Company context mismatch', 400);
            }

            // Calculate new salary
            const currentSalary = employeeProfile.baseSalary || employeeProfile.fixedSalary || employeeProfile.salaryFixed || 0;
            const incrementAmount = currentSalary * (incrementPercentage / 100);
            const newSalary = currentSalary + incrementAmount;

            // Create increment record
            const incrementRecord = await prisma.salaryIncrementRecord.create({
                data: {
                    employeeProfileId: employeeProfile.id,
                    oldSalary: currentSalary,
                    newSalary: newSalary,
                    oldFixed: currentSalary,
                    newFixed: newSalary,
                    incrementAmount: incrementAmount,
                    percentage: incrementPercentage,
                    effectiveDate: new Date(effectiveDate),
                    status: 'PENDING' // Requires approval from higher authority
                }
            });

            // Get employee profile to get company info
            const updatedProfile = await prisma.employeeProfile.findUnique({
                where: { id: employeeProfile.id },
                include: {
                    user: {
                        include: {
                            company: true
                        }
                    }
                }
            });

            // Transform response
            const transformed = {
                ...incrementRecord,
                companyId: updatedProfile?.user.companyId || '',
                companyName: updatedProfile?.user.company?.name || 'Unknown'
            };

            return NextResponse.json(transformed, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
