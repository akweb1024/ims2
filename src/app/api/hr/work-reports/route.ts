import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, NotFoundError, AuthorizationError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getISTDateString, getISTDateRange } from '@/lib/hr/work-agenda';
import { recordContributions } from '@/lib/kra/contributions';
import { approveWorkReport } from '@/lib/hr/workReportApproval';
import { evaluateWorkReportForAutoApproval } from '@/lib/hr/workReportAutoApproval';
import { summarizeWorkReport } from '@/lib/hr/workReportSummary';
import { annotateTaskQuantitySuggestions } from '@/lib/hr/taskQuantitySuggester';

const SUBMISSION_COOLDOWN_MS = 10_000;
const BLOCKED_SUBMISSION_COOLDOWN_MS = 30_000;
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

const recentSubmissionAttempts = new Map<string, { lastAttemptAt: number; lastBlockedAt: number }>();
const idempotencyReplayCache = new Map<string, { reportId: string; createdAt: number }>();

const pruneInMemoryGuards = () => {
    const now = Date.now();
    for (const [key, value] of recentSubmissionAttempts.entries()) {
        if (now - Math.max(value.lastAttemptAt, value.lastBlockedAt) > IDEMPOTENCY_TTL_MS) {
            recentSubmissionAttempts.delete(key);
        }
    }
    for (const [key, value] of idempotencyReplayCache.entries()) {
        if (now - value.createdAt > IDEMPOTENCY_TTL_MS) {
            idempotencyReplayCache.delete(key);
        }
    }
};


