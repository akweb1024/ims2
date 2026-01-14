import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET - Get specific draft
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const id = context.params.id;

            const draft = await prisma.manuscriptDraft.findUnique({
                where: { id },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true
                        }
                    }
                }
            });

            if (!draft) {
                return createErrorResponse('Draft not found', 404);
            }

            // Ensure user owns this draft
            if (draft.authorId !== user.id) {
                return createErrorResponse('Unauthorized', 403);
            }

            return NextResponse.json(draft);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH - Update draft (auto-save)
export const PATCH = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const id = context.params.id;
            const body = await req.json();
            const { title, abstract, keywords, fileUrl, metadata, step } = body;

            // Verify ownership
            const existing = await prisma.manuscriptDraft.findUnique({
                where: { id }
            });

            if (!existing) {
                return createErrorResponse('Draft not found', 404);
            }

            if (existing.authorId !== user.id) {
                return createErrorResponse('Unauthorized', 403);
            }

            const draft = await prisma.manuscriptDraft.update({
                where: { id },
                data: {
                    title,
                    abstract,
                    keywords,
                    fileUrl,
                    metadata,
                    step
                },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            return NextResponse.json(draft);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE - Delete draft
export const DELETE = authorizedRoute(
    [],
    async (req: NextRequest, user, context) => {
        try {
            const id = context.params.id;

            // Verify ownership
            const existing = await prisma.manuscriptDraft.findUnique({
                where: { id }
            });

            if (!existing) {
                return createErrorResponse('Draft not found', 404);
            }

            if (existing.authorId !== user.id) {
                return createErrorResponse('Unauthorized', 403);
            }

            await prisma.manuscriptDraft.delete({
                where: { id }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
