
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, id, recipient, subject, content } = body;

        // Log the email
        await prisma.lMSEmailLog.create({
            data: {
                type,
                referenceId: id,
                recipient,
                subject,
                content
            }
        });

        // Increment count based on type
        if (type === 'WORKSHOP') {
            await prisma.workshop.update({
                where: { id },
                data: { emailCount: { increment: 1 } }
            });
        } else if (type === 'INTERNSHIP') {
            await prisma.internship.update({
                where: { id },
                data: { emailCount: { increment: 1 } }
            });
        } else if (type === 'COURSE') {
            await prisma.course.update({
                where: { id },
                data: { emailCount: { increment: 1 } }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending email log:', error);
        return NextResponse.json({ error: 'Failed to log email' }, { status: 500 });
    }
}