export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const monthStr = searchParams.get('month');
            const yearStr = searchParams.get('year');
            const category = searchParams.get('category');
            const status = searchParams.get('status');
            let targetEmployeeId = employeeId;

            // Handle 'self' keyword early
            if (employeeId === 'self') {
                const myProfile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                if (myProfile) targetEmployeeId = myProfile.id;
            } else if (employeeId && employeeId !== 'all') {
                // Resolve ID to EmployeeProfile ID (handle both User ID and Profile ID)
                const profile = await prisma.employeeProfile.findFirst({
                    where: {
                        OR: [
                            { id: employeeId },
                            { userId: employeeId }
                        ]
                    },
                    select: { id: true }
                });
                if (profile) targetEmployeeId = profile.id;
            }

            const where: any = {};

            // Company Isolation
            if (user.companyId) {
                where.companyId = user.companyId;
            }



            // ...

            // Role-based Access & Filtering
            if (['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'].includes(user.role)) {
                if (targetEmployeeId && targetEmployeeId !== 'all') {
                    where.employeeId = targetEmployeeId;
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                // Can see own + downline (across all companies)
                // subIds usually doesn't include SELF, let's explicit allow SELF or DOWNLINE
                const allowedUserIds = [...subIds, user.id];

                if (targetEmployeeId && targetEmployeeId !== 'all') {
                    // Check if requested employee is in allowed list
                    const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: targetEmployeeId }, select: { userId: true } });
                    if (targetEmp && allowedUserIds.includes(targetEmp.userId)) {
                        where.employeeId = targetEmployeeId;
                    } else {
                        // Default to showing all team reports + self if no specific ID requested? 
                        // Or if strictly requested ID is invalid, return empty?
                        return NextResponse.json([], { status: 200 });
                    }
                } else {
                    // Show reports from self AND team
                    where.employee = { userId: { in: allowedUserIds } };
                }
            } else {
                // Regular employees only see their own
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([], { status: 200 });
                where.employeeId = profile.id;
            }

            // Date Filtering
            if (startDate || endDate || yearStr || monthStr) {
                where.date = {};
                if (startDate) where.date.gte = getISTDateRange(startDate).start;
                if (endDate) where.date.lte = getISTDateRange(endDate).end;

                if (yearStr || monthStr) {
                    let istStart: Date;
                    let istEnd: Date;

                    if (yearStr && !monthStr) {
                        const year = parseInt(yearStr);
                        istStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
                        istStart = new Date(istStart.getTime() - (330 * 60000));
                        istEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
                        istEnd = new Date(istEnd.getTime() - (330 * 60000));
                    } else {
                        const year = parseInt(yearStr || String(new Date().getFullYear()));
                        const month = parseInt(monthStr || String(new Date().getMonth() + 1));
                        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
                        istStart = new Date(start.getTime() - (330 * 60000));
                        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
                        istEnd = new Date(end.getTime() - (330 * 60000));
                    }

                    if (istStart) where.date.gte = istStart;
                    if (istEnd) where.date.lte = istEnd;
                }
            }

            // Category Filtering
            if (category && category !== 'ALL') {
                where.category = category;
            }

            // Status Filtering
            if (status && status !== 'ALL') {
                where.status = status === 'PENDING' ? 'SUBMITTED' : status;
            }

            const reports = await prisma.workReport.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            user: {
                                select: { email: true, role: true, name: true }
                            }
                        }
                    },
                    comments: {
                        include: {
                            author: {
                                select: { email: true, name: true }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: { date: 'desc' },
                take: 100
            });

            // Instant rule-based digest for list views (Review Inbox, report history) so a
            // manager can scan without opening every report's full content. Free, synchronous —
            // the optional AI-enhanced version is a separate on-demand endpoint (see [id]/ai-summary).
            let reportsWithSummary: any[] = reports.map((r) => ({ ...r, summary: summarizeWorkReport(r) }));

            // Task suggester (validation queue only): flag SCALED task quantities that are way
            // out of line with the employee's own history, so a manager can tell at a glance
            // which tasks deserve a closer look. Only worth the extra queries for the actual
            // validation queue, not every report-list view.
            if (where.status === 'SUBMITTED') {
                reportsWithSummary = await annotateTaskQuantitySuggestions(reportsWithSummary);
            }

            return NextResponse.json(reportsWithSummary);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) throw new ValidationError('Company membership is required to submit work reports');

            const body = await req.json();

            let profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });

            if (!profile) {
                profile = await prisma.employeeProfile.create({
                    data: { userId: user.id }
                });
            }

            // Safe Parsing
            const parseSafely = (val: unknown) => {
                const num = typeof val === 'string' ? parseFloat(val) : (typeof val === 'number' ? val : NaN);
                return isNaN(num) ? 0 : num;
            };

            const { base: reportDateStr, start: startOfDay, end: endOfDay } = getISTDateRange(body.date);
            const reportDate = startOfDay;
            const submissionGuardKey = `${profile.id}:${reportDateStr}`;
            const idempotencyKey = (req.headers.get('x-idempotency-key') || '').trim();

            pruneInMemoryGuards();

            if (idempotencyKey) {
                const cacheKey = `${user.id}:${idempotencyKey}`;
                const replay = idempotencyReplayCache.get(cacheKey);
                if (replay && Date.now() - replay.createdAt <= IDEMPOTENCY_TTL_MS) {
                    const cachedReport = await prisma.workReport.findUnique({ where: { id: replay.reportId } });
                    if (cachedReport) {
                        return NextResponse.json({ ...cachedReport, idempotentReplay: true }, { status: 200 });
                    }
                    idempotencyReplayCache.delete(cacheKey);
                }
            }

            const previousAttempt = recentSubmissionAttempts.get(submissionGuardKey);
            const nowMs = Date.now();
            if (previousAttempt && nowMs - previousAttempt.lastAttemptAt < SUBMISSION_COOLDOWN_MS) {
                return NextResponse.json({
                    error: 'TOO_MANY_REQUESTS',
                    message: 'Please wait a few seconds before submitting again.',
                    retryAfterMs: SUBMISSION_COOLDOWN_MS - (nowMs - previousAttempt.lastAttemptAt)
                }, { status: 429 });
            }
            recentSubmissionAttempts.set(submissionGuardKey, {
                lastAttemptAt: nowMs,
                lastBlockedAt: previousAttempt?.lastBlockedAt ?? 0,
            });

            // Check if report already exists for this day
            const existingReport = await prisma.workReport.findFirst({
                where: {
                    employeeId: profile.id,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            if (existingReport) {
                if (idempotencyKey) {
                    idempotencyReplayCache.set(`${user.id}:${idempotencyKey}`, {
                        reportId: existingReport.id,
                        createdAt: Date.now(),
                    });
                    return NextResponse.json({ ...existingReport, idempotentReplay: true }, { status: 200 });
                }

                return NextResponse.json({
                    error: 'DUPLICATE_REPORT',
                    message: 'A work report already exists for this date. Please edit the existing report instead.',
                    reportId: existingReport.id
                }, { status: 400 });
            }

            // Time & Status Gates for Work Report Submission
            // 1. Admin Override
            const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
            if (isAdmin && body.adminOverride) {
                logger.info(`Admin override employed for work report submission`, { adminId: user.id, employeeId: profile.id, reportDate });
            } else {
                // Determine current local time strictly in IST
                const now = new Date();
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Kolkata',
                    hour12: false,
                    hour: 'numeric',
                    minute: 'numeric'
                });
                const parts = formatter.formatToParts(now);
                let currentHour = 0, currentMinute = 0;
                for (const p of parts) {
                    if (p.type === 'hour') currentHour = parseInt(p.value, 10);
                    if (p.type === 'minute') currentMinute = parseInt(p.value, 10);
                }
                if (currentHour === 24) currentHour = 0;

                const reportWeekday = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Kolkata',
                    weekday: 'short'
                }).format(reportDate);
                const isCurrentWeekend = reportWeekday === 'Sat' || reportWeekday === 'Sun';
                const isAfter530PM = currentHour > 17 || (currentHour === 17 && currentMinute >= 30);
                
                // Ensure attendance for the reported date is checked
                const attendanceRecord = await prisma.attendance.findFirst({
                    where: {
                        employeeId: profile.id,
                        date: { gte: startOfDay, lte: endOfDay }
                    }
                });
                const hasCheckedOut = !!attendanceRecord?.checkOut;

                let allowed = false;
                let rejectReason = '';

                if (isCurrentWeekend) {
                    if (!hasCheckedOut) {
                        rejectReason = 'Submissions on weekends/holidays are only allowed if you have checked out for the reported day.';
                    } else {
                        allowed = true;
                    }
                } else {
                    if (isAfter530PM || hasCheckedOut) {
                        allowed = true;
                    } else {
                        rejectReason = 'Submissions are only allowed after 5:30 PM IST or after you have successfully checked out for the day.';
                    }
                }

                if (!allowed) {
                    recentSubmissionAttempts.set(submissionGuardKey, {
                        lastAttemptAt: nowMs,
                        lastBlockedAt: Date.now(),
                    });
                    logger.warn(`Work report submission blocked`, { 
                        employeeId: profile.id, 
                        isCurrentWeekend,
                        isAfter530PM,
                        hasCheckedOut,
                        istHour: currentHour,
                        istMinute: currentMinute,
                        reportDate: reportDateStr,
                        reason: rejectReason 
                    });

                    const blockedRetryAfterMs = previousAttempt?.lastBlockedAt && (Date.now() - previousAttempt.lastBlockedAt < BLOCKED_SUBMISSION_COOLDOWN_MS)
                        ? BLOCKED_SUBMISSION_COOLDOWN_MS - (Date.now() - previousAttempt.lastBlockedAt)
                        : BLOCKED_SUBMISSION_COOLDOWN_MS;

                    return NextResponse.json({
                        error: 'VALIDATION_ERROR',
                        message: rejectReason,
                        retryAfterMs: blockedRetryAfterMs
                    }, { status: 429 });
                }
                
                logger.info(`Work report submission passed gate`, { employeeId: profile.id, hasCheckedOut, isAfter530PM });
            }

            // Trace performance against JD/KRA and generate alerts
            let kraMatchRatio = 1.0;
            if (profile.kra && body.content) {
                const kraKeywords = profile.kra.toLowerCase().split(/[,\s\n\.]+/).filter((k: string) => k.length > 3);
                const reportContent = (body.content + ' ' + (body.title || '')).toLowerCase();

                const matchCount = kraKeywords.filter((k: string) => reportContent.includes(k)).length;
                kraMatchRatio = matchCount / (kraKeywords.length || 1);

                if (kraMatchRatio < 0.2 && body.content.length > 50) {
                    await prisma.notification.create({
                        data: {
                            userId: user.id,
                            title: 'KRA Alignment Alert',
                            message: 'Today\'s work report shows low keywords alignment with your defined KRA.',
                            type: 'WARNING'
                        }
                    });
                }
            }

            // Sync Production Work
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const prodLogs = await prisma.auditLog.findMany({
                where: {
                    userId: user.id,
                    createdAt: { gte: todayStart },
                    entity: { in: ['journal', 'journal_issue', 'article_apc', 'article'] }
                }
            });

            if (prodLogs.length > 0) {
                const articlesCount = prodLogs.filter(l => l.entity === 'article' || l.entity === 'article_apc').length;
                const issuesCount = prodLogs.filter(l => l.entity === 'journal_issue').length;
                const publicationSummary = `\n\n[Auto-Synced Publication Activity]\n- Processed ${articlesCount} manuscripts/APCs\n- Managed ${issuesCount} journal issues`;

                if (body.content && !body.content.includes('[Auto-Synced')) {
                    body.content += publicationSummary;
                }
                body.tasksCompleted = (parseInt(body.tasksCompleted) || 0) + prodLogs.length;
            }

            // Auto-calculate Hours Spent from Attendance if not provided
            let hoursSpent = parseSafely(body.hoursSpent);
            // reportDate is already declared above

            if (hoursSpent === 0) {
                const attendance = await prisma.attendance.findFirst({
                    where: {
                        employeeId: profile.id,
                        date: { gte: startOfDay, lte: endOfDay }
                    }
                });

                if (attendance?.checkIn && attendance?.checkOut) {
                    const diffMs = (new Date(attendance.checkOut).getTime() - new Date(attendance.checkIn).getTime());
                    hoursSpent = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
                }
            }

            // Gamified Task Points Calculation with Enhanced Validation
            let pointsEarned = 0;
            let tasksSnapshot = null;
            let tasksCompletedCount = parseInt(body.tasksCompleted) || 0;
            const taskQuantities = body.taskQuantities || {};
            const validationErrors: string[] = [];

            if (body.completedTaskIds && Array.isArray(body.completedTaskIds) && body.completedTaskIds.length > 0) {
                const templates = await prisma.employeeTaskTemplate.findMany({
                    where: { id: { in: body.completedTaskIds } }
                });

                // Validate each task
                tasksSnapshot = templates.map((t: any) => {
                    let pts = t.points;
                    let quantity = 1;
                    let isValid = true;
                    let validationMessage = '';

                    if (t.calculationType === 'SCALED') {
                        quantity = taskQuantities[t.id] || 0;

                        // Validation: Check if quantity is provided
                        if (quantity === 0) {
                            isValid = false;
                            validationMessage = `Task "${t.title}": Quantity must be greater than 0`;
                            validationErrors.push(validationMessage);
                            pts = 0;
                        }
                        // Validation: Check minimum threshold
                        else if (t.minThreshold && quantity < t.minThreshold) {
                            isValid = false;
                            validationMessage = `Task "${t.title}": Minimum ${t.minThreshold} units required, got ${quantity}`;
                            validationErrors.push(validationMessage);
                            pts = 0;
                        } else {
                            // Apply maximum cap if exists
                            const effQuantity = (t.maxThreshold && quantity > t.maxThreshold) ? t.maxThreshold : quantity;
                            pts = effQuantity * (t.pointsPerUnit || 0);

                            // Log if max threshold was applied
                            if (t.maxThreshold && quantity > t.maxThreshold) {
                                validationMessage = `Capped at ${t.maxThreshold} units (max threshold)`;
                            }
                        }
                    } else {
                        // Flat tasks are always valid when selected
                        isValid = true;
                    }

                    return {
                        id: t.id,
                        title: t.title,
                        points: pts,
                        quantity,
                        calculationType: t.calculationType,
                        isValid,
                        validationMessage: validationMessage || undefined
                    };
                });

                // If there are validation errors, reject the submission
                if (validationErrors.length > 0) {
                    return NextResponse.json({
                        error: 'Task validation failed',
                        details: validationErrors,
                        message: validationErrors.join('; ')
                    }, { status: 400 });
                }

                pointsEarned = tasksSnapshot.reduce((sum: number, t: any) => sum + t.points, 0);

                // If the user didn't manually type tasks count, use the length of checked items
                if (tasksCompletedCount === 0) {
                    tasksCompletedCount = templates.length;
                }
            }

            const report = await prisma.workReport.create({
                data: {
                    employeeId: profile.id,
                    companyId: user.companyId,
                    title: body.title,
                    content: body.content,
                    hoursSpent: hoursSpent,
                    date: reportDate,
                    status: 'SUBMITTED',
                    category: body.category || 'GENERAL',
                    keyOutcome: body.keyOutcome || null,
                    selfRating: body.selfRating ? parseInt(body.selfRating) || 5 : 5,
                    revenueGenerated: parseSafely(body.revenueGenerated),
                    tasksCompleted: tasksCompletedCount,
                    ticketsResolved: parseInt(body.ticketsResolved) || 0,
                    chatsHandled: parseInt(body.chatsHandled) || 0,
                    followUpsCompleted: parseInt(body.followUpsCompleted) || 0,
                    kraMatchRatio: kraMatchRatio,
                    metrics: body.metrics || null,
                    pointsEarned,
                    tasksSnapshot: tasksSnapshot || undefined
                }
            });

            // Process Revenue Claims if provided
            if (body.revenueClaims && Array.isArray(body.revenueClaims)) {
                for (const claim of body.revenueClaims) {
                    await prisma.revenueClaim.create({
                        data: {
                            revenueTransactionId: claim.transactionId,
                            employeeId: profile.id,
                            workReportId: report.id,
                            claimAmount: parseSafely(claim.amount),
                            claimReason: claim.reason || `Claim via work report: ${report.title}`,
                            status: 'PENDING'
                        }
                    });
                }
            }

            // Log Points History
            if (pointsEarned > 0) {
                await prisma.employeePointLog.create({
                    data: {
                        employeeId: profile.id,
                        companyId: user.companyId,
                        type: 'WORK_REPORT',
                        points: pointsEarned,
                        date: report.date,
                        reason: `Daily Report: ${report.title}`
                    }
                });
            }

            // Sync Work Agenda Checkpoint Completion Status
            if (body.completedAgendaIds && Array.isArray(body.completedAgendaIds)) {
                const { start: reportDateOnly, end: reportDateEnd } = getISTDateRange(body.date);

                // Mark checked items as COMPLETED
                if (body.completedAgendaIds.length > 0) {
                    await prisma.workPlan.updateMany({
                        where: {
                            id: { in: body.completedAgendaIds },
                            employeeId: profile.id
                        },
                        data: { completionStatus: 'COMPLETED' }
                    });
                }

                // Mark unchecked items (same employee & date) back to PLANNED
                await prisma.workPlan.updateMany({
                    where: {
                        employeeId: profile.id,
                        date: { gte: reportDateOnly, lte: reportDateEnd },
                        id: { notIn: body.completedAgendaIds.length > 0 ? body.completedAgendaIds : ['__none__'] }
                    },
                    data: { completionStatus: 'PLANNED' }
                });
            }

            logger.info('Work report submitted', { reportId: report.id, employeeId: profile.id, pointsEarned });

            // KRA integration (Phase 4): turn reported KRA metric values into validated
            // contributions that roll up into the employee's targets. Defensive — a KRA
            // failure must never block report submission.
            if (Array.isArray(body.kraEntries) && body.kraEntries.length > 0 && user.companyId) {
                try {
                    const entries = body.kraEntries
                        .filter((e: any) => e && e.metricId && Number.isFinite(Number(e.value)))
                        .map((e: any) => ({ metricId: String(e.metricId), value: Number(e.value) }));
                    if (entries.length > 0) {
                        await recordContributions({
                            companyId: user.companyId,
                            employeeId: profile.id,
                            workReportId: report.id,
                            date: report.date,
                            entries,
                        });
                    }
                } catch (kraErr) {
                    logger.error('KRA contribution recording failed (report still saved)', {
                        reportId: report.id, error: kraErr instanceof Error ? kraErr.message : String(kraErr),
                    });
                }
            }

            if (idempotencyKey) {
                idempotencyReplayCache.set(`${user.id}:${idempotencyKey}`, {
                    reportId: report.id,
                    createdAt: Date.now(),
                });
            }

            // Auto-approval (Validate Work Report automation): mirrors the KRA auto-verify
            // pattern — resolve the routine, objectively-checkable case automatically, and
            // leave anything anomalous or unverifiable in the manager's Review Inbox queue.
            // Defensive — a failure here must never block report submission.
            let responseReport = report;
            try {
                const decision = await evaluateWorkReportForAutoApproval({
                    id: report.id,
                    employeeId: profile.id,
                    companyId: user.companyId ?? null,
                    date: report.date,
                    hoursSpent: report.hoursSpent,
                    revenueGenerated: report.revenueGenerated,
                    pointsEarned: report.pointsEarned,
                    kraMatchRatio: report.kraMatchRatio,
                });
                if (decision.approve) {
                    const allTaskIds = ((report.tasksSnapshot as any[]) || []).map((t: any) => t.id);
                    responseReport = await approveWorkReport({
                        existing: report,
                        status: 'APPROVED',
                        managerComment: decision.managerComment,
                        managerRating: decision.managerRating,
                        approvedTaskIds: allTaskIds,
                        rejectedTaskIds: [],
                        evaluation: decision.evaluation,
                        allowMandatoryOverride: false,
                        companyId: user.companyId,
                    });
                    logger.info('Work report auto-approved', { reportId: report.id, employeeId: profile.id });
                } else {
                    logger.info('Work report left for manual review', { reportId: report.id, reason: decision.reason });
                }
            } catch (autoApproveErr) {
                logger.error('Work report auto-approval check failed (left for manual review)', {
                    reportId: report.id,
                    error: autoApproveErr instanceof Error ? autoApproveErr.message : String(autoApproveErr),
                });
            }

            return NextResponse.json(responseReport);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const PUT = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, ...updateData } = body;

            const existing = await prisma.workReport.findUnique({
                where: { id },
                include: { employee: true }
            });

            if (!existing) throw new NotFoundError('Work report');

            // Access Control: Admin/Manager OR the employee themselves if status is SUBMITTED
            const isOwner = existing.employee.userId === user.id;
            const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isManager && !isOwner) throw new AuthorizationError('You are not authorized to edit this report');

            if (isOwner && !isManager) {
                // Employees may keep editing their own report until a manager
                // reviews it. Once the status leaves SUBMITTED (reviewed/approved/
                // flagged) it locks. The report can be from any day — the review
                // gate, not the calendar day, is what freezes it.
                if (existing.status !== 'SUBMITTED') {
                    throw new ValidationError('Cannot modify a report after it has been reviewed or approved');
                }
            }

            const updated = await prisma.workReport.update({
                where: { id },
                data: {
                    title: updateData.title,
                    content: updateData.content,
                    category: updateData.category,
                    keyOutcome: updateData.keyOutcome,
                    hoursSpent: typeof updateData.hoursSpent === 'number' ? updateData.hoursSpent : undefined,
                    revenueGenerated: typeof updateData.revenueGenerated === 'number' ? updateData.revenueGenerated : undefined,
                    tasksCompleted: typeof updateData.tasksCompleted === 'number' ? updateData.tasksCompleted : undefined,
                    ticketsResolved: typeof updateData.ticketsResolved === 'number' ? updateData.ticketsResolved : undefined,
                    chatsHandled: typeof updateData.chatsHandled === 'number' ? updateData.chatsHandled : undefined,
                    followUpsCompleted: typeof updateData.followUpsCompleted === 'number' ? updateData.followUpsCompleted : undefined,
                    selfRating: typeof updateData.selfRating === 'number' ? updateData.selfRating : undefined,
                }
            });

            // Sync Work Agenda Checkpoint Completion Status on Edit
            if (updateData.completedAgendaIds && Array.isArray(updateData.completedAgendaIds)) {
                const reportIstDate = getISTDateString(new Date(existing.date));
                const { start: reportDateOnly, end: reportDateEnd } = getISTDateRange(reportIstDate);

                if (updateData.completedAgendaIds.length > 0) {
                    await prisma.workPlan.updateMany({
                        where: {
                            id: { in: updateData.completedAgendaIds },
                            employeeId: existing.employeeId
                        },
                        data: { completionStatus: 'COMPLETED' }
                    });
                }

                await prisma.workPlan.updateMany({
                    where: {
                        employeeId: existing.employeeId,
                        date: { gte: reportDateOnly, lte: reportDateEnd },
                        id: { notIn: updateData.completedAgendaIds.length > 0 ? updateData.completedAgendaIds : ['__none__'] }
                    },
                    data: { completionStatus: 'PLANNED' }
                });
            }

            logger.info('Work report updated', { reportId: updated.id, updatedBy: user.id });

            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { id, status, managerComment, managerRating, approvedTaskIds, rejectedTaskIds, evaluation, allowMandatoryOverride } = await req.json();

            const existing = await prisma.workReport.findUnique({
                where: { id },
                include: { employee: true }
            });

            if (!existing) throw new NotFoundError('Work report');

            // Access Control: Manager/TL can only review their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(existing.employee.userId)) {
                    throw new AuthorizationError('Forbidden: This employee is not in your team');
                }
            }

            const updated = await approveWorkReport({
                existing,
                status,
                managerComment,
                managerRating,
                approvedTaskIds,
                rejectedTaskIds,
                evaluation,
                allowMandatoryOverride,
                companyId: user.companyId,
            });

            logger.info('Work report reviewed', { reportId: updated.id, status, reviewedBy: user.id });

            return NextResponse.json(updated);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
