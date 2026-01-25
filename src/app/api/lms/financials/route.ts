
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Fetch all LMS items with necessary fields
        const [courses, workshops, internships] = await Promise.all([
            prisma.course.findMany({
                select: {
                    id: true,
                    title: true,
                    mentorId: true,
                    totalRevenue: true,
                    emailCount: true,
                    mentorReward: true,
                    // type: true, // Course does not have a type field
                    mentor: { select: { name: true, email: true } }
                }
            }),
            prisma.workshop.findMany({
                select: {
                    id: true,
                    title: true,
                    mentorId: true,
                    totalRevenue: true, // Assuming aggregated revenue fits schema
                    emailCount: true,
                    mentorReward: true,
                    mentor: { select: { name: true, email: true } },
                    price: true
                }
            }),
            prisma.internship.findMany({
                select: {
                    id: true,
                    title: true,
                    mentorId: true,
                    totalRevenue: true, // aggregated or calculated
                    emailCount: true,
                    mentorReward: true,
                    mentor: { select: { name: true, email: true } },
                    price: true
                }
            })
        ]);

        const EMAIL_CHARGE_PER_1000 = 1;

        const processItem = (item: any, category: string) => {
            const revenue = item.totalRevenue || 0; // Or item.price * enrollments if not pre-aggregated
            const emailCount = item.emailCount || 0;
            const emailCharge = Math.ceil(emailCount / 1000) * EMAIL_CHARGE_PER_1000;
            const mentorCut = item.mentorReward || 0;

            // Platform Expense Logic: Max(40% of Revenue, 30000)
            const platformExpense = Math.max(revenue * 0.40, 30000);

            const finalRevenue = revenue - emailCharge - mentorCut - platformExpense;

            return {
                id: item.id,
                productName: item.title,
                type: category, // Course, Workshop, Internship
                mentorName: item.mentor?.name || 'Unassigned',
                mentorEmail: item.mentor?.email || '-',
                totalRevenue: revenue,
                totalSentMail: emailCount,
                mentorCut,
                emailCharge,
                platformExpense,
                finalRevenue
            };
        };

        const data = [
            ...courses.map(i => processItem(i, 'Course')),
            ...workshops.map(i => processItem(i, 'Workshop')),
            ...internships.map(i => processItem(i, 'Internship'))
        ];

        return NextResponse.json(data);

    } catch (error) {
        console.error('LMS Financials Error:', error);
        return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }
}
