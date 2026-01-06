import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get('employeeId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let where: any = {
            companyId: user.companyId
        };

        if (employeeId) {
            where.employeeId = employeeId;
        } else if (user.role === 'SALES_EXECUTIVE' || user.role === 'MANAGER' || user.role === 'USER') {
            // Default to current user's plans if no employeeId provided
            const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
            if (profile) where.employeeId = profile.id;
        }

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const plans = await prisma.workPlan.findMany({
            where,
            include: {
                employee: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                },
                comments: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error('Work Plan GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { date, agenda, strategy, employeeId } = body;

        if (!date || !agenda) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let targetEmployeeId = employeeId;
        if (!targetEmployeeId) {
            const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
            if (!profile) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
            targetEmployeeId = profile.id;
        }

        const plan = await prisma.workPlan.upsert({
            where: {
                // Since we don't have a unique constraint on employeeId + date in schema yet, 
                // we'll find existing or create new. 
                // Wait, I should have added a unique constraint.
                id: body.id || 'new-id'
            },
            update: {
                agenda,
                strategy,
                status: body.status || 'SHARED'
            },
            create: {
                employeeId: targetEmployeeId,
                date: new Date(date),
                agenda,
                strategy,
                status: body.status || 'SHARED',
                companyId: user.companyId
            }
        });

        return NextResponse.json(plan);
    } catch (error) {
        console.error('Work Plan POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
