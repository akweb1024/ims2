import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const workshopTitle = searchParams.get('workshop') || 'all';
    const status = searchParams.get('status') || 'all';

    // Build the query where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (workshopTitle && workshopTitle !== 'all') {
      where.workshopTitle = workshopTitle;
    }

    if (status && status !== 'all') {
      where.paymentStatus = status;
    }

    const participants = await prisma.lMSParticipant.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(participants);
    } catch (error) {
      console.error('Error fetching LMS participants:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }
);
