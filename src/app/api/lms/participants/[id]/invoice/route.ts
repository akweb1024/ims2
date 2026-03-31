import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { LMSInvoiceService } from '@/lib/services/lms-invoice';

export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const { id: participantId } = req.nextUrl.pathname.match(/\/participants\/([^/]+)\/invoice/)?.groups || {};
      const actualId = req.nextUrl.pathname.split('/')[4]; // /api/lms/participants/[id]/invoice

      if (!actualId) throw new ValidationError('Participant ID is required');

      const body = await req.json().catch(() => ({}));
      const { brandId } = body;

      const invoice = await LMSInvoiceService.generateForParticipant(
        actualId,
        user.companyId || undefined,
        brandId
      );

      return NextResponse.json({
        success: true,
        invoiceId: (invoice as any).id,
        invoiceNumber: (invoice as any).invoiceNumber
      });

    } catch (error: any) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  }
);
