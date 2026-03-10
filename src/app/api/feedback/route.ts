import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

// GET /api/feedback — list current user's feedback threads
export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'EXECUTIVE', 'HR', 'EMPLOYEE'],
  async (_req: NextRequest, user) => {
    try {
      const threads = await prisma.userFeedback.findMany({
        where: { userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              attachments: true,
              sender: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json(threads);
    } catch (error) {
      return handleApiError(error, '/api/feedback');
    }
  }
);

// POST /api/feedback — create a new feedback thread with first message
export const POST = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT', 'EXECUTIVE', 'HR', 'EMPLOYEE'],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const { category = 'GENERAL', priority = 'MEDIUM', title, content, attachments = [] } = body;

      if (!content?.trim()) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
      }

      const thread = await prisma.userFeedback.create({
        data: {
          userId:    user.id,
          companyId: user.companyId ?? undefined,
          category,
          priority,
          title:    title?.trim() || `${category} — ${new Date().toLocaleDateString('en-IN')}`,
          status:   'OPEN',
          messages: {
            create: {
              senderId:    user.id,
              content:     content.trim(),
              isAdminReply: false,
              attachments: attachments.length > 0 ? {
                create: attachments.map((a: any) => ({
                  url:      a.url,
                  filename: a.filename,
                  size:     a.size,
                  mimeType: a.mimeType,
                })),
              } : undefined,
            },
          },
        },
        include: {
          messages: {
            include: {
              attachments: true,
              sender: { select: { id: true, name: true } },
            },
          },
        },
      });

      return NextResponse.json(thread, { status: 201 });
    } catch (error) {
      return handleApiError(error, '/api/feedback');
    }
  }
);
