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
