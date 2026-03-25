import { prisma } from '@/lib/prisma';
import { calculatePredictions } from '@/lib/predictions';

type RegistrationInput = {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    organization?: string | null;
};

type ConferenceScopedRegistrationInput = RegistrationInput & {
    conferenceId: string;
};

export async function ensureConferenceLeadForRegistration({
    companyId,
    conferenceTitle,
    registration,
}: {
    companyId: string;
    conferenceTitle: string;
    registration: RegistrationInput;
}) {
    const normalizedEmail = registration.email.trim().toLowerCase();
    const normalizedPhone = registration.phone?.trim() || '';

    const existingProfile = await prisma.customerProfile.findFirst({
        where: {
            companyId,
            primaryEmail: {
                equals: normalizedEmail,
                mode: 'insensitive',
            },
        },
    });

    if (existingProfile) {
        return existingProfile;
    }

    let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
            customerProfile: {
                select: { id: true, companyId: true },
            },
        },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                name: registration.name,
                password: `TEMP_PASSWORD_${Date.now()}`,
                role: 'CUSTOMER',
                companyId,
                isActive: true,
            },
            include: {
                customerProfile: {
                    select: { id: true, companyId: true },
                },
            },
        });
    }

    return prisma.customerProfile.create({
        data: {
            userId: user.id,
            companyId,
            customerType: 'INDIVIDUAL',
            name: registration.name,
            primaryEmail: normalizedEmail,
            primaryPhone: normalizedPhone,
            organizationName: registration.organization || undefined,
            leadStatus: 'NEW',
            source: 'CONFERENCE_SYNC',
            notes: `Lead created from conference registration for ${conferenceTitle}.`,
            tags: ['conference-followup', conferenceTitle].filter(Boolean).join(', '),
        },
    });
}

export async function ensureConferenceManagementProfile({
    conferenceId,
    companyId,
    conferenceTitle,
    organizer,
}: {
    conferenceId: string;
    companyId: string;
    conferenceTitle: string;
    organizer?: string | null;
}) {
    const syntheticEmail = `conference+${conferenceId}@internal.local`;
    const syntheticPhone = conferenceId.slice(0, 12);

    const existingProfile = await prisma.customerProfile.findFirst({
        where: {
            companyId,
            primaryEmail: {
                equals: syntheticEmail,
                mode: 'insensitive',
            },
        },
    });

    if (existingProfile) {
        return existingProfile;
    }

    let user = await prisma.user.findUnique({
        where: { email: syntheticEmail },
        include: {
            customerProfile: {
                select: { id: true, companyId: true },
            },
        },
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                email: syntheticEmail,
                name: `${conferenceTitle} Conference`,
                password: `TEMP_PASSWORD_${Date.now()}`,
                role: 'CUSTOMER',
                companyId,
                isActive: true,
            },
            include: {
                customerProfile: {
                    select: { id: true, companyId: true },
                },
            },
        });
    }

    return prisma.customerProfile.create({
        data: {
            userId: user.id,
            companyId,
            customerType: 'INDIVIDUAL',
            name: `${conferenceTitle} Conference`,
            primaryEmail: syntheticEmail,
            primaryPhone: syntheticPhone,
            organizationName: organizer || conferenceTitle,
            leadStatus: 'NEW',
            source: 'CONFERENCE_INTERNAL',
            notes: `Internal conference management profile for ${conferenceTitle}.`,
            tags: ['conference-management', conferenceTitle].filter(Boolean).join(', '),
        },
    });
}

