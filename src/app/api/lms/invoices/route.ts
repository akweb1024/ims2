import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;

      const where: any = {
        lmsParticipantId: { not: null },
      };

      if (user.companyId) {
        where.companyId = user.companyId;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            lmsParticipant: true,
            brand: true,
          }
        }),
        prisma.invoice.count({ where })
      ]);

      return NextResponse.json({
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error: any) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  }
);
