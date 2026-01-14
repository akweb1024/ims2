import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET - Fetch author's drafts
export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const drafts = await prisma.manuscriptDraft.findMany({
                where: {
                    authorId: user.id,
                    isSubmitted: false
                },
                include: {
                    journal: {
                        select: {
                            id: true,
                            name: true,
                            isActive: true
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            });

            return NextResponse.json(drafts);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST - Create new draft
export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { journalId, title, abstract, keywords, fileUrl, metadata, step } = body;

            if (!journalId) {
                return createErrorResponse('Journal ID is required', 400);
            }

            const draft = await prisma.manuscriptDraft.create({
                data: {
                    authorId: user.id,
                    journalId,
                    title,
                    abstract,
                    keywords,
                    fileUrl,
                    metadata,
                    step: step || 1
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

            return NextResponse.json(draft, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
