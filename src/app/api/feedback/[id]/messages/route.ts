import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

// GET /api/feedback/[id]/messages
export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'EXECUTIVE', 'HR', 'EMPLOYEE'],
  async (req: NextRequest, user) => {
    try {
      const id = req.nextUrl.pathname.split('/').at(-2)!;

      const thread = await prisma.userFeedback.findFirst({
        where: {
          id,
          // Non-admins can only see their own threads
          ...(['SUPER_ADMIN', 'ADMIN', 'IT_ADMIN', 'IT_MANAGER'].includes(user.role)
            ? {}
            : { userId: user.id }),
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true,
              sender: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      return NextResponse.json(thread);
    } catch (error) {
      return handleApiError(error, '/api/feedback/[id]/messages');
    }
  }
);

// POST /api/feedback/[id]/messages — add reply to a thread
export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'EXECUTIVE', 'HR', 'EMPLOYEE'],
  async (req: NextRequest, user) => {
    try {
      const id = req.nextUrl.pathname.split('/').at(-2)!;
      const body = await req.json();
      const { content, attachments = [] } = body;

      if (!content?.trim()) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_ADMIN', 'IT_MANAGER'].includes(user.role);

      // Verify thread exists and user has access
      const thread = await prisma.userFeedback.findFirst({
        where: {
          id,
          ...(isAdmin ? {} : { userId: user.id }),
        },
      });

      if (!thread) {
        return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
      }

      const message = await prisma.feedbackMessage.create({
        data: {
          feedbackId:   id,
          senderId:     user.id,
          content:      content.trim(),
          isAdminReply: isAdmin,
          attachments:  attachments.length > 0 ? {
            create: attachments.map((a: any) => ({
              url:      a.url,
              filename: a.filename,
              size:     a.size,
              mimeType: a.mimeType,
            })),
          } : undefined,
        },
        include: {
          attachments: true,
          sender: { select: { id: true, name: true, email: true } },
        },
      });

      // Update thread's updatedAt & status if admin replied
      if (isAdmin && thread.status === 'OPEN') {
        await prisma.userFeedback.update({
          where: { id },
          data: { status: 'IN_PROGRESS', updatedAt: new Date() },
        });
      } else {
        await prisma.userFeedback.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
      }

      return NextResponse.json(message, { status: 201 });
    } catch (error) {
      return handleApiError(error, '/api/feedback/[id]/messages');
    }
  }
);

// PATCH /api/feedback/[id]/messages — admin updates thread status/priority
export const PATCH = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'IT_ADMIN', 'IT_MANAGER'],
  async (req: NextRequest, user) => {
    try {
      const id = req.nextUrl.pathname.split('/').at(-2)!;
      const body = await req.json();
      const { status, priority } = body;

      const updated = await prisma.userFeedback.update({
        where: { id },
        data: {
          ...(status   ? { status,   ...(status === 'RESOLVED' ? { resolvedAt: new Date() } : {}) } : {}),
          ...(priority ? { priority } : {}),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleApiError(error, '/api/feedback/[id]/messages');
    }
  }
);
