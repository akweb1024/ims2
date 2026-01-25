
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        const internships = await prisma.internship.findMany({
            where: {
                title: { contains: search, mode: 'insensitive' },
            },
            include: {
                mentor: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { applications: true }
                }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(internships);
    } catch (error) {
        console.error('Error fetching internships:', error);
        return NextResponse.json({ error: 'Failed to fetch internships' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, startDate, duration, stipend, price, mentorId, mentorReward, type } = body;

        const internship = await prisma.internship.create({
            data: {
                title,
                description,
                startDate: new Date(startDate),
                duration,
                stipend: parseFloat(stipend || '0'),
                price: parseFloat(price || '0'),
                mentorId,
                mentorReward: parseFloat(mentorReward || '0'),
                type: type || 'REMOTE'
            }
        });

        return NextResponse.json(internship);
    } catch (error) {
        console.error('Error creating internship:', error);
        return NextResponse.json({ error: 'Failed to create internship' }, { status: 500 });
    }
}
