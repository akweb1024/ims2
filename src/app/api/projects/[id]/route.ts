import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { PROJECT_VIEWER_ROLES, PROJECT_EDITOR_ROLES } from '@/lib/projects-access';
import { canAccessAllCompanies } from '@/lib/company-scope';

type Actor = { role: string; companyId?: string | null; allowedModules?: string[] };

/**
 * Reading a project is group-wide; changing one is not. A project belongs to the company
 * that owns it, so only that company's editors (or a group-wide admin) may change it.
 */
function mayEditProject(project: { companyId: string }, user: Actor) {
    if (!PROJECT_EDITOR_ROLES.includes(user.role)) return false;
    if (canAccessAllCompanies(user as any)) return true;
    return !!user.companyId && project.companyId === user.companyId;
}

/**
 * Confirms the project exists and the caller may change it.
 *
 * PUT and DELETE previously had none of this — PUT carried a "validation logic omitted
 * for brevity, ensure user has rights" note and DELETE a "Check existence and
 * permissions" comment above a bare delete — so any editor-role user could edit or
 * delete ANY company's project by id.
 *
 * Returns an error response to hand straight back, or null when the caller may proceed.
 */
async function assertOwnsProject(id: string, user: Actor) {
    const project = await prisma.project.findUnique({ where: { id }, select: { companyId: true } });
    if (!project) return createErrorResponse('Project not found', 404);
    if (!mayEditProject(project, user)) return createErrorResponse('Unauthorized', 403);
    return null;
}

export const GET = authorizedRoute(
    PROJECT_VIEWER_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const id = (await params).id;
            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    company: { select: { id: true, name: true } },
                    manager: { select: { name: true, email: true, id: true } },
                    lead: { select: { name: true, email: true, id: true } },
                    members: {
                        include: {
                            user: { select: { name: true, email: true, role: true, id: true } }
                        }
                    },
                    tasks: {
                        take: 20,
                        orderBy: { updatedAt: 'desc' },
                        include: {
                            // User.name is nullable, so email is the fallback label —
                            // without it a named-less assignee renders as "Unassigned".
                            user: { select: { name: true, email: true } }
                        }
                    },
                    issues: {
                        take: 20,
                        orderBy: { updatedAt: 'desc' },
                        include: {
                            assignee: { select: { name: true, email: true } },
                            reporter: { select: { name: true, email: true } }
                        }
                    },
                    // The page reads project._count for its KPI cards, but this route never
                    // sent it — so the Issues counter rendered 0 no matter how many existed.
                    // tasks/issues above are capped at 20, so .length is not a substitute.
                    _count: { select: { tasks: true, issues: true } }
                }
            });

            if (!project) return createErrorResponse('Project not found', 404);

            // Group-wide read, matching the list route — any internal user may open any
            // company's project. Editing stays with the owning company, so tell the client
            // which it is rather than letting it offer buttons the API will refuse.
            return NextResponse.json({ ...project, canEdit: mayEditProject(project, user) });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PUT = authorizedRoute(
    PROJECT_EDITOR_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const id = (await params).id;
            const denied = await assertOwnsProject(id, user);
            if (denied) return denied;

            const body = await req.json();

            const updated = await prisma.project.update({
                where: { id },
                data: {
                    title: body.title,
                    description: body.description,
                    status: body.status,
                    priority: body.priority,
                    startDate: body.startDate ? new Date(body.startDate) : undefined,
                    // `body.endDate ? ... : undefined` made clearing an end date impossible:
                    // undefined tells Prisma to leave the column alone. null clears it.
                    endDate: body.endDate === undefined ? undefined : (body.endDate ? new Date(body.endDate) : null),
                    managerId: body.managerId,
                    leadId: body.leadId,
                    // Members are settable at creation (POST /api/projects takes memberIds)
                    // but there is no edit path for them yet.
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    PROJECT_EDITOR_ROLES,
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const id = (await params).id;
            const denied = await assertOwnsProject(id, user);
            if (denied) return denied;

            await prisma.project.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
