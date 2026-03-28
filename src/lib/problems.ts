import {
    Prisma,
    ProblemImpactType,
    ProblemRecurrence,
    ProblemSeverity,
    ProblemStatus,
    ProblemVisibility,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/system-notifications';
import {
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
} from '@/lib/error-handler';

export type ProblemsUser = {
    id: string;
    role: string;
    companyId?: string | null;
    name?: string | null;
    email?: string | null;
};

const INTERNAL_PROBLEM_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'TEAM_LEADER',
    'EXECUTIVE',
    'EMPLOYEE',
    'HR_MANAGER',
    'HR',
    'FINANCE_ADMIN',
    'IT_MANAGER',
    'IT_ADMIN',
    'IT_SUPPORT',
    'EDITOR',
    'EDITOR_IN_CHIEF',
    'JOURNAL_MANAGER',
]);

const PROBLEM_MANAGER_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'TEAM_LEADER',
    'HR_MANAGER',
    'HR',
    'IT_MANAGER',
    'IT_ADMIN',
    'FINANCE_ADMIN',
]);

export const PROBLEM_CATEGORY_OPTIONS = [
    'OPERATIONS',
    'HR',
    'IT',
    'FINANCE',
    'CRM',
    'PUBLICATION',
    'LOGISTICS',
    'COMPLIANCE',
    'CUSTOMER',
    'OTHER',
] as const;

export const PROBLEM_STATUS_OPTIONS = Object.values(ProblemStatus);
export const PROBLEM_SEVERITY_OPTIONS = Object.values(ProblemSeverity);
export const PROBLEM_VISIBILITY_OPTIONS = Object.values(ProblemVisibility);
export const PROBLEM_RECURRENCE_OPTIONS = Object.values(ProblemRecurrence);
export const PROBLEM_IMPACT_OPTIONS = Object.values(ProblemImpactType);

export const problemIssueInclude = {
    company: { select: { id: true, name: true } },
    reportedBy: { select: { id: true, name: true, email: true, role: true } },
    assignedTo: { select: { id: true, name: true, email: true, role: true } },
    resolvedBy: { select: { id: true, name: true, email: true, role: true } },
    comments: {
        orderBy: { createdAt: 'asc' as const },
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
    },
    internalNotes: {
        orderBy: { createdAt: 'asc' as const },
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
    },
    assignmentHistory: {
        orderBy: { createdAt: 'desc' as const },
        include: { actor: { select: { id: true, name: true, email: true } } },
        take: 10,
    },
    statusHistory: {
        orderBy: { createdAt: 'desc' as const },
        include: { actor: { select: { id: true, name: true, email: true } } },
        take: 12,
    },
    _count: {
        select: {
            comments: true,
            internalNotes: true,
            attachments: true,
            watchers: true,
        },
    },
} satisfies Prisma.ProblemIssueInclude;

export const ensureProblemsAccess = (user: ProblemsUser) => {
    if (!user?.id) {
        throw new AuthenticationError('Unauthorized');
    }
    if (!user.companyId) {
        throw new AuthorizationError('Problems module is available only for company-linked staff.');
    }
    if (!INTERNAL_PROBLEM_ROLES.has(user.role)) {
        throw new AuthorizationError('Problems module is available only for internal staff.');
    }
};

export const canManageProblems = (role?: string | null) => PROBLEM_MANAGER_ROLES.has(role || '');

export const formatProblemLabel = (value?: string | null) => {
    if (!value) return '—';
    return value.replace(/_/g, ' ');
};

