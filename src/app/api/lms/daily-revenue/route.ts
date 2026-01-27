import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// GET - Fetch daily revenue entries with filters
export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // COURSE, WORKSHOP, INTERNSHIP
        const referenceId = searchParams.get('referenceId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {};

        if (type) where.type = type;
        if (referenceId) where.referenceId = referenceId;

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const entries = await prisma.lMSDailyRevenue.findMany({
            where,
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(entries);
    } catch (error: any) {
        console.error('Daily Revenue GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST - Create new daily revenue entry
export const POST = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { date, type, referenceId, amount, enrollments, notes } = body;

        if (!type || !referenceId || amount === undefined) {
            return NextResponse.json({ error: 'Missing required fields: type, referenceId, amount' }, { status: 400 });
        }

        // Validate type
        if (!['COURSE', 'WORKSHOP', 'INTERNSHIP'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type. Must be COURSE, WORKSHOP, or INTERNSHIP' }, { status: 400 });
        }

        const entry = await prisma.lMSDailyRevenue.create({
            data: {
                date: date ? new Date(date) : new Date(),
                type,
                referenceId,
                amount: parseFloat(amount),
                enrollments: parseInt(enrollments) || 0,
                notes
            }
        });

        // Update total revenue on the product
        const totalRevenue = await prisma.lMSDailyRevenue.aggregate({
            where: { type, referenceId },
            _sum: { amount: true }
        });

        const newTotal = totalRevenue._sum.amount || 0;

        // Update the corresponding product model
        if (type === 'COURSE') {
            await prisma.course.update({
                where: { id: referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (type === 'WORKSHOP') {
            await prisma.workshop.update({
                where: { id: referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (type === 'INTERNSHIP') {
            await prisma.internship.update({
                where: { id: referenceId },
                data: { totalRevenue: newTotal }
            });
        }

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error('Daily Revenue POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT - Update daily revenue entry
export const PUT = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { id, date, amount, enrollments, notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 });
        }

        const entry = await prisma.lMSDailyRevenue.update({
            where: { id },
            data: {
                ...(date && { date: new Date(date) }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(enrollments !== undefined && { enrollments: parseInt(enrollments) }),
                ...(notes !== undefined && { notes })
            }
        });

        // Recalculate total revenue
        const totalRevenue = await prisma.lMSDailyRevenue.aggregate({
            where: { type: entry.type, referenceId: entry.referenceId },
            _sum: { amount: true }
        });

        const newTotal = totalRevenue._sum.amount || 0;

        // Update the corresponding product model
        if (entry.type === 'COURSE') {
            await prisma.course.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (entry.type === 'WORKSHOP') {
            await prisma.workshop.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (entry.type === 'INTERNSHIP') {
            await prisma.internship.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        }

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error('Daily Revenue PUT Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// DELETE - Delete daily revenue entry
export const DELETE = authorizedRoute(['ADMIN', 'SUPER_ADMIN'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 });
        }

        const entry = await prisma.lMSDailyRevenue.findUnique({ where: { id } });
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        await prisma.lMSDailyRevenue.delete({ where: { id } });

        // Recalculate total revenue
        const totalRevenue = await prisma.lMSDailyRevenue.aggregate({
            where: { type: entry.type, referenceId: entry.referenceId },
            _sum: { amount: true }
        });

        const newTotal = totalRevenue._sum.amount || 0;

        // Update the corresponding product model
        if (entry.type === 'COURSE') {
            await prisma.course.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (entry.type === 'WORKSHOP') {
            await prisma.workshop.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        } else if (entry.type === 'INTERNSHIP') {
            await prisma.internship.update({
                where: { id: entry.referenceId },
                data: { totalRevenue: newTotal }
            });
        }

        return NextResponse.json({ message: 'Entry deleted successfully' });
    } catch (error: any) {
        console.error('Daily Revenue DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
