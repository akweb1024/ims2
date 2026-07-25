import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';
import {
  TICKET_USER_ROLES,
  ticketInclude,
  canTriageTickets,
  isValidStatus,
  isValidPriority,
  TICKET_DONE_STATUSES,
} from '@/lib/support-tickets';

export const GET = authorizedRoute(
  TICKET_USER_ROLES,
  async (_req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const ticket = await prisma.iTSupportTicket.findUnique({ where: { id }, include: ticketInclude });
      if (!ticket) return createErrorResponse('Ticket not found', 404);
      if (ticket.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
        return createErrorResponse('Forbidden', 403);
      }
      return NextResponse.json({ ...ticket, canTriage: canTriageTickets(user.role) });
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);

/**
 * PATCH /api/it/tickets/[id]
 * Triagers may change status/priority/category/resolution/assignee/department; the requester
 * may edit their own title/description and close/reopen their own ticket. Notifies the new
 * assignee on (re)assignment and the requester on a status change. Stamps resolvedAt.
 */
export const PATCH = authorizedRoute(
  TICKET_USER_ROLES,
  async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const existing = await prisma.iTSupportTicket.findUnique({ where: { id } });
      if (!existing) return createErrorResponse('Ticket not found', 404);
      if (existing.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
        return createErrorResponse('Forbidden', 403);
      }

      const triager = canTriageTickets(user.role);
      const isRequester = existing.requesterId === user.id;
      if (!triager && !isRequester) return createErrorResponse('Unauthorized', 403);

      const body = await req.json();
      const data: any = {};

      // Fields the requester may touch on their own ticket.
      if (body.title !== undefined) data.title = String(body.title).trim();
      if (body.description !== undefined) data.description = String(body.description).trim();
      if (body.status !== undefined) {
        if (!isValidStatus(body.status)) return createErrorResponse('Invalid status', 400);
        // A requester (who isn't also a triager) may only close or reopen — but only an
        // actual change is checked, so re-saving an unchanged status is always allowed.
        if (body.status !== existing.status && !triager && !['OPEN', 'CLOSED'].includes(body.status)) {
          return createErrorResponse('You can only close or reopen your ticket', 403);
        }
        data.status = body.status;
      }

      // Triager-only fields: applied for triagers, silently ignored for the requester (so an
      // existing edit form that posts them all doesn't fail for a non-triager).
      if (triager) {
        if (body.priority !== undefined) {
          if (!isValidPriority(body.priority)) return createErrorResponse('Invalid priority', 400);
          data.priority = body.priority;
        }
        if (body.category !== undefined) data.category = body.category || null;
        if (body.resolution !== undefined) data.resolution = body.resolution || null;
        if (body.dueAt !== undefined) {
          data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
          data.escalatedAt = null; // a fresh due time gets a fresh escalation window
        }
        if (body.departmentId !== undefined) {
          data.department = body.departmentId ? { connect: { id: body.departmentId } } : { disconnect: true };
        }
        if (body.assetId !== undefined) {
          data.asset = body.assetId ? { connect: { id: body.assetId } } : { disconnect: true };
        }
        if (body.assignedToId !== undefined) {
          data.assignedTo = body.assignedToId ? { connect: { id: body.assignedToId } } : { disconnect: true };
        }
      }

      // resolvedAt follows the status into / out of a done state.
      if (data.status) {
        const wasDone = TICKET_DONE_STATUSES.includes(existing.status as any);
        const nowDone = TICKET_DONE_STATUSES.includes(data.status);
        if (nowDone && !wasDone) data.resolvedAt = new Date();
        else if (!nowDone && wasDone) data.resolvedAt = null;
      }

      const updated = await prisma.iTSupportTicket.update({ where: { id }, data, include: ticketInclude });

      // Notify the newly assigned resolver.
      const newAssignee = body.assignedToId !== undefined ? body.assignedToId || null : undefined;
      if (newAssignee && newAssignee !== existing.assignedToId && newAssignee !== user.id) {
        await createNotification({
          userId: newAssignee,
          title: 'Ticket assigned to you',
          message: `You were assigned: ${updated.title}`,
          type: 'INFO',
          link: `/dashboard/support-desk/${id}`,
          category: 'GENERAL',
        }).catch(() => {});
      }

      // Notify the requester when someone else moves the status.
      if (data.status && data.status !== existing.status && existing.requesterId !== user.id) {
        await createNotification({
          userId: existing.requesterId,
          title: `Ticket ${data.status.replace('_', ' ').toLowerCase()}`,
          message: `Your ticket "${updated.title}" is now ${data.status.replace('_', ' ')}`,
          type: 'INFO',
          link: `/dashboard/support-desk/${id}`,
          category: 'GENERAL',
        }).catch(() => {});
      }

      return NextResponse.json(updated);
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);

export const DELETE = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'],
  async (_req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const existing = await prisma.iTSupportTicket.findUnique({ where: { id }, select: { companyId: true } });
      if (!existing) return createErrorResponse('Ticket not found', 404);
      if (existing.companyId !== (user as any).companyId && user.role !== 'SUPER_ADMIN') {
        return createErrorResponse('Forbidden', 403);
      }
      await prisma.iTSupportTicket.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error) {
      return createErrorResponse(error);
    }
  },
);
