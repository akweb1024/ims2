import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const logs = await prisma.communicationLog.findMany({
            where: {
                NOT: {
                    nextFollowUpDate: null,
                },
                category: {
                    in: ['CONFERENCE_FOLLOWUP', 'CONFERENCE_MANAGEMENT_FOLLOWUP'],
                },
                ...(user.role === 'SUPER_ADMIN' || !user.companyId ? {} : { companyId: user.companyId }),
            },
            include: {
                customerProfile: {
                    select: {
                        id: true,
                        name: true,
                        organizationName: true,
                        primaryEmail: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                checklist: true,
            },
            orderBy: {
                nextFollowUpDate: 'asc',
            },
        });

        const registrationReferenceIds = logs
            .filter((log) => log.category === 'CONFERENCE_FOLLOWUP' && log.referenceId)
            .map((log) => log.referenceId as string);

        const conferenceReferenceIds = logs
            .filter((log) => log.category === 'CONFERENCE_MANAGEMENT_FOLLOWUP' && log.referenceId)
            .map((log) => log.referenceId as string);

        const registrations = registrationReferenceIds.length === 0 ? [] : await prisma.conferenceRegistration.findMany({
            where: {
                id: { in: registrationReferenceIds },
            },
            select: {
                id: true,
                conferenceId: true,
                name: true,
                email: true,
            },
        });

        const registrationById = new Map(registrations.map((registration) => [registration.id, registration]));
        const conferenceIds = Array.from(new Set([
            ...conferenceReferenceIds,
            ...registrations.map((registration) => registration.conferenceId),
        ]));

        const conferences = conferenceIds.length === 0 ? [] : await prisma.conference.findMany({
            where: {
                id: { in: conferenceIds },
            },
            select: {
                id: true,
                title: true,
                status: true,
                startDate: true,
                endDate: true,
            },
        });

        const conferenceById = new Map(conferences.map((conference) => [conference.id, conference]));

        const items = logs
            .map((log) => {
                const registration = log.category === 'CONFERENCE_FOLLOWUP' && log.referenceId
                    ? registrationById.get(log.referenceId)
                    : null;
                const conferenceId = log.category === 'CONFERENCE_MANAGEMENT_FOLLOWUP'
                    ? log.referenceId
                    : registration?.conferenceId || null;
                const conference = conferenceId ? conferenceById.get(conferenceId) : null;

                if (!conference || !log.nextFollowUpDate) {
                    return null;
                }

                return {
                    id: log.id,
                    conferenceId: conference.id,
                    conferenceTitle: conference.title,
                    conferenceStatus: conference.status,
                    subject: log.subject,
                    notes: log.notes,
                    nextFollowUpDate: log.nextFollowUpDate,
                    type: log.category === 'CONFERENCE_MANAGEMENT_FOLLOWUP' ? 'CONFERENCE' : 'REGISTRATION',
                    attendeeName: registration?.name || null,
                    attendeeEmail: registration?.email || null,
                    customerHealth: log.checklist?.customerHealth || null,
                    ownerName: log.user?.name || log.user?.email || null,
                };
            })
            .filter(Boolean);

        const missed: typeof items = [];
        const todayItems: typeof items = [];
        const upcoming: typeof items = [];

        items.forEach((item: any) => {
            const followUpDate = new Date(item.nextFollowUpDate);
            const normalized = new Date(followUpDate);
            normalized.setHours(0, 0, 0, 0);

            if (normalized.getTime() === today.getTime()) {
                todayItems.push(item);
            } else if (normalized.getTime() < today.getTime()) {
                missed.push(item);
            } else {
                upcoming.push(item);
            }
        });

        return NextResponse.json({
            missed,
            today: todayItems,
            upcoming,
            meta: {
                total: items.length,
                counts: {
                    missed: missed.length,
                    today: todayItems.length,
                    upcoming: upcoming.length,
                },
            },
        });
    } catch (error) {
        console.error('Conference Follow-up Matrix API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
