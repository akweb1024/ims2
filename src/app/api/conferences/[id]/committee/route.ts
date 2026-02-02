import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            logger.debug('Fetching committee for conference', { conferenceId: id });
            const members = await prisma.conferenceCommitteeMember.findMany({
                where: { conferenceId: id },
                orderBy: { displayOrder: 'asc' }
            });
            return NextResponse.json(members);
        } catch (error) {
            logger.error('Committee GET Error', error, { conferenceId: (await params).id });
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const { name, role, affiliation, bio, photoUrl, userId } = body;

            if (!name || !role) {
                logger.warn('Committee creation missing name or role', { body });
                return createErrorResponse('Name and Role are required', 400);
            }

            logger.info('Adding committee member', { name, role, userId, conferenceId: id });
            const member = await prisma.conferenceCommitteeMember.create({
                data: {
                    conferenceId: id,
                    name,
                    role,
                    affiliation,
                    bio,
                    photoUrl,
                    userId: userId || null,
                    displayOrder: 0
                }
            });

            return NextResponse.json(member);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
