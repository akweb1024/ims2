import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await context.params;
            console.log('Fetching committee for conference:', id);
            const members = await prisma.conferenceCommitteeMember.findMany({
                where: { conferenceId: id },
                orderBy: { displayOrder: 'asc' }
            });
            return NextResponse.json(members);
        } catch (error) {
            console.error('Committee GET Error:', error);
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, context: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await context.params;
            const body = await req.json();
            const { name, role, affiliation, bio, photoUrl, userId } = body;

            if (!name || !role) {
                console.log('Committee creation missing name or role:', body);
                return createErrorResponse('Name and Role are required', 400);
            }

            console.log('Adding committee member:', { name, role, userId });
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
