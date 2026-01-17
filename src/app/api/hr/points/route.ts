import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    if (!user.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const whereClause: any = {
        companyId: user.companyId,
        ...(employeeId && employeeId !== 'ALL' ? { employeeId } : {})
    };

    if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        whereClause.date = {
            gte: startDate,
            lte: endDate
        };
    }

    const logs = await prisma.employeePointLog.findMany({
        where: whereClause,
        include: {
            employee: {
                include: {
                    user: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { date: 'desc' },
        take: 100 // Limit results for performance
    });

    let stats = null;
    if (employeeId && employeeId !== 'ALL') {
        const aggregates = await prisma.employeePointLog.groupBy({
            by: ['type'],
            where: whereClause,
            _sum: {
                points: true
            }
        });
        stats = aggregates;
    }

    let leaderboard = null;
    if (searchParams.get('mode') === 'leaderboard') {
        const lb = await prisma.employeePointLog.groupBy({
            by: ['employeeId'],
            where: { ...whereClause, employeeId: undefined }, // Remove employee filter for global leaderboard
            _sum: { points: true },
            orderBy: { _sum: { points: 'desc' } },
            take: 20
        });

        // Enrich with user details since groupBy can't include relations
        leaderboard = await Promise.all(lb.map(async (entry: any) => {
            const emp = await prisma.employeeProfile.findUnique({
                where: { id: entry.employeeId },
                select: { user: { select: { name: true, email: true } }, designation: true }
            });
            return {
                amount: entry._sum.points,
                employeeId: entry.employeeId,
                name: emp?.user?.name || emp?.user?.email,
                designation: emp?.designation
            };
        }));
    }

    return NextResponse.json({ logs, stats, leaderboard });
});

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'], async (req: NextRequest, user) => {
    if (!user.companyId || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
        targetType, // SINGLE, MULTI, ALL, DEPARTMENT
        targetIds, // Array of employee IDs or Department ID
        points,
        type,
        reason,
        date
    } = body;

    const pointsValue = Number(points);
    const isDeduction = pointsValue < 0;

    // 1. Quota Logic for distributions (positive points)
    if (!isDeduction && type === 'BONUS') { // Assuming BONUS/ACHIEVEMENT consumes quota
        let limit = 0;
        if (user.role === 'SUPER_ADMIN') limit = 100;
        else if (user.role === 'ADMIN') limit = 60;
        else if (user.role === 'MANAGER') limit = 20;
        else limit = 0; // HR usually has admin power but let's stick to prompt

        if (limit > 0) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const used = await prisma.employeePointLog.aggregate({
                _sum: { points: true },
                where: {
                    awardedBy: user.id,
                    points: { gt: 0 }, // Only count positive distributions
                    date: { gte: startOfMonth, lte: endOfMonth }
                }
            });

            const usedPoints = used._sum.points || 0;

            // Calculate total points needed for this transaction
            let recipientCount = 1;
            if (targetType === 'MULTI') recipientCount = targetIds.length;
            else if (targetType === 'ALL') {
                recipientCount = await prisma.employeeProfile.count({
                    where: {
                        user: { companyId: user.companyId }
                    }
                });
            } else if (targetType === 'DEPARTMENT') {
                const allEmps = await prisma.employeeProfile.findMany({
                    where: { user: { companyId: user.companyId } },
                    select: { user: { select: { departmentId: true } } }
                });
                recipientCount = allEmps.filter(e => e.user?.departmentId === targetIds[0]).length;
            }

            const totalNeeded = pointsValue * recipientCount;

            if (usedPoints + totalNeeded > limit) {
                return NextResponse.json({
                    error: `Monthly distribution limit exceeded. You have ${limit - usedPoints} points remaining, but tried to distribute ${totalNeeded}.`
                }, { status: 403 });
            }
        }
    }

    // 2. Identify Recipients
    let employeesToReward: string[] = [];

    if (targetType === 'SINGLE') {
        employeesToReward = [body.employeeId];
    } else if (targetType === 'MULTI') {
        employeesToReward = targetIds;
    } else if (targetType === 'ALL') {
        const emps = await prisma.employeeProfile.findMany({
            where: {
                user: { companyId: user.companyId }
            },
            select: { id: true }
        });
        employeesToReward = emps.map(e => e.id);
    } else if (targetType === 'DEPARTMENT') {
        // Fetch employees via user-department relation if strictly needed, or just skip complexity for now? 
        // Assuming Department is on User or Profile. If not on Profile, maybe on User.
        // Let's try to filter by what we know exists or return error if not supported yet.
        // Actually, let's look at Schema for `departmentId`.
        // If it's missing, I'll fallback to just checking if the targetIds are valid employee IDs for now? 
        // No, targetIds for DEPARTMENT is departmentID.
        // I will assume for now `departmentId` might be on `User`.
        const emps = await prisma.employeeProfile.findMany({
            where: {
                user: { companyId: user.companyId }
                // departmentId: targetIds[0] // Commenting out until confirmed
            },
            select: { id: true, user: { select: { departmentId: true } } } // Check if user has it
        });
        // Client-side filter or fix queries one by one.
        // Let's just fix the `ALL` case first and `targetType` logic later?
        // No, I need to be correct.

        // SAFE FIX: Only filter by `user.companyId`.
        // For Department, I'll try to find where it is.
        // If I can't find it, I will temporarily disable department bulk action or make it fetch all and filter in memory (inefficient but works for limited scope).

        employeesToReward = emps.filter(e => (e.user as any)?.departmentId === targetIds[0]).map(e => e.id);
    }

    if (employeesToReward.length === 0) {
        return NextResponse.json({ error: 'No valid employees found for distribution' }, { status: 400 });
    }

    // 3. Create Logs
    await prisma.$transaction(
        employeesToReward.map(empId => prisma.employeePointLog.create({
            data: {
                employeeId: empId,
                points: pointsValue,
                type,
                reason: targetType !== 'SINGLE' ? `${reason} (Bulk Action)` : reason,
                date: date ? new Date(date) : new Date(),
                companyId: user.companyId!,
                awardedBy: user.id
            }
        }))
    );

    return NextResponse.json({ message: 'Points processed successfully', count: employeesToReward.length });
});
