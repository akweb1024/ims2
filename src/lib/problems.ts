import { GoogleGenerativeAI } from '@google/generative-ai';
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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const EMBEDDING_MODEL = process.env.PROBLEMS_EMBEDDING_MODEL || process.env.THINK_TANK_EMBEDDING_MODEL || 'text-embedding-004';
const PROBLEM_DUPLICATE_THRESHOLD = 0.72;

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
    duplicateLinks: {
        orderBy: { similarityScore: 'desc' as const },
        include: {
            matchedIssue: {
                select: {
                    id: true,
                    title: true,
                    category: true,
                    severity: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
        take: 5,
    },
    resolutionFeedback: {
        orderBy: { createdAt: 'desc' as const },
        include: {
            user: { select: { id: true, name: true, email: true, role: true } },
        },
        take: 10,
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

const normalizeProblemText = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

const tokenizeProblemText = (text: string) =>
    new Set(
        normalizeProblemText(text)
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length > 2)
    );

const jaccardSimilarity = (a: string, b: string) => {
    const setA = tokenizeProblemText(a);
    const setB = tokenizeProblemText(b);
    if (!setA.size || !setB.size) return 0;

    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }

    const union = new Set([...setA, ...setB]).size;
    return union ? intersection / union : 0;
};

const cosineSimilarity = (a: number[], b: number[]) => {
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < length; index += 1) {
        dot += a[index] * b[index];
        normA += a[index] * a[index];
        normB += b[index] * b[index];
    }

    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getProblemEmbedding = async (text: string): Promise<number[] | null> => {
    if (!GEMINI_API_KEY) return null;

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
        const result = await model.embedContent(text);
        return result.embedding.values ?? null;
    } catch {
        return null;
    }
};

export const computeProblemSimilarity = async (left: string, right: string) => {
    const [leftEmbedding, rightEmbedding] = await Promise.all([
        getProblemEmbedding(left),
        getProblemEmbedding(right),
    ]);

    if (leftEmbedding && rightEmbedding) {
        return cosineSimilarity(leftEmbedding, rightEmbedding);
    }

    return jaccardSimilarity(left, right);
};

export const findPotentialProblemDuplicates = async (params: {
    companyId: string;
    category: string;
    title: string;
    description: string;
    excludeIssueId?: string;
}) => {
    const candidates = await prisma.problemIssue.findMany({
        where: {
            companyId: params.companyId,
            category: params.category,
            status: {
                in: [
                    ProblemStatus.SUBMITTED,
                    ProblemStatus.ACKNOWLEDGED,
                    ProblemStatus.NEEDS_INFO,
                    ProblemStatus.IN_REVIEW,
                    ProblemStatus.IN_PROGRESS,
                    ProblemStatus.ESCALATED,
                    ProblemStatus.REOPENED,
                    ProblemStatus.RESOLVED,
                ],
            },
            id: params.excludeIssueId ? { not: params.excludeIssueId } : undefined,
        },
        select: {
            id: true,
            title: true,
            description: true,
            category: true,
            severity: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
        take: 25,
    });

    const sourceText = `${params.title}\n${params.description}`;
    const matches = await Promise.all(
        candidates.map(async (issue) => ({
            ...issue,
            similarityScore: await computeProblemSimilarity(sourceText, `${issue.title}\n${issue.description}`),
        }))
    );

    return matches
        .filter((issue) => issue.similarityScore >= PROBLEM_DUPLICATE_THRESHOLD)
        .sort((left, right) => right.similarityScore - left.similarityScore)
        .slice(0, 5);
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
        duplicateMatches: issue.duplicateLinks.map((link) => ({
            id: link.id,
            similarityScore: link.similarityScore,
            decision: link.decision,
            matchedIssue: link.matchedIssue,
        })),
        resolutionFeedback: issue.resolutionFeedback.map((entry) => ({
            id: entry.id,
            outcome: entry.outcome,
            note: entry.note,
            createdAt: entry.createdAt,
            user: entry.user,
        })),
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

    const duplicates = await findPotentialProblemDuplicates({
        companyId: params.user.companyId!,
        category,
        title,
        description,
    });

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
                    metadata: duplicates.length
                        ? {
                            duplicateMatches: duplicates.map((match) => ({
                                issueId: match.id,
                                similarityScore: match.similarityScore,
                            })),
                        }
                        : Prisma.JsonNull,
                },
            },
            duplicateLinks: duplicates.length
                ? {
                    create: duplicates.map((duplicate) => ({
                        matchedIssueId: duplicate.id,
                        similarityScore: duplicate.similarityScore,
                        decision: 'SUGGESTED',
                    })),
                }
                : undefined,
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

export const addProblemResolutionFeedback = async (params: {
    issueId: string;
    companyId: string;
    actor: ProblemsUser;
    outcome: 'RESOLVED_CONFIRMED' | 'REOPEN_REQUESTED';
    note?: string | null;
}) => {
    ensureProblemsAccess(params.actor);

    const issue = await getProblemIssueById(params.issueId, params.companyId);
    const isReporter = issue.reportedById === params.actor.id;
    if (!isReporter && !canManageProblems(params.actor.role)) {
        throw new AuthorizationError('Only the reporter or management can submit resolution feedback.');
    }

    const note = params.note?.trim() || null;

    if (params.outcome === 'RESOLVED_CONFIRMED' && issue.status !== ProblemStatus.RESOLVED) {
        throw new ValidationError('Only resolved problems can be confirmed as fixed.');
    }

    if (params.outcome === 'REOPEN_REQUESTED' && !note) {
        throw new ValidationError('Please explain why this problem needs to be reopened.');
    }

    const nextStatus =
        params.outcome === 'RESOLVED_CONFIRMED' ? ProblemStatus.CLOSED : ProblemStatus.REOPENED;

    const updated = await prisma.problemIssue.update({
        where: { id: issue.id },
        data: {
            status: nextStatus,
            closedAt: params.outcome === 'RESOLVED_CONFIRMED' ? new Date() : null,
            reopenedAt: params.outcome === 'REOPEN_REQUESTED' ? new Date() : null,
            resolvedAt: params.outcome === 'REOPEN_REQUESTED' ? null : issue.resolvedAt,
            resolutionFeedback: {
                create: {
                    userId: params.actor.id,
                    outcome: params.outcome,
                    note,
                },
            },
            statusHistory: {
                create: {
                    actorUserId: params.actor.id,
                    fromStatus: issue.status,
                    toStatus: nextStatus,
                    note:
                        params.outcome === 'RESOLVED_CONFIRMED'
                            ? note || 'Reporter confirmed the resolution worked.'
                            : note,
                },
            },
            auditEvents: {
                create: {
                    actorUserId: params.actor.id,
                    action: 'PROBLEM_RESOLUTION_FEEDBACK_ADDED',
                    outcome: 'SUCCESS',
                    metadata: {
                        feedbackOutcome: params.outcome,
                        resultingStatus: nextStatus,
                    },
                },
            },
        },
        include: problemIssueInclude,
    });

    await notifyProblemParticipants(
        issue,
        params.actor.id,
        params.outcome === 'RESOLVED_CONFIRMED' ? 'Problem closed by reporter' : 'Problem reopened by reporter',
        params.outcome === 'RESOLVED_CONFIRMED'
            ? `The reporter confirmed that "${issue.title}" has been resolved.`
            : `The reporter reopened "${issue.title}" and requested more work.`
    );

    return updated;
};

export const getProblemsAnalytics = async (params: {
    companyId: string;
}) => {
    const issues = await prisma.problemIssue.findMany({
        where: { companyId: params.companyId },
        select: {
            id: true,
            title: true,
            category: true,
            severity: true,
            status: true,
            recurrence: true,
            createdAt: true,
            updatedAt: true,
            acknowledgedAt: true,
            resolvedAt: true,
            duplicateSources: {
                select: {
                    id: true,
                    similarityScore: true,
                },
            },
        },
    });

    const openStatuses = new Set<ProblemStatus>([
        ProblemStatus.SUBMITTED,
        ProblemStatus.ACKNOWLEDGED,
        ProblemStatus.NEEDS_INFO,
        ProblemStatus.IN_REVIEW,
        ProblemStatus.IN_PROGRESS,
        ProblemStatus.ESCALATED,
        ProblemStatus.REOPENED,
    ]);

    const statusBreakdown = PROBLEM_STATUS_OPTIONS.map((status) => ({
        status,
        count: issues.filter((issue) => issue.status === status).length,
    }));

    const severityBreakdown = PROBLEM_SEVERITY_OPTIONS.map((severity) => ({
        severity,
        count: issues.filter((issue) => issue.severity === severity).length,
    }));

    const categoryBreakdown = PROBLEM_CATEGORY_OPTIONS.map((category) => ({
        category,
        count: issues.filter((issue) => issue.category === category).length,
    })).filter((entry) => entry.count > 0);

    const recurringIssues = issues
        .filter((issue) => issue.recurrence !== ProblemRecurrence.ONE_TIME || issue.duplicateSources.length > 0)
        .map((issue) => ({
            id: issue.id,
            title: issue.title,
            category: issue.category,
            status: issue.status,
            severity: issue.severity,
            recurrence: issue.recurrence,
            duplicateCount: issue.duplicateSources.length,
            highestSimilarity: issue.duplicateSources.reduce((max, item) => Math.max(max, item.similarityScore), 0),
            updatedAt: issue.updatedAt,
        }))
        .sort((left, right) => {
            if (right.duplicateCount !== left.duplicateCount) {
                return right.duplicateCount - left.duplicateCount;
            }
            return right.highestSimilarity - left.highestSimilarity;
        })
        .slice(0, 8);

    const unresolvedCritical = issues.filter(
        (issue) => issue.severity === ProblemSeverity.CRITICAL && openStatuses.has(issue.status)
    );

    const acknowledgedDurations = issues
        .filter((issue) => issue.acknowledgedAt)
        .map((issue) => new Date(issue.acknowledgedAt!).getTime() - new Date(issue.createdAt).getTime());

    const resolvedDurations = issues
        .filter((issue) => issue.resolvedAt)
        .map((issue) => new Date(issue.resolvedAt!).getTime() - new Date(issue.createdAt).getTime());

    const averageDays = (durations: number[]) => {
        if (!durations.length) return null;
        const averageMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;
        return Number((averageMs / (1000 * 60 * 60 * 24)).toFixed(1));
    };

    const reopenedCount = issues.filter((issue) => issue.status === ProblemStatus.REOPENED).length;
    const resolvedOrClosedCount = issues.filter(
        (issue) => issue.status === ProblemStatus.RESOLVED || issue.status === ProblemStatus.CLOSED
    ).length;

    return {
        totals: {
            total: issues.length,
            open: issues.filter((issue) => openStatuses.has(issue.status)).length,
            resolved: issues.filter((issue) => issue.status === ProblemStatus.RESOLVED).length,
            closed: issues.filter((issue) => issue.status === ProblemStatus.CLOSED).length,
            unresolvedCritical: unresolvedCritical.length,
            recurring: issues.filter((issue) => issue.recurrence !== ProblemRecurrence.ONE_TIME).length,
        },
        avgAcknowledgementDays: averageDays(acknowledgedDurations),
        avgResolutionDays: averageDays(resolvedDurations),
        reopenRate: resolvedOrClosedCount ? Number(((reopenedCount / resolvedOrClosedCount) * 100).toFixed(1)) : 0,
        statusBreakdown,
        severityBreakdown,
        categoryBreakdown,
        recurringIssues,
        unresolvedCritical: unresolvedCritical
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
            .slice(0, 8)
            .map((issue) => ({
                id: issue.id,
                title: issue.title,
                category: issue.category,
                status: issue.status,
                updatedAt: issue.updatedAt,
            })),
    };
};
