import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';

// Public endpoint to get journal details + editorial board + latest issue
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const journal = await prisma.journal.findUnique({
            where: { id, isActive: true },
            include: {
                editorialBoard: {
                    orderBy: { displayOrder: 'asc' },
                    select: {
                        id: true, name: true, designation: true, affiliation: true,
                        profilePicture: true, bio: true
                    }
                },
                volumes: {
                    take: 1,
                    orderBy: { volumeNumber: 'desc' },
                    include: {
                        issues: {
                            take: 1,
                            orderBy: { issueNumber: 'desc' },
                            where: { status: 'PUBLISHED' },
                            include: {
                                articles: {
                                    where: { status: 'PUBLISHED' },
                                    select: {
                                        id: true, title: true, abstract: true,
                                        authors: { select: { name: true } },
                                        versions: { take: 1, orderBy: { versionNumber: 'desc' }, select: { fileUrl: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!journal) return createErrorResponse('Journal not found', 404);

        return NextResponse.json(journal);
    } catch (error) {
        return createErrorResponse(error);
    }
}