export const serializeProblemIssue = (
    issue: Prisma.ProblemIssueGetPayload<{ include: typeof problemIssueInclude }>,
    options?: { revealReporter?: boolean; internalView?: boolean }
) => {
    const revealReporter = options?.revealReporter ?? true;

    return {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        severity: issue.severity,
        status: issue.status,
        visibility: issue.visibility,
        recurrence: issue.recurrence,
        impactType: issue.impactType,
        location: issue.location,
        affectedArea: issue.affectedArea,
        departmentName: issue.departmentName,
        isSensitive: issue.isSensitive,
        aiSummary: issue.aiSummary,
        rootCauseSummary: issue.rootCauseSummary,
        resolutionSummary: issue.resolutionSummary,
        dueAt: issue.dueAt,
        acknowledgedAt: issue.acknowledgedAt,
        resolvedAt: issue.resolvedAt,
        closedAt: issue.closedAt,
        reopenedAt: issue.reopenedAt,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        metadata: issue.metadata,
        company: issue.company,
        reportedBy: revealReporter ? issue.reportedBy : null,
        assignedTo: issue.assignedTo,
        resolvedBy: issue.resolvedBy,
        comments: issue.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            author: comment.author,
        })),
        internalNotes: options?.internalView
            ? issue.internalNotes.map((note) => ({
                id: note.id,
                content: note.content,
                createdAt: note.createdAt,
                updatedAt: note.updatedAt,
                author: note.author,
            }))
            : [],
        assignmentHistory: options?.internalView ? issue.assignmentHistory : issue.assignmentHistory.slice(0, 5),
        statusHistory: issue.statusHistory,
        counts: issue._count,
    };
};

export const getProblemIssueById = async (id: string, companyId: string) => {
    const issue = await prisma.problemIssue.findFirst({
        where: { id, companyId },
        include: problemIssueInclude,
    });

    if (!issue) {
        throw new NotFoundError('Problem issue');
    }

    return issue;
};

export const createProblemIssue = async (params: {
    user: ProblemsUser;
    title: string;
    description: string;
    category: string;
    severity: ProblemSeverity;
    visibility: ProblemVisibility;
    recurrence: ProblemRecurrence;
    impactType: ProblemImpactType;
    location?: string | null;
    affectedArea?: string | null;
    departmentName?: string | null;
    isSensitive?: boolean;
}) => {
    ensureProblemsAccess(params.user);

    const title = params.title.trim();
    const description = params.description.trim();
    const category = params.category.trim().toUpperCase();

    if (!title) {
        throw new ValidationError('Title is required.');
    }
    if (!description) {
        throw new ValidationError('Description is required.');
    }
    if (!category) {
        throw new ValidationError('Category is required.');
    }

    const issue = await prisma.problemIssue.create({
        data: {
            companyId: params.user.companyId!,
            title,
            description,
            category,
            severity: params.severity,
            visibility: params.visibility,
            recurrence: params.recurrence,
            impactType: params.impactType,
            location: params.location?.trim() || null,
            affectedArea: params.affectedArea?.trim() || null,
            departmentName: params.departmentName?.trim() || null,
            isSensitive: Boolean(params.isSensitive),
            reportedById: params.user.id,
            statusHistory: {
                create: {
                    actorUserId: params.user.id,
                    toStatus: ProblemStatus.SUBMITTED,
                    note: 'Problem reported by employee.',
                },
            },
            auditEvents: {
                create: {
                    actorUserId: params.user.id,
                    action: 'PROBLEM_CREATED',
                    outcome: 'SUCCESS',
                },
            },
        },
        include: problemIssueInclude,
    });

    return issue;
};

export const updateProblemStatus = async (params: {
    issueId: string;
    companyId: string;
    actorUserId: string;
    nextStatus: ProblemStatus;
    note?: string | null;
}) => {
    const issue = await getProblemIssueById(params.issueId, params.companyId);
    const now = new Date();

    const data: Prisma.ProblemIssueUpdateInput = {
        status: params.nextStatus,
        statusHistory: {
            create: {
                actorUserId: params.actorUserId,
                fromStatus: issue.status,
                toStatus: params.nextStatus,
                note: params.note?.trim() || null,
            },
        },
        auditEvents: {
            create: {
                actorUserId: params.actorUserId,
                action: 'PROBLEM_STATUS_UPDATED',
                outcome: 'SUCCESS',
                metadata: {
                    fromStatus: issue.status,
                    toStatus: params.nextStatus,
                    note: params.note?.trim() || null,
                },
            },
        },
    };

    if (params.nextStatus === ProblemStatus.ACKNOWLEDGED && !issue.acknowledgedAt) {
        data.acknowledgedAt = now;
    }
    if (params.nextStatus === ProblemStatus.RESOLVED) {
        data.resolvedAt = now;
    }
    if (params.nextStatus === ProblemStatus.CLOSED) {
        data.closedAt = now;
    }
    if (params.nextStatus === ProblemStatus.REOPENED) {
        data.reopenedAt = now;
        data.closedAt = null;
        data.resolvedAt = null;
    }

    return prisma.problemIssue.update({
        where: { id: issue.id },
        data,
        include: problemIssueInclude,
    });
};

