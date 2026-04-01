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

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const data = await req.json();
      
      // Basic validation
      if (!data.name || !data.email || !data.workshopTitle) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Generate a manual PID if not provided
      const pid = data.pid || `MAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const participant = await prisma.lMSParticipant.create({
        data: {
          pid,
          name: data.name,
          email: data.email,
          mobileNumber: data.mobileNumber || '',
          workshopTitle: data.workshopTitle,
          currentAffiliation: data.currentAffiliation || '',
          profession: data.profession || '',
          designation: data.designation || '',
          address: data.address || '',
          state: data.state || '',
          country: data.country || 'India',
          pinCode: data.pinCode || '',
          gstVatNo: data.gstVatNo || '',
          courseFee: Number(data.courseFee) || 0,
          payableAmount: Number(data.payableAmount) || 0,
          otherCurrency: data.otherCurrency || null,
          paymentStatus: data.paymentStatus || 'PENDING',
          learningMode: data.learningMode || 'ONLINE',
          category: data.category || 'General',
        }
      });

      return NextResponse.json(participant);
    } catch (error) {
      console.error('Error creating manual LMS participant:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
);
