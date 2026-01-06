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

        // If employeeId is provided, fetch for that employee (for managers)
        // Otherwise, fetch for the current user's profile
        const where: any = {};

        if (employeeId) {
            // Check if manager/admin
            if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            where.employeeId = employeeId;
            // Also ensure the employee belongs to the company context
            if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }
        } else if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            // Managers can see all leaves in their company
            if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }
        } else {
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (!profile) return NextResponse.json([]);
            where.employeeId = profile.id;
        }

        const leaves = await prisma.leaveRequest.findMany({
            where,
            include: {
                approvedBy: {
                    select: { email: true }
                },
                employee: {
                    include: {
                        user: { select: { email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(leaves);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { startDate, endDate, reason, type } = body;

        const profile = await prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
        }

        const leave = await prisma.leaveRequest.create({
            data: {
                employeeId: profile.id,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                type,
                status: 'PENDING'
            }
        });

        return NextResponse.json(leave);
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

        const body = await req.json();
        const { leaveId, status } = body;

        const leave = await prisma.leaveRequest.update({
            where: { id: leaveId },
            data: {
                status,
                approvedById: user.id
            }
        });

        return NextResponse.json(leave);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
