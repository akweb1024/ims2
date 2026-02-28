import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

// GET all 360 Feedback (Peer Reviews & Anonymous) for a specific employee
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get('employeeId');

        if (!employeeId) return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });

        const [peerReviews, anonymousFeedback] = await Promise.all([
            (prisma as any).peerReview.findMany({
                where: { performanceReview: { employeeId } },
                include: {
                    peer: { select: { id: true, name: true, email: true } },
                    performanceReview: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            (prisma as any).anonymousFeedback.findMany({
                where: { performanceReview: { employeeId } },
                include: { performanceReview: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return NextResponse.json({
            peerReviews,
            anonymousFeedback
        });
    } catch (error) {
        console.error('Error fetching 360 feedback:', error);
        return NextResponse.json({ error: 'Failed to fetch 360 feedback' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getSessionUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { performanceReviewId, type, rating, feedback, category } = body;

        if (!performanceReviewId || !type) {
             return NextResponse.json({ error: 'Missing required feedback fields.' }, { status: 400 });
        }

        // Verify that the performance review exists
        const review = await (prisma as any).performanceReview.findUnique({
            where: { id: performanceReviewId },
            include: { employee: true }
        });

        if (!review) {
             return NextResponse.json({ error: 'Associated Performance Review not found.' }, { status: 404 });
        }

        let result;
        if (type === 'PEER') {
            result = await (prisma as any).peerReview.create({
                data: {
                    performanceReviewId,
                    peerId: user.id, // Current logged in user is the peer
                    rating: parseInt(rating || '0'),
                    feedback
                }
            });
        } else if (type === 'ANONYMOUS') {
            result = await (prisma as any).anonymousFeedback.create({
                data: {
                    performanceReviewId,
                    feedback,
                    category: category || 'GENERAL'
                }
            });
        } else {
            return NextResponse.json({ error: 'Invalid feedback type.' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error submitting feedback:', error);
        return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }
}
