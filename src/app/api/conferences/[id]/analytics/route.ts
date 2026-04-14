import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET /api/conferences/[id]/analytics - Get conference health and registration insights
export const GET = authorizedRoute(
    ['ADMIN', 'SUPER_ADMIN', 'MANAGER'],
    async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
        try {
            const { id } = await params;

            const [
                registrationStats,
                paperStats,
                ticketTypes,
                tracks
            ] = await Promise.all([
                // 1. Registration & Revenue Stats
                prisma.conferenceRegistration.aggregate({
                    where: { conferenceId: id },
                    _sum: { amountPaid: true },
                    _count: { _all: true }
                }),
                // 2. Paper Submission Stats
                prisma.conferencePaper.groupBy({
                    by: ['status'],
                    where: { conferenceId: id },
                    _count: { _all: true }
                }),
                // 3. Ticket Type Distribution
                prisma.conferenceRegistration.groupBy({
                    by: ['ticketTypeId'],
                    where: { conferenceId: id },
                    _count: { _all: true },
                    _sum: { amountPaid: true }
                }),
                // 4. Track Distribution
                prisma.conferencePaper.groupBy({
                    by: ['trackId'],
                    where: { conferenceId: id },
                    _count: { _all: true }
                })
            ]);

            // Enrich Ticket Type Data
            const enrichedTickets = await Promise.all(ticketTypes.map(async (t) => {
                const type = await prisma.conferenceTicketType.findUnique({
                    where: { id: t.ticketTypeId },
                    select: { name: true }
                });
                return {
                    name: type?.name || 'Unknown',
                    count: t._count._all,
                    revenue: t._sum.amountPaid || 0
                };
            }));

            // Enrich Track Data
            const enrichedTracks = await Promise.all(tracks.map(async (t) => {
                if (!t.trackId) return { name: 'Unassigned', count: t._count._all };
                const track = await prisma.conferenceTrack.findUnique({
                    where: { id: t.trackId },
                    select: { name: true }
                });
                return {
                    name: track?.name || 'Unknown',
                    count: t._count._all
                };
            }));

            return NextResponse.json({
                overview: {
                    totalRegistrations: registrationStats._count._all,
                    totalRevenue: registrationStats._sum.amountPaid || 0,
                    totalPapers: paperStats.reduce((acc, curr) => acc + curr._count._all, 0)
                },
                papersByStatus: paperStats.map(p => ({
                    status: p.status,
                    count: p._count._all
                })),
                tickets: enrichedTickets,
                tracks: enrichedTracks
            });

        } catch (error) {
            console.error('Conference Analytics Error:', error);
            return createErrorResponse(error);
        }
    }
);
