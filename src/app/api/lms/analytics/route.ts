
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        // Total Stats
        const courses = await prisma.course.findMany({ select: { totalRevenue: true, emailCount: true, mentorReward: true } });
        const workshops = await prisma.workshop.findMany({ select: { totalRevenue: true, emailCount: true, mentorReward: true } });
        const internships = await prisma.internship.findMany({ select: { totalRevenue: true, emailCount: true, mentorReward: true } });

        const calculateStats = (items: any[]) => ({
            revenue: items.reduce((acc, item) => acc + (item.totalRevenue || 0), 0),
            emailCount: items.reduce((acc, item) => acc + (item.emailCount || 0), 0),
            mentorPayouts: items.reduce((acc, item) => acc + (item.mentorReward || 0), 0), // Note: Need logic for actual payouts vs budgeted
            count: items.length
        });

        const stats = {
            courses: calculateStats(courses),
            workshops: calculateStats(workshops),
            internships: calculateStats(internships),
            total: {
                revenue: 0,
                emailCount: 0,
                mentorPayouts: 0
            }
        };

        stats.total.revenue = stats.courses.revenue + stats.workshops.revenue + stats.internships.revenue;
        stats.total.emailCount = stats.courses.emailCount + stats.workshops.emailCount + stats.internships.emailCount;
        stats.total.mentorPayouts = stats.courses.mentorPayouts + stats.workshops.mentorPayouts + stats.internships.mentorPayouts;

        // Mentor Leaderboard
        const mentors = await prisma.user.findMany({
            where: {
                OR: [
                    { mentoredCourses: { some: {} } },
                    { mentoredWorkshops: { some: {} } },
                    { mentoredInternships: { some: {} } }
                ]
            },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        mentoredCourses: true,
                        mentoredWorkshops: true,
                        mentoredInternships: true
                    }
                }
            },
            take: 5
        });

        return NextResponse.json({ stats, mentors });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
