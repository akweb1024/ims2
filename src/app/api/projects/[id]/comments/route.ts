import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';
import { PROJECT_VIEWER_ROLES } from '@/lib/projects-access';

/**
 * Review / feedback thread on a business Project.
 *
 * Anyone who can see a project can comment on it — the point is that an employee can raise
 * a remark on work they are not assigned to. Resolving is narrower: only the team actually
 * doing the work (members, manager, lead) or an admin can close a remark out, so feedback
 * cannot be silently dismissed by whoever left it.
 */

const label = (u?: { name?: string | null; email?: string | null } | null) =>
    u?.name || u?.email || 'A team member';

const COMMENT_INCLUDE = {
    user: { select: { id: true, name: true, email: true } },
    resolvedBy: { select: { id: true, name: true, email: true } },
} as const;

/** The people doing the work: members + manager + lead. */
async function loadProjectTeam(projectId: string) {
    return prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true,
            title: true,
            managerId: true,
            leadId: true,
            members: { select: { userId: true } },
        },
    });
}

const teamUserIds = (p: NonNullable<Awaited<ReturnType<typeof loadProjectTeam>>>) =>
    new Set([...p.members.map((m) => m.userId), p.managerId, p.leadId].filter(Boolean) as string[]);

export const GET = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const projectId = (await params).id;
            const comments = await prisma.projectComment.findMany({
                where: { projectId, parentId: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    ...COMMENT_INCLUDE,
                    replies: { orderBy: { createdAt: 'asc' }, include: COMMENT_INCLUDE },
                },
            });
            return NextResponse.json(comments);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const projectId = (await params).id;
            const { content, parentId } = await req.json();

            if (!content || !String(content).trim()) {
                return createErrorResponse('Comment cannot be empty', 400);
            }

            const project = await loadProjectTeam(projectId);
            if (!project) return createErrorResponse('Project not found', 404);

            if (parentId) {
                // A reply must belong to this project, or a comment could be grafted onto
                // another project's thread by id.
                const parent = await prisma.projectComment.findUnique({
                    where: { id: parentId },
                    select: { projectId: true },
                });
                if (!parent || parent.projectId !== projectId) {
                    return createErrorResponse('Parent comment does not belong to this project', 400);
                }
            }

            const comment = await prisma.projectComment.create({
                data: {
                    projectId,
                    userId: user.id,
                    content: String(content).trim(),
                    parentId: parentId || null,
                },
                include: COMMENT_INCLUDE,
            });

            // Tell the team there is something to act on. Never notify the author.
            const recipients = teamUserIds(project);
            recipients.delete(user.id);
            const who = label(comment.user);
            for (const userId of recipients) {
                await createNotification({
                    userId,
                    title: parentId ? `New reply on project: ${project.title}` : `New review on project: ${project.title}`,
                    message: `${who}: "${comment.content.slice(0, 80)}${comment.content.length > 80 ? '…' : ''}"`,
                    type: 'INFO',
                    link: `/dashboard/projects/${projectId}`,
                    channels: ['IN_APP'],
                });
            }

            return NextResponse.json(comment, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/** Resolve / reopen a remark. Restricted to the project team (plus admins). */
export const PATCH = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const projectId = (await params).id;
            const { commentId, status, resolutionNote } = await req.json();

            if (!commentId) return createErrorResponse('commentId is required', 400);
            if (!['OPEN', 'RESOLVED'].includes(status)) {
                return createErrorResponse('status must be OPEN or RESOLVED', 400);
            }

            const project = await loadProjectTeam(projectId);
            if (!project) return createErrorResponse('Project not found', 404);

            const existing = await prisma.projectComment.findUnique({
                where: { id: commentId },
                select: { id: true, projectId: true, userId: true },
            });
            if (!existing || existing.projectId !== projectId) {
                return createErrorResponse('Comment not found on this project', 404);
            }

            // Only the people working on it may close feedback out — otherwise a remark
            // could be marked resolved by anyone who happened to read it.
            const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
            if (!isAdmin && !teamUserIds(project).has(user.id)) {
                return createErrorResponse('Only the project team can resolve feedback', 403);
            }

            const resolving = status === 'RESOLVED';
            const updated = await prisma.projectComment.update({
                where: { id: commentId },
                data: {
                    status,
                    resolvedById: resolving ? user.id : null,
                    resolvedAt: resolving ? new Date() : null,
                    resolutionNote: resolving ? (resolutionNote?.trim() || null) : null,
                },
                include: COMMENT_INCLUDE,
            });

            // Close the loop: whoever raised it hears what happened.
            if (existing.userId !== user.id) {
                await createNotification({
                    userId: existing.userId,
                    title: resolving ? `Your review was resolved: ${project.title}` : `Your review was reopened: ${project.title}`,
                    message: resolving
                        ? `${label(updated.resolvedBy)} resolved your feedback${updated.resolutionNote ? `: "${updated.resolutionNote}"` : '.'}`
                        : `${label(updated.resolvedBy) || 'The team'} reopened your feedback.`,
                    type: resolving ? 'SUCCESS' : 'INFO',
                    link: `/dashboard/projects/${projectId}`,
                    channels: ['IN_APP'],
                });
            }

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
