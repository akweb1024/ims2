import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';
import { TICKET_USER_ROLES, canTriageTickets } from '@/lib/support-tickets';

/** Requester, current assignee, or any triager may see/post on a ticket's thread. */
function mayAccess(user: { id: string; role: string }, ticket: { requesterId: string; assignedToId: string | null }) {
  return canTriageTickets(user.role) || ticket.requesterId === user.id || ticket.assignedToId === user.id;
}

export const GET = authorizedRoute(
  TICKET_USER_ROLES,
  async (_req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const ticket = await prisma.iTSupportTicket.findUnique({
        where: { id },
        select: { companyId: true, requesterId: true, assignedToId: true },
      });
      if (!ticket) return createErrorResponse('Ticket not found', 404);
      if (ticket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') return createErrorResponse('Forbidden', 403);
      if (!mayAccess(user, ticket)) return createErrorResponse('Unauthorized', 403);

      const triager = canTriageTickets(user.role);
      const comments = await prisma.iTSupportTicketComment.findMany({
        where: { ticketId: id, ...(triager ? {} : { isInternal: false }) },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json(comments);
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);

/** POST a follow-up. Body: { body, isInternal? } — isInternal is triager-only. */
export const POST = authorizedRoute(
  TICKET_USER_ROLES,
  async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const ticket = await prisma.iTSupportTicket.findUnique({
        where: { id },
        select: { companyId: true, requesterId: true, assignedToId: true, title: true },
      });
      if (!ticket) return createErrorResponse('Ticket not found', 404);
      if (ticket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') return createErrorResponse('Forbidden', 403);
      if (!mayAccess(user, ticket)) return createErrorResponse('Unauthorized', 403);

      const body = await req.json();
      const text = (body.body || '').trim();
      if (!text) return createErrorResponse('Comment body is required', 400);
      const triager = canTriageTickets(user.role);
      const isInternal = !!body.isInternal && triager; // only triagers can post internal notes

      const comment = await prisma.iTSupportTicketComment.create({
        data: { ticketId: id, userId: user.id, body: text, isInternal },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      // Notify the other participants. Internal notes skip the requester.
      const recipients = new Set<string>([ticket.assignedToId ?? '', isInternal ? '' : ticket.requesterId]);
      recipients.delete('');
      recipients.delete(user.id);
      await Promise.all(
        [...recipients].map((uid) =>
          createNotification({
            userId: uid,
            title: 'New reply on a ticket',
            message: `${(user as any).name || user.email || 'Someone'} replied on "${ticket.title}"`,
            type: 'INFO',
            link: `/dashboard/support-desk/${id}`,
            category: 'GENERAL',
          }).catch(() => {}),
        ),
      );

      return NextResponse.json(comment, { status: 201 });
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);
