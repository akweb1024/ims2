import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;
            const journalId = id;

            const volumes = await prisma.journalVolume.findMany({
                where: { journalId },
                orderBy: { volumeNumber: 'desc' },
                include: {
                    issues: {
                        orderBy: { issueNumber: 'asc' },
                        include: { _count: { select: { articles: true } } }
                    }
                }
            });

            return NextResponse.json(volumes);
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
            const journalId = id;
            const body = await req.json();
            const { volumeNumber, year } = body;

            if (!volumeNumber || !year) {
                return NextResponse.json({ error: 'Volume Number and Year are required' }, { status: 400 });
            }

            const volume = await prisma.journalVolume.create({
                data: {
                    journalId,
                    volumeNumber: parseInt(volumeNumber),
                    year: parseInt(year),
                    isActive: true
                }
            });

            return NextResponse.json(volume, { status: 201 });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
