import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const conferenceId = id;

            const tracks = await prisma.conferenceTrack.findMany({
                where: { conferenceId },
                orderBy: { order: 'asc' }
            });

            return NextResponse.json(tracks);
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
            const conferenceId = id;
            const body = await req.json();
            const { name, description, color } = body;

            if (!name) {
                return createErrorResponse('Name is required', 400);
            }

            // Get the highest order number
            const lastTrack = await prisma.conferenceTrack.findFirst({
                where: { conferenceId },
                orderBy: { order: 'desc' }
            });

            const newOrder = (lastTrack?.order || 0) + 1;

            const track = await prisma.conferenceTrack.create({
                data: {
                    conferenceId,
                    name,
                    description,
                    color: color || '#3B82F6',
                    order: newOrder
                }
            });

            return NextResponse.json(track);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
