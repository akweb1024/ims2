import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const journalId = params.id;

            const members = await prisma.editorialBoardMember.findMany({
                where: { journalId },
                orderBy: { displayOrder: 'asc' },
                include: { user: { select: { email: true, profileImage: true } } }
            });

            return NextResponse.json(members);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const journalId = params.id;
            const body = await req.json();
            const { name, email, designation, affiliation, bio, userId } = body;

            // Validate
            if (!name || !email || !designation) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            const member = await prisma.editorialBoardMember.create({
                data: {
                    journalId,
                    name,
                    email,
                    designation,
                    affiliation,
                    bio,
                    userId: userId || null
                }
            });

            return NextResponse.json(member, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
