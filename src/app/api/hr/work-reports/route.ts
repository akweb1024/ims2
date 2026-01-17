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
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                // Can see own + downline
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
                                select: { email: true, role: true }
                            }
                        }
                    },
                    comments: {
                        include: {
                            author: {
                                select: { email: true }
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
            const reportDate = body.date ? new Date(body.date) : new Date();

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

            // Gamified Task Points Calculation
            let pointsEarned = 0;
            let tasksSnapshot = null;
            let tasksCompletedCount = parseInt(body.tasksCompleted) || 0;
            const taskQuantities = body.taskQuantities || {};

            if (body.completedTaskIds && Array.isArray(body.completedTaskIds) && body.completedTaskIds.length > 0) {
                const templates = await prisma.employeeTaskTemplate.findMany({
                    where: { id: { in: body.completedTaskIds } }
                });

                tasksSnapshot = templates.map((t: any) => {
                    let pts = t.points;
                    let quantity = 1;

                    if (t.calculationType === 'SCALED') {
                        quantity = taskQuantities[t.id] || 0;
                        if (t.minThreshold && quantity < t.minThreshold) {
                            pts = 0;
                        } else {
                            const effQuantity = (t.maxThreshold && quantity > t.maxThreshold) ? t.maxThreshold : quantity;
                            pts = effQuantity * (t.pointsPerUnit || 0);
                        }
                    }

                    return {
                        id: t.id,
                        title: t.title,
                        points: pts,
                        quantity,
                        calculationType: t.calculationType
                    };
                });

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
            if (isOwner && existing.status !== 'SUBMITTED' && !isManager) {
                return createErrorResponse('Cannot modify after review/approval', 400);
            }

            // If owner, check if it's the same day (REMOVED - Allow edit if SUBMITTED)
            if (isOwner && !isManager && existing.status !== 'SUBMITTED') {
                return createErrorResponse('Cannot modify after review/approval', 400);
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
            const { id, status, managerComment, managerRating } = await req.json();

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

            if (status === 'APPROVED' && existing.status !== 'APPROVED') {
                // Award Points
                if (existing.pointsEarned && existing.pointsEarned > 0) {
                    await prisma.employeePointLog.create({
                        data: {
                            employeeId: existing.employeeId,
                            companyId: user.companyId!,
                            type: 'WORK_REPORT',
                            points: existing.pointsEarned,
                            date: new Date(),
                            reason: `Work Report Approved: ${existing.title}`
                        }
                    });
                }
            }

            const updated = await prisma.workReport.update({
                where: { id },
                data: {
                    status,
                    managerComment,
                    ...(managerRating && { managerRating: parseInt(managerRating) })
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
