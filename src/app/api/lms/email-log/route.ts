
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: any, user: any) => {
        try {
            const body = await req.json();
            const { productId, type, count, description } = body;

            if (!productId || !type || !count) {
                return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
            }

            const incrementValue = parseInt(count);

            if (type === 'Course') {
                await prisma.course.update({
                    where: { id: productId },
                    data: { emailCount: { increment: incrementValue } }
                });
            } else if (type === 'Workshop') {
                await prisma.workshop.update({
                    where: { id: productId },
                    data: { emailCount: { increment: incrementValue } }
                });
            } else if (type === 'Internship') {
                await prisma.internship.update({
                    where: { id: productId },
                    data: { emailCount: { increment: incrementValue } }
                });
            } else {
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
            }

            // Optional: Log this manual entry for audit (using existing LMSEmailLog or just generic audit)
            // For now, simpler to just update the count as that's what drives financials.

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Email Log Error:', error);
            return NextResponse.json({ error: 'Failed to log email count' }, { status: 500 });
        }
    }
);
