import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get Employee Profile
        const employee = await prisma.employeeProfile.findFirst({
            where: { userId: user.id }
        });

        if (!employee) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        const docs = await prisma.digitalDocument.findMany({
            where: { employeeId: employee.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(docs);
    } catch (error) {
        console.error('Fetch My Digital Docs Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
