import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'];

/**
 * GET /api/kra/mcp-proposals?status=PENDING&limit=50
 *
 * Audit trail of write actions proposed through the ims2 MCP server (layer 2
 * of the two-layer approval — see src/lib/kra/mcp-proposals.ts). Read-only:
 * approval/rejection happens over the MCP conversation, this page just makes
 * every proposal and its outcome visible in the app.
 */
export const GET = authorizedRoute(ADMIN_ROLES, async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url);
        const status = (searchParams.get('status') || '').toUpperCase();
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);

        const rows = await prisma.mcpProposal.findMany({
            where: ['PENDING', 'EXECUTED', 'REJECTED', 'FAILED'].includes(status) ? { status } : {},
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // proposedBy is a plain User-id ref; resolve names in one shot.
        const userIds = [...new Set(rows.map((r) => r.proposedBy))];
        const users = userIds.length
            ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
            : [];
        const byId = new Map(users.map((u) => [u.id, u]));

        return NextResponse.json({
            proposals: rows.map((r) => ({
                id: r.id,
                action: r.action,
                status: r.status,
                instruction: r.instruction,
                preview: r.preview,
                result: r.result,
                error: r.error,
                proposedBy: byId.get(r.proposedBy)?.name ?? byId.get(r.proposedBy)?.email ?? r.proposedBy,
                createdAt: r.createdAt.toISOString(),
                decidedAt: r.decidedAt?.toISOString() ?? null,
            })),
        });
    } catch (error) {
        console.error('mcp-proposals GET failed:', error);
        return createErrorResponse('Failed to load MCP proposals', 500);
    }
});