export const assignProblemIssue = async (params: {
    issueId: string;
    companyId: string;
    actorUserId: string;
    assigneeId?: string | null;
    note?: string | null;
}) => {
    const issue = await getProblemIssueById(params.issueId, params.companyId);

    if (params.assigneeId) {
        const assignee = await prisma.user.findFirst({
            where: {
                id: params.assigneeId,
                companyId: params.companyId,
                isActive: true,
            },
            select: { id: true },
        });

        if (!assignee) {
            throw new ValidationError('Selected assignee is not available in this company.');
        }
    }

    return prisma.problemIssue.update({
        where: { id: issue.id },
        data: {
            assignedToId: params.assigneeId || null,
            assignmentHistory: {
                create: {
                    actorUserId: params.actorUserId,
                    previousAssigneeId: issue.assignedToId,
                    newAssigneeId: params.assigneeId || null,
                    note: params.note?.trim() || null,
                },
            },
            auditEvents: {
                create: {
                    actorUserId: params.actorUserId,
                    action: 'PROBLEM_ASSIGNED',
                    outcome: 'SUCCESS',
                    metadata: {
                        previousAssigneeId: issue.assignedToId,
                        newAssigneeId: params.assigneeId || null,
                    },
                },
            },
        },
        include: problemIssueInclude,
    });
};

const notifyProblemParticipants = async (issue: {
    id: string;
    title: string;
    reportedById: string;
    assignedToId?: string | null;
}, actorUserId: string, title: string, message: string) => {
    const recipients = new Set<string>();
    if (issue.reportedById && issue.reportedById !== actorUserId) recipients.add(issue.reportedById);
    if (issue.assignedToId && issue.assignedToId !== actorUserId) recipients.add(issue.assignedToId);

    await Promise.all(
        [...recipients].map((userId) =>
            createNotification({
                userId,
                title,
                message,
                type: 'INFO',
                link: `/dashboard/problems`,
                channels: ['IN_APP'],
            })
        )
    );
};

export const addProblemComment = async (params: {
    issueId: string;
    companyId: string;
    actor: ProblemsUser;
    content: string;
}) => {
    ensureProblemsAccess(params.actor);
    const issue = await getProblemIssueById(params.issueId, params.companyId);
    const trimmed = params.content.trim();
    if (!trimmed) {
        throw new ValidationError('Comment content is required.');
    }

    const updated = await prisma.problemIssue.update({
        where: { id: issue.id },
        data: {
            comments: {
                create: {
                    authorUserId: params.actor.id,
                    content: trimmed,
                },
            },
            auditEvents: {
                create: {
                    actorUserId: params.actor.id,
                    action: 'PROBLEM_COMMENT_ADDED',
                    outcome: 'SUCCESS',
                },
            },
        },
        include: problemIssueInclude,
    });

    await notifyProblemParticipants(
        issue,
        params.actor.id,
        'Problem update posted',
        `A new comment was added to "${issue.title}".`
    );

    return updated;
};

export const addProblemInternalNote = async (params: {
    issueId: string;
    companyId: string;
    actor: ProblemsUser;
    content: string;
}) => {
    ensureProblemsAccess(params.actor);
    if (!canManageProblems(params.actor.role)) {
        throw new AuthorizationError('Only management can add internal notes.');
    }
    const issue = await getProblemIssueById(params.issueId, params.companyId);
    const trimmed = params.content.trim();
    if (!trimmed) {
        throw new ValidationError('Internal note content is required.');
    }

    return prisma.problemIssue.update({
        where: { id: issue.id },
        data: {
            internalNotes: {
                create: {
                    authorUserId: params.actor.id,
                    content: trimmed,
                },
            },
            auditEvents: {
                create: {
                    actorUserId: params.actor.id,
                    action: 'PROBLEM_INTERNAL_NOTE_ADDED',
                    outcome: 'SUCCESS',
                },
            },
        },
        include: problemIssueInclude,
    });
};
