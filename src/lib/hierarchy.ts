import { prisma } from '@/lib/prisma';

/**
 * Validates if the targetUserId is in the downline of the rootUserId
 * @param companyId - Optional company filter. Pass null for cross-company validation
 */
export async function isSubordinate(rootUserId: string, targetUserId: string, companyId?: string | null): Promise<boolean> {
    if (rootUserId === targetUserId) return true; // Self is usually accessible
    const downline = await getDownlineUserIds(rootUserId, companyId);
    return downline.includes(targetUserId);
}

/**
 * Fetches all User IDs that report recursively to the rootUserId.
 * Uses in-memory BFS since Prisma doesn't support recursive CTEs easily.
 * 
 * @param rootUserId - The manager's user ID
 * @param companyId - Optional company filter. If null/undefined, returns reports across all companies
 */
export async function getDownlineUserIds(rootUserId: string, companyId?: string | null): Promise<string[]> {
    const where: any = { isActive: true };

    // Only filter by company if explicitly provided
    // This allows cross-company management when companyId is null
    if (companyId !== null && companyId !== undefined) {
        where.companyId = companyId;
    }

    // Fetch minimal fields for all users (or in the company if filtered)
    const allUsers = await prisma.user.findMany({
        where,
        select: { id: true, managerId: true }
    });

    const downlineIds = new Set<string>([rootUserId]);
    const queue = [rootUserId];

    // Build Adjacency List for O(1) lookups if optimized, but filter is O(N) per node.
    // Optimization: Build tree first
    const reportsMap: Record<string, string[]> = {};
    for (const u of allUsers) {
        if (u.managerId) {
            if (!reportsMap[u.managerId]) reportsMap[u.managerId] = [];
            reportsMap[u.managerId].push(u.id);
        }
    }

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const directReports = reportsMap[currentId] || [];

        for (const reportId of directReports) {
            if (!downlineIds.has(reportId)) {
                downlineIds.add(reportId);
                queue.push(reportId);
            }
        }
    }

    return Array.from(downlineIds);
}

/**
 * Returns the relevant 'where' clause condition for filtering users based on role hierarchy.
 * SUPER_ADMIN/ADMIN -> All in company
 * MANAGER/TEAM_LEADER -> Subtree (cross-company)
 * OTHERS -> Self only
 */
export async function getHierarchyFilter(user: { id: string, role: string, companyId?: string | null }): Promise<any> {
    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        return {}; // No ID filter, just company logic usually applied outside
    }

    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        // Pass null to get cross-company downline
        const downlineIds = await getDownlineUserIds(user.id, null);
        return { userId: { in: downlineIds } };
    }

    // Default: Self only
    return { userId: user.id };
}