export async function buildConferenceRegistrationFollowupSummary({
    companyId,
    registrations,
}: {
    companyId: string;
    registrations: Array<RegistrationInput>;
}) {
    const emails = Array.from(new Set(registrations.map((registration) => registration.email.trim().toLowerCase())));

    const profiles = await prisma.customerProfile.findMany({
        where: {
            companyId,
            primaryEmail: {
                in: emails,
                mode: 'insensitive',
            },
        },
        select: {
            id: true,
            primaryEmail: true,
        },
    });

    const profileByEmail = new Map(
        profiles.map((profile) => [profile.primaryEmail.trim().toLowerCase(), profile])
    );

    const profileIds = profiles.map((profile) => profile.id);

    const logs = profileIds.length === 0 ? [] : await prisma.communicationLog.findMany({
        where: {
            customerProfileId: { in: profileIds },
            category: 'CONFERENCE_FOLLOWUP',
        },
        include: {
            checklist: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    const logsByProfileId = new Map<string, typeof logs>();
    for (const log of logs) {
        const existing = logsByProfileId.get(log.customerProfileId) || [];
        existing.push(log);
        logsByProfileId.set(log.customerProfileId, existing);
    }

    return registrations.map((registration) => {
        const profile = profileByEmail.get(registration.email.trim().toLowerCase());
        const followupLogs = profile ? (logsByProfileId.get(profile.id) || []) : [];
        const pendingLogs = followupLogs.filter((log) => log.nextFollowUpDate && !log.isFollowUpCompleted);
        const latestLog = followupLogs[0];
        const latestChecklist = latestLog?.checklist;
        const latestPrediction = latestChecklist ? {
            renewalLikelihood: latestChecklist.renewalLikelihood,
            upsellPotential: latestChecklist.upsellPotential,
            churnRisk: latestChecklist.churnRisk,
            customerHealth: latestChecklist.customerHealth,
            insights: Array.isArray(latestChecklist.insights) ? latestChecklist.insights : [],
            recommendedActions: Array.isArray(latestChecklist.recommendedActions) ? latestChecklist.recommendedActions : [],
        } : null;

        const overdueCount = pendingLogs.filter(
            (log) => log.nextFollowUpDate && new Date(log.nextFollowUpDate) < new Date()
        ).length;

        return {
            registrationId: registration.id,
            customerProfileId: profile?.id || null,
            followUpCount: followupLogs.length,
            pendingFollowUpCount: pendingLogs.length,
            overdueFollowUpCount: overdueCount,
            nextFollowUpDate: pendingLogs
                .map((log) => log.nextFollowUpDate)
                .filter(Boolean)
                .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0] || null,
            latestPrediction,
        };
    });
}

export async function buildConferenceFollowupSummaryByConference({
    conferences,
    registrations,
}: {
    conferences: Array<{ id: string; companyId?: string | null }>;
    registrations: Array<ConferenceScopedRegistrationInput>;
}) {
    const registrationsByConferenceId = new Map<string, ConferenceScopedRegistrationInput[]>();

    for (const registration of registrations) {
        const existing = registrationsByConferenceId.get(registration.conferenceId) || [];
        existing.push(registration);
        registrationsByConferenceId.set(registration.conferenceId, existing);
    }

    const summariesByConferenceId = new Map<string, Awaited<ReturnType<typeof buildConferenceRegistrationFollowupSummary>>[number][]>();

    for (const conference of conferences) {
        const conferenceRegistrations = registrationsByConferenceId.get(conference.id) || [];

        if (!conference.companyId || conferenceRegistrations.length === 0) {
            summariesByConferenceId.set(conference.id, []);
            continue;
        }

        const summary = await buildConferenceRegistrationFollowupSummary({
            companyId: conference.companyId,
            registrations: conferenceRegistrations,
        });

        summariesByConferenceId.set(conference.id, summary);
    }

    const healthPriority: Record<string, number> = {
        CRITICAL: 4,
        AT_RISK: 3,
        GOOD: 2,
        EXCELLENT: 1,
    };
    const getHealthPriority = (health?: string | null) => {
        if (!health) return 0;
        return healthPriority[health] || 0;
    };

    return conferences.map((conference) => {
        const registrationSummaries = summariesByConferenceId.get(conference.id) || [];
        const withPredictions = registrationSummaries.filter((item) => item.latestPrediction);
        const latestPredictions = withPredictions
            .map((item) => item.latestPrediction)
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

        const highestRiskPrediction = latestPredictions.length === 0
            ? null
            : latestPredictions.reduce((current, item) => {
                return getHealthPriority(item.customerHealth) > getHealthPriority(current.customerHealth) ? item : current;
            });

        const nextFollowUpDate = registrationSummaries
            .map((item) => item.nextFollowUpDate)
            .filter(Boolean)
            .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0] || null;

        return {
            conferenceId: conference.id,
            totalFollowUps: registrationSummaries.reduce((sum, item) => sum + item.followUpCount, 0),
            pendingFollowUps: registrationSummaries.reduce((sum, item) => sum + item.pendingFollowUpCount, 0),
            overdueFollowUps: registrationSummaries.reduce((sum, item) => sum + item.overdueFollowUpCount, 0),
            trackedRegistrations: withPredictions.length,
            nextFollowUpDate,
            highestRiskPrediction: highestRiskPrediction ? {
                renewalLikelihood: highestRiskPrediction.renewalLikelihood,
                upsellPotential: highestRiskPrediction.upsellPotential,
                churnRisk: highestRiskPrediction.churnRisk,
                customerHealth: highestRiskPrediction.customerHealth,
                insights: highestRiskPrediction.insights,
                recommendedActions: highestRiskPrediction.recommendedActions,
            } : null,
        };
    });
}

export async function createConferenceFollowup({
    companyId,
    userId,
    conferenceTitle,
    registration,
    payload,
}: {
    companyId: string;
    userId: string;
    conferenceTitle: string;
    registration: RegistrationInput;
    payload: {
        channel: string;
        type?: 'COMMENT' | 'EMAIL' | 'CALL' | 'INVOICE_SENT' | 'CATALOGUE_SENT' | 'MEETING';
        subject: string;
        notes: string;
        outcome?: string | null;
        nextFollowUpDate?: string | null;
        checklist: {
            checkedItems: string[];
        };
        previousFollowUpId?: string | null;
    };
}) {
    const lead = await ensureConferenceLeadForRegistration({
        companyId,
        conferenceTitle,
        registration,
    });

    const predictions = calculatePredictions(payload.checklist.checkedItems);

    const log = await prisma.communicationLog.create({
        data: {
            customerProfileId: lead.id,
            userId,
            channel: payload.channel,
            type: payload.type || 'COMMENT',
            subject: payload.subject,
            notes: payload.notes,
            outcome: payload.outcome || null,
            nextFollowUpDate: payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : null,
            category: 'CONFERENCE_FOLLOWUP',
            referenceId: registration.id,
            date: new Date(),
            companyId,
        },
    });

    await prisma.conversationChecklist.create({
        data: {
            communicationLogId: log.id,
            checkedItems: payload.checklist.checkedItems,
            renewalLikelihood: predictions.renewalLikelihood,
            upsellPotential: predictions.upsellPotential,
            churnRisk: predictions.churnRisk,
            customerHealth: predictions.customerHealth,
            insights: predictions.insights,
            recommendedActions: predictions.recommendedActions,
            companyId,
        },
    });

    if (payload.previousFollowUpId) {
        await prisma.communicationLog.update({
            where: { id: payload.previousFollowUpId },
            data: { isFollowUpCompleted: true },
        });
    }

    return {
        logId: log.id,
        customerProfileId: lead.id,
        predictions,
    };
}

export async function getConferenceManagementFollowups({
    conferenceId,
    companyId,
    conferenceTitle,
    organizer,
    page = 1,
    pageSize = 10,
}: {
    conferenceId: string;
    companyId: string;
    conferenceTitle: string;
    organizer?: string | null;
    page?: number;
    pageSize?: number;
}) {
    const profile = await ensureConferenceManagementProfile({
        conferenceId,
        companyId,
        conferenceTitle,
        organizer,
    });

    const followupWhere = {
        customerProfileId: profile.id,
        category: 'CONFERENCE_MANAGEMENT_FOLLOWUP' as const,
        referenceId: conferenceId,
    };

    const normalizedPage = Math.max(1, page);
    const normalizedPageSize = Math.min(100, Math.max(10, pageSize));
    const skip = (normalizedPage - 1) * normalizedPageSize;

    const [allFollowups, followups] = await Promise.all([
        prisma.communicationLog.findMany({
            where: followupWhere,
            include: {
                checklist: true,
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.communicationLog.findMany({
            where: followupWhere,
            include: {
                checklist: true,
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: normalizedPageSize,
        }),
    ]);

    const latestChecklist = allFollowups[0]?.checklist;
    const totalFollowUps = allFollowups.length;

    return {
        customerProfileId: profile.id,
        followups,
        pagination: {
            page: normalizedPage,
            pageSize: normalizedPageSize,
            totalItems: totalFollowUps,
            totalPages: Math.max(1, Math.ceil(totalFollowUps / normalizedPageSize)),
            hasPreviousPage: normalizedPage > 1,
            hasNextPage: skip + followups.length < totalFollowUps,
        },
        summary: {
            totalFollowUps,
            pendingFollowUps: allFollowups.filter((log) => log.nextFollowUpDate && !log.isFollowUpCompleted).length,
            overdueFollowUps: allFollowups.filter((log) => log.nextFollowUpDate && !log.isFollowUpCompleted && new Date(log.nextFollowUpDate) < new Date()).length,
            nextFollowUpDate: allFollowups
                .filter((log) => log.nextFollowUpDate && !log.isFollowUpCompleted)
                .map((log) => log.nextFollowUpDate)
                .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime())[0] || null,
            latestPrediction: latestChecklist ? {
                renewalLikelihood: latestChecklist.renewalLikelihood,
                upsellPotential: latestChecklist.upsellPotential,
                churnRisk: latestChecklist.churnRisk,
                customerHealth: latestChecklist.customerHealth,
                insights: Array.isArray(latestChecklist.insights) ? latestChecklist.insights : [],
                recommendedActions: Array.isArray(latestChecklist.recommendedActions) ? latestChecklist.recommendedActions : [],
            } : null,
        },
    };
}

export async function createConferenceManagementFollowup({
    conferenceId,
    companyId,
    userId,
    conferenceTitle,
    organizer,
    payload,
}: {
    conferenceId: string;
    companyId: string;
    userId: string;
    conferenceTitle: string;
    organizer?: string | null;
    payload: {
        channel: string;
        type?: 'COMMENT' | 'EMAIL' | 'CALL' | 'INVOICE_SENT' | 'CATALOGUE_SENT' | 'MEETING';
        subject: string;
        notes: string;
        outcome?: string | null;
        nextFollowUpDate?: string | null;
        checklist: {
            checkedItems: string[];
        };
        previousFollowUpId?: string | null;
    };
}) {
    const profile = await ensureConferenceManagementProfile({
        conferenceId,
        companyId,
        conferenceTitle,
        organizer,
    });

    const predictions = calculatePredictions(payload.checklist.checkedItems);

    const log = await prisma.communicationLog.create({
        data: {
            customerProfileId: profile.id,
            userId,
            channel: payload.channel,
            type: payload.type || 'COMMENT',
            subject: payload.subject,
            notes: payload.notes,
            outcome: payload.outcome || null,
            nextFollowUpDate: payload.nextFollowUpDate ? new Date(payload.nextFollowUpDate) : null,
            category: 'CONFERENCE_MANAGEMENT_FOLLOWUP',
            referenceId: conferenceId,
            date: new Date(),
            companyId,
        },
    });

    await prisma.conversationChecklist.create({
        data: {
            communicationLogId: log.id,
            checkedItems: payload.checklist.checkedItems,
            renewalLikelihood: predictions.renewalLikelihood,
            upsellPotential: predictions.upsellPotential,
            churnRisk: predictions.churnRisk,
            customerHealth: predictions.customerHealth,
            insights: predictions.insights,
            recommendedActions: predictions.recommendedActions,
            companyId,
        },
    });

    if (payload.previousFollowUpId) {
        await prisma.communicationLog.update({
            where: { id: payload.previousFollowUpId },
            data: { isFollowUpCompleted: true },
        });
    }

    return {
        logId: log.id,
        customerProfileId: profile.id,
        predictions,
    };
}
