import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');
        const employeeId = searchParams.get('employeeId');

        const where: any = { isActive: true };
        if (customerId) where.customerId = customerId;
        if (employeeId) where.employeeId = employeeId;

        const assignments = await prisma.customerAssignment.findMany({
            where,
            include: {
                customer: {
                    include: {
                        user: { select: { email: true } },
                        institution: { select: { name: true, code: true } }
                    }
                },
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        employeeProfile: {
                            select: {
                                designation: true
                            }
                        }
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        return NextResponse.json(assignments);
    } catch (error: any) {
        console.error('Customer Assignments API Error:', error);
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
        const { customerId, employeeId, role, notes } = body;

        if (!customerId || !employeeId) {
            return NextResponse.json({ error: 'Customer ID and Employee ID required' }, { status: 400 });
        }

        const assignment = await prisma.customerAssignment.create({
            data: {
                customerId,
                employeeId,
                role,
                notes,
                assignedBy: user.id
            },
            include: {
                customer: {
                    include: {
                        user: { select: { email: true } }
                    }
                },
                employee: {
                    select: {
                        email: true,
                        role: true
                    }
                }
            }
        });

        return NextResponse.json(assignment, { status: 201 });
    } catch (error: any) {
        console.error('Create Assignment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Assignment ID required' }, { status: 400 });
        }

        await prisma.customerAssignment.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Assignment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
