/**
 * Team Members Management API
 * 
 * Endpoints for managing cross-company team member assignments.
 * Managers can view, add, and remove team members across multiple companies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getTeamMembersWithDetails, getManagerTeamUserIds, verifyTeamMemberAccess } from '@/lib/team-auth';

/**
 * GET /api/manager/team/members
 * 
 * List all team members for the authenticated manager
 * 
 * Query params:
 * - companyId (optional): Filter by specific company
 * - includeInactive (optional): Include inactive team members
 */
export const GET = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || undefined;
            const includeInactive = searchParams.get('includeInactive') === 'true';

            const teamMembers = await getTeamMembersWithDetails(
                user.id,
                companyId,
                includeInactive
            );

            return NextResponse.json({ teamMembers });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/**
 * POST /api/manager/team/members
 * 
 * Add a team member to the manager's team
 * 
 * Body:
 * - userId: The user ID to add
 * - companyId: The company context for this assignment
 * - role (optional): Team role (e.g., "Lead Developer")
 */
export const POST = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { userId, companyId, role } = body;

            if (!userId || !companyId) {
                return createErrorResponse('userId and companyId are required', 400);
            }

            // Verify the user exists and belongs to the specified company
            const targetUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, companyId: true, email: true }
            });

            if (!targetUser) {
                return createErrorResponse('User not found', 404);
            }

            // Verify company context matches
            if (targetUser.companyId !== companyId) {
                return createErrorResponse('User does not belong to the specified company', 400);
            }

            // Check if assignment already exists
            const existing = await prisma.teamMember.findUnique({
                where: {
                    managerId_userId_companyId: {
                        managerId: user.id,
                        userId: userId,
                        companyId: companyId
                    }
                }
            });

            if (existing) {
                // Reactivate if inactive
                if (!existing.isActive) {
                    const updated = await prisma.teamMember.update({
                        where: { id: existing.id },
                        data: {
                            isActive: true,
                            role: role || existing.role
                        }
                    });
                    return NextResponse.json(updated);
                }
                return createErrorResponse('Team member already assigned', 400);
            }

            // Create new team member assignment
            const teamMember = await prisma.teamMember.create({
                data: {
                    managerId: user.id,
                    userId: userId,
                    companyId: companyId,
                    role: role || null,
                    isActive: true
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    company: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            return NextResponse.json(teamMember, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/**
 * DELETE /api/manager/team/members
 * 
 * Remove a team member from the manager's team
 * 
 * Query params:
 * - id: The TeamMember ID to remove
 * OR
 * - userId: The user ID to remove
 * - companyId: The company context
 */
export const DELETE = authorizedRoute(
    ['MANAGER', 'TEAM_LEADER', 'SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');
            const userId = searchParams.get('userId');
            const companyId = searchParams.get('companyId');

            let teamMember;

            if (id) {
                // Find by TeamMember ID
                teamMember = await prisma.teamMember.findUnique({
                    where: { id }
                });
            } else if (userId && companyId) {
                // Find by userId + companyId
                teamMember = await prisma.teamMember.findUnique({
                    where: {
                        managerId_userId_companyId: {
                            managerId: user.id,
                            userId: userId,
                            companyId: companyId
                        }
                    }
                });
            } else {
                return createErrorResponse('Either id or (userId + companyId) is required', 400);
            }

            if (!teamMember) {
                return createErrorResponse('Team member not found', 404);
            }

            // Verify ownership
            if (teamMember.managerId !== user.id) {
                return createErrorResponse('Forbidden: Not your team member', 403);
            }

            // Soft delete by setting isActive to false
            const updated = await prisma.teamMember.update({
                where: { id: teamMember.id },
                data: { isActive: false }
            });

            return NextResponse.json({ message: 'Team member removed', teamMember: updated });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
