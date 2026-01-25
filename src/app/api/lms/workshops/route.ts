
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const workshops = await prisma.workshop.findMany({
            where: {
                title: { contains: search, mode: 'insensitive' },
            },
            include: {
                mentor: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { enrollments: true }
                }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(workshops);
    } catch (error) {
        console.error('Error fetching workshops:', error);
        return NextResponse.json({ error: 'Failed to fetch workshops' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, startDate, endDate, price, currency, mentorId, mentorEmail, mentorReward, vehicleType, duration, type } = body;

        let resolvedMentorId = mentorId;
        if (mentorEmail && !mentorId) {
            const mentor = await prisma.user.findUnique({ where: { email: mentorEmail } });
            if (mentor) resolvedMentorId = mentor.id;
        }

        const workshop = await prisma.workshop.create({
            data: {
                title,
                description,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                price: parseFloat(price || '0'),
                currency: currency || 'INR',
                mentorId: resolvedMentorId,
                mentorReward: parseFloat(mentorReward || '0'),
                duration
            }
        });

        return NextResponse.json(workshop);
    } catch (error) {
        console.error('Error creating workshop:', error);
        return NextResponse.json({ error: 'Failed to create workshop' }, { status: 500 });
    }
}
