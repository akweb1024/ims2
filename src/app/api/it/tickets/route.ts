import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { createNotification } from '@/lib/system-notifications';
import {
  TICKET_USER_ROLES,
  ticketInclude,
  canTriageTickets,
  isValidPriority,
  slaDueDate,
} from '@/lib/support-tickets';

/**
 * GET /api/it/tickets
 *   ?scope=queue     → all company tickets (triagers only)
 *   ?scope=mine      → tickets I raised
 *   ?scope=assigned  → tickets assigned to me
 *   default          → triager: all; everyone else: raised-by-me OR assigned-to-me
 *   ?status=…        → optional status filter
 */
export const GET = authorizedRoute(TICKET_USER_ROLES, async (req: NextRequest, user) => {
  try {
    const companyId = (user as any).companyId;
    if (!companyId) return createErrorResponse('Company association required', 403);
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const status = searchParams.get('status');
    const triager = canTriageTickets(user.role);

    const where: any = { companyId };
    if (status) where.status = status;
    if (scope === 'mine') where.requesterId = user.id;
    else if (scope === 'assigned') where.assignedToId = user.id;
    else if (scope === 'queue' && triager) {
      /* all company tickets */
    } else if (!triager) {
      where.OR = [{ requesterId: user.id }, { assignedToId: user.id }];
    }

    const tickets = await prisma.iTSupportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    return createErrorResponse(error);
  }
});

/**
 * POST /api/it/tickets — raise a support ticket, routed to a target department (IT by
 * default). Notifies the target department head and the company's IT admins.
 */
export const POST = authorizedRoute(TICKET_USER_ROLES, async (req: NextRequest, user) => {
  try {
    const companyId = (user as any).companyId;
    if (!companyId) return createErrorResponse('Company association required', 403);
    const body = await req.json();

    const title = (body.title || '').trim();
    const description = (body.description || '').trim();
    if (!title || !description) return createErrorResponse('Title and description are required', 400);
    if (body.priority && !isValidPriority(body.priority)) return createErrorResponse('Invalid priority', 400);

    // Validate the target department belongs to this company, if provided.
    const departmentId: string | null = body.departmentId || null;
    let departmentHeadId: string | null = null;
    if (departmentId) {
      const dept = await prisma.department.findFirst({ where: { id: departmentId, companyId }, select: { id: true, headUserId: true } });
      if (!dept) return createErrorResponse('Target department not found', 400);
      departmentHeadId = dept.headUserId;
    }

    const ticket = await prisma.iTSupportTicket.create({
      data: {
        companyId,
        requesterId: user.id,
        title,
        description,
        priority: body.priority || 'MEDIUM',
        category: body.category || 'GENERAL',
        departmentId,
        assetId: body.assetId || null,
        status: 'OPEN',
        dueAt: slaDueDate(body.priority || 'MEDIUM'),
      },
      include: ticketInclude,
    });

    // Notify the department head + the company's IT admins (default helpdesk), minus the raiser.
    const itAdmins = await prisma.user.findMany({
      where: { companyId, isActive: true, role: { in: ['IT_MANAGER', 'IT_ADMIN'] } },
      select: { id: true },
    });
    const recipients = new Set<string>([...(departmentHeadId ? [departmentHeadId] : []), ...itAdmins.map((u) => u.id)]);
    recipients.delete(user.id);
    await Promise.all(
      [...recipients].map((uid) =>
        createNotification({
          userId: uid,
          title: 'New support ticket',
          message: `${(user as any).name || user.email || 'Someone'} raised: ${title}`,
          type: 'INFO',
          link: `/dashboard/support-desk/${ticket.id}`,
          category: 'GENERAL',
        }).catch(() => {}),
      ),
    );

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
});
