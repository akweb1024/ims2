import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');
            const category = searchParams.get('category');

            const where: any = {};

            // Company Isolation
            if (user.companyId) {
                where.companyId = user.companyId;
            }

            // Role-based Access & Filtering
            if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                if (employeeId && employeeId !== 'all') {
                    where.employeeId = employeeId;
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
                    // Low compliance with KRA - Create notification
                    await prisma.notification.create({
                        data: {
                            userId: user.id,
                            title: 'KRA Alignment Alert',
                            message: 'Today\'s work report shows low keywords alignment with your defined KRA. Ensure your tasks contribute to your primary goals.',
                            type: 'WARNING'
                        }
                    });
                }
            }

            const report = await prisma.workReport.create({
                data: {
                    employeeId: profile.id,
                    companyId: user.companyId,
                    title: body.title,
                    content: body.content,
                    hoursSpent: parseSafely(body.hoursSpent),
                    date: body.date ? new Date(body.date) : new Date(),
                    status: 'SUBMITTED',
                    category: body.category || 'GENERAL',
                    keyOutcome: body.keyOutcome || null,
                    selfRating: body.selfRating ? parseInt(body.selfRating) || 5 : 5,
                    revenueGenerated: parseSafely(body.revenueGenerated),
                    tasksCompleted: parseInt(body.tasksCompleted) || 0,
                    ticketsResolved: parseInt(body.ticketsResolved) || 0,
                    chatsHandled: parseInt(body.chatsHandled) || 0,
                    followUpsCompleted: parseInt(body.followUpsCompleted) || 0,
                    kraMatchRatio: kraMatchRatio,
                    metrics: body.metrics || null
                }
            });

            return NextResponse.json(report);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { id, status, managerComment, managerRating } = await req.json();

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
