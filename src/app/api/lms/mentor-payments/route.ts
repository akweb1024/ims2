import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// GET - Fetch mentor payments with filters
export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const mentorId = searchParams.get('mentorId');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const period = searchParams.get('period');

        const where: any = {};
        if (mentorId) where.mentorId = mentorId;
        if (type) where.type = type;
        if (status) where.status = status;
        if (period) where.period = period;

        const payments = await prisma.lMSMentorPayment.findMany({
            where,
            include: {
                mentor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(payments);
    } catch (error: any) {
        console.error('Mentor Payments GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST - Create mentor payment record
export const POST = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { mentorId, type, referenceId, amount, period, notes } = body;

        if (!mentorId || !type || !referenceId || amount === undefined || !period) {
            return NextResponse.json({
                error: 'Missing required fields: mentorId, type, referenceId, amount, period'
            }, { status: 400 });
        }

        // Validate type
        if (!['COURSE', 'WORKSHOP', 'INTERNSHIP'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type. Must be COURSE, WORKSHOP, or INTERNSHIP' }, { status: 400 });
        }

        const payment = await prisma.lMSMentorPayment.create({
            data: {
                mentorId,
                type,
                referenceId,
                amount: parseFloat(amount),
                period,
                status: 'PENDING',
                notes
            },
            include: {
                mentor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json(payment);
    } catch (error: any) {
        console.error('Mentor Payments POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PATCH - Update payment status (mark as paid/cancelled)
export const PATCH = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { id, status, notes } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing required fields: id, status' }, { status: 400 });
        }

        // Validate status
        if (!['PENDING', 'PAID', 'CANCELLED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status. Must be PENDING, PAID, or CANCELLED' }, { status: 400 });
        }

        const payment = await prisma.lMSMentorPayment.update({
            where: { id },
            data: {
                status,
                ...(status === 'PAID' && { paidAt: new Date() }),
                ...(notes !== undefined && { notes })
            },
            include: {
                mentor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json(payment);
    } catch (error: any) {
        console.error('Mentor Payments PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// DELETE - Delete payment record
export const DELETE = authorizedRoute(['ADMIN', 'SUPER_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
        }

        await prisma.lMSMentorPayment.delete({ where: { id } });

        return NextResponse.json({ message: 'Payment record deleted successfully' });
    } catch (error: any) {
        console.error('Mentor Payments DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
