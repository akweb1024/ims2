/**
 * Authorization utilities for Unified Team Management Module
 * 
 * These functions handle cross-company team member access verification.
 * They check if a manager has permission to view/manage a specific user's data,
 * even when that user belongs to a different company.
 */

import { prisma } from '@/lib/prisma';
import { getDownlineUserIds } from '@/lib/hierarchy';

/**
 * Verify if a manager has access to a specific team member's data
 * 
 * Checks three sources:
 * 1. Direct management chain (User.managerId)
 * 2. Explicit team assignment (TeamMember table)
 * 3. Recursive subordinates via hierarchy (cross-company)
 * 
 * @param managerId - The manager's user ID
 * @param targetUserId - The team member's user ID
 * @param companyId - Optional company context filter
 * @returns true if manager has access, false otherwise
 */
export async function verifyTeamMemberAccess(
    managerId: string,
    targetUserId: string,
    companyId?: string
): Promise<boolean> {
    // Self-access is always allowed
    if (managerId === targetUserId) {
        return true;
    }

    // Option 1: Direct management chain
    const directReport = await prisma.user.findFirst({
        where: {
            id: targetUserId,
            managerId: managerId
        }
    });

    if (directReport) return true;

    // Option 2: Explicit team assignment
    const teamMember = await prisma.teamMember.findFirst({
        where: {
            managerId: managerId,
            userId: targetUserId,
            isActive: true,
            ...(companyId && { companyId })
        }
    });

    if (teamMember) return true;

    // Option 3: Recursive subordinates (cross-company)
    const subordinateIds = await getDownlineUserIds(managerId, null); // null = cross-company

    return subordinateIds.includes(targetUserId);
}

/**
 * Get all user IDs that a manager can access
 * 
 * Combines:
 * 1. Hierarchical subordinates (via getDownlineUserIds)
 * 2. Explicit team assignments (via TeamMember)
 * 
 * @param managerId - The manager's user ID
 * @param companyId - Optional company context filter
 * @returns Array of user IDs the manager can access
 */
export async function getManagerTeamUserIds(
    managerId: string,
    companyId?: string
): Promise<string[]> {
    // Get all subordinates (cross-company)
    const hierarchyIds = await getDownlineUserIds(managerId, null);

    // Get explicit team assignments
    const teamAssignments = await prisma.teamMember.findMany({
        where: {
            managerId,
            isActive: true,
            ...(companyId && { companyId })
        },
        select: { userId: true }
    });

    const teamIds = teamAssignments.map(t => t.userId);

    // Combine and deduplicate (include manager themselves)
    const allIds = [...new Set([managerId, ...hierarchyIds, ...teamIds])];

    return allIds;
}

/**
 * Get team members with full details including company information
 * 
 * @param managerId - The manager's user ID
 * @param companyId - Optional company context filter
 * @param includeInactive - Include inactive team members
 * @returns Array of team members with details
 */
export async function getTeamMembersWithDetails(
    managerId: string,
    companyId?: string,
    includeInactive: boolean = false
) {
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    const users = await prisma.user.findMany({
        where: {
            id: {
                in: allowedUserIds,
                not: managerId
            }, // Filter by allowed IDs AND exclude manager themselves
            ...(companyId && { companyId }),
            ...(includeInactive ? {} : { isActive: true })
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true
                }
            },
            employeeProfile: {
                select: {
                    employeeId: true,
                    designation: true,
                    dateOfJoining: true,
                    baseSalary: true
                }
            },
            teamMemberships: {
                where: {
                    managerId: managerId,
                    ...(companyId && { companyId })
                },
                select: {
                    id: true,
                    role: true,
                    assignedAt: true,
                    isActive: true
                }
            }
        }
    });

    return users.map(user => {
        const teamMembership = user.teamMemberships[0]; // Should only be one per manager-company combo

        return {
            id: teamMembership?.id || user.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            companyId: user.companyId || '',
            companyName: user.company?.name || 'Unknown',
            designation: user.employeeProfile?.designation || null,
            role: teamMembership?.role || null,
            isActive: teamMembership?.isActive ?? user.isActive,
            assignedAt: teamMembership?.assignedAt || user.createdAt,
            employeeProfile: user.employeeProfile ? {
                employeeId: user.employeeProfile.employeeId,
                designation: user.employeeProfile.designation,
                dateOfJoining: user.employeeProfile.dateOfJoining,
                baseSalary: user.employeeProfile.baseSalary
            } : null
        };
    });
}

/**
 * Verify company context matches for data integrity
 * 
 * When a manager performs an action (e.g., approve leave), verify that
 * the target record belongs to the specified company context.
 * 
 * @param userId - The user ID to check
 * @param expectedCompanyId - The expected company ID
 * @returns true if match, false otherwise
 */
export async function verifyCompanyContext(
    userId: string,
    expectedCompanyId: string
): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
    });

    return user?.companyId === expectedCompanyId;
}
