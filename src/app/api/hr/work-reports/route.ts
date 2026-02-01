import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';


export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const category = searchParams.get('category');
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
            if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
                if (targetEmployeeId && targetEmployeeId !== 'all') {
                    where.employeeId = targetEmployeeId;
                }
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, null); // Cross-company
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
            if (startDate || endDate) {
                where.date = {};
                if (startDate) where.date.gte = new Date(startDate);
                if (endDate) where.date.lte = new Date(endDate);
            }

            // Category Filtering
            if (category && category !== 'ALL') {
                where.category = category;
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

            return NextResponse.json(reports);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Members of companies only', 403);

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

            const reportDate = body.date ? new Date(body.date) : new Date();
            const startOfDay = new Date(reportDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(reportDate);
            endOfDay.setHours(23, 59, 59, 999);

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
                return NextResponse.json({
                    error: 'DUPLICATE_REPORT',
                    message: 'A work report already exists for this date. Please edit the existing report instead.',
                    reportId: existingReport.id
                }, { status: 400 });
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
                        date: {
                            gte: new Date(reportDate.setHours(0, 0, 0, 0)),
                            lte: new Date(reportDate.setHours(23, 59, 59, 999))
                        }
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
                    date: body.date ? new Date(body.date) : new Date(),
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

            return NextResponse.json(report);
        } catch (error) {
            return createErrorResponse(error);
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

            if (!existing) return createErrorResponse('Report not found', 404);

            // Access Control: Admin/Manager OR the employee themselves if status is SUBMITTED
            const isOwner = existing.employee.userId === user.id;
            const isManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);

            if (!isManager && !isOwner) return createErrorResponse('Unauthorized', 403);

            if (isOwner && !isManager) {
                if (existing.status !== 'SUBMITTED') {
                    return createErrorResponse('Cannot modify after review/approval', 400);
                }

                // Check if editing on the same day as the report date
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const reportDate = new Date(existing.date);
                reportDate.setHours(0, 0, 0, 0);

                if (today.getTime() !== reportDate.getTime()) {
                    return createErrorResponse('Work reports can only be edited on the same day they were submitted.', 400);
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

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { id, status, managerComment, managerRating, approvedTaskIds, rejectedTaskIds, evaluation } = await req.json();

            const existing = await prisma.workReport.findUnique({
                where: { id },
                include: { employee: true }
            });

            if (!existing) return createErrorResponse('Report not found', 404);

            // Access Control: Manager/TL can only review their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(existing.employee.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            // Calculate approved points based on task-level approval
            let finalPointsEarned = existing.pointsEarned || 0;
            let updatedTasksSnapshot = existing.tasksSnapshot;

            if (approvedTaskIds && Array.isArray(approvedTaskIds) && existing.tasksSnapshot) {
                // Update task snapshot with approval status
                updatedTasksSnapshot = (existing.tasksSnapshot as any[]).map((task: any) => ({
                    ...task,
                    isApproved: approvedTaskIds.includes(task.id),
                    isRejected: rejectedTaskIds?.includes(task.id) || false
                }));

                // Recalculate points based on approved tasks only
                finalPointsEarned = updatedTasksSnapshot
                    .filter((task: any) => approvedTaskIds.includes(task.id))
                    .reduce((sum: number, task: any) => sum + (task.points || 0), 0);
            }

            if (status === 'APPROVED' && existing.status !== 'APPROVED') {
                // Award Points for approved tasks only
                if (finalPointsEarned && finalPointsEarned > 0) {
                    await prisma.employeePointLog.create({
                        data: {
                            employeeId: existing.employeeId,
                            companyId: user.companyId!,
                            type: 'WORK_REPORT',
                            points: finalPointsEarned,
                            date: new Date(),
                            reason: `Work Report Approved: ${existing.title} (${approvedTaskIds?.length || 0} tasks approved)`
                        }
                    });
                }
            }

            const updated = await prisma.workReport.update({
                where: { id },
                data: {
                    status,
                    managerComment,
                    pointsEarned: finalPointsEarned,
                    tasksSnapshot: updatedTasksSnapshot,
                    ...(managerRating && { managerRating: parseInt(managerRating) }),
                    evaluation
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
