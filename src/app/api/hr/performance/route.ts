import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get('employeeId');
        const showAll = searchParams.get('all') === 'true';

        let where: any = {};

        if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            if (user.role !== 'SUPER_ADMIN') {
                where.employee = { user: { companyId: user.companyId } };
            }
        } else if (employeeId) {
            // Managers checking specific employee
            if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            where.employeeId = employeeId;
        } else {
            // Employees checking their own performance
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (!profile) return NextResponse.json([]);
            where.employeeId = profile.id;
        }

        const reviews = await prisma.performanceReview.findMany({
            where,
            include: {
                reviewer: {
                    select: { email: true, role: true }
                },
                employee: {
                    include: { user: { select: { email: true } } }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(reviews);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { employeeId, rating, feedback } = body;

        const review = await prisma.performanceReview.create({
            data: {
                employeeId,
                reviewerId: user.id,
                rating: parseInt(rating),
                feedback
            }
        });

        return NextResponse.json(review);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
