import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const issueId = (await params).id;
            const body = await req.json();

            const followUp = await prisma.issueFollowUp.create({
                data: {
                    issueId,
                    authorId: user.id,
                    content: body.content
                },
                include: {
                    author: { select: { name: true, email: true } }
                }
            });

            // Optionally update issue updated_at
            await prisma.issue.update({
                where: { id: issueId },
                data: { updatedAt: new Date() }
            });

            return NextResponse.json(followUp);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
