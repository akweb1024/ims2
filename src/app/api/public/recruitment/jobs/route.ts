import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      include: {
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    return createErrorResponse(error);
  }
}
