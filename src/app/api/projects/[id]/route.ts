import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { PROJECT_VIEWER_ROLES, PROJECT_EDITOR_ROLES } from '@/lib/projects-access';
import { canAccessAllCompanies } from '@/lib/company-scope';
import { creditLinkedMetric, reverseLinkedMetricCredit } from '@/lib/kra/auto-credit';

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
                    linkedMetric: { select: { id: true, name: true, unit: true } },
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

            // Needed before the write to detect completion / link transitions for KRA credit.
            const existing = await prisma.project.findUnique({
                where: { id },
                select: { status: true, linkedMetricId: true, managerId: true, leadId: true, companyId: true },
            });
            if (!existing) return createErrorResponse('Project not found', 404);

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
                    // Optional KRA metric link; '' clears it, absent leaves it untouched.
                    linkedMetricId: body.linkedMetricId === undefined ? undefined : (body.linkedMetricId || null),
                    // Members are settable at creation (POST /api/projects takes memberIds)
                    // but there is no edit path for them yet.
                }
            });

            // KRA auto-credit. Completing a linked project credits its manager + lead;
            // reopening it — or moving the link off a still-completed project — reverses
            // that credit. Idempotent by project id, so re-saving at the same state is a
            // no-op. Owners resolve to their own company's metric only (creditLinkedMetric
            // ignores a cross-company link), which is the safe outcome for a group-wide admin
            // editing another company's project.
            const DONE = 'COMPLETED';
            const wasDone = existing.status === DONE;
            const nowDone = updated.status === DONE;
            const before = wasDone ? existing.linkedMetricId : null;
            const after = nowDone ? updated.linkedMetricId : null;
            if (before && before !== after) {
                await reverseLinkedMetricCredit({ metricId: before, sourceRefId: updated.id });
            }
            if (after && after !== before) {
                await creditLinkedMetric({
                    companyId: updated.companyId,
                    metricId: after,
                    sourceRefId: updated.id,
                    ownerUserIds: [updated.managerId, updated.leadId],
                    date: new Date(),
                });
            }

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
