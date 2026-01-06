import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Company association required' }, { status: 403 });
        }

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId) return NextResponse.json({ error: 'Members of companies only' }, { status: 403 });

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
                followUpsCompleted: parseInt(body.followUpsCompleted) || 0
            }
        });

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
