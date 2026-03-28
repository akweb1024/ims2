import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    Prisma,
    ThinkTankDuplicateDecision,
    ThinkTankIdeaCategory,
    ThinkTankIdeaStatus,
    ThinkTankParticipantRole,
    ThinkTankVoteState,
    UserRole,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { StorageService } from '@/lib/storage';
import { createNotification } from '@/lib/system-notifications';

const IST_TIMEZONE = 'Asia/Kolkata';
const THINK_TANK_KEY = process.env.THINK_TANK_ENCRYPTION_KEY || process.env.CONFIG_ENCRYPTION_KEY || 'think-tank-encryption-key-32ch';
const CONFIG_ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
const EMBEDDING_MODEL = process.env.THINK_TANK_EMBEDDING_MODEL || 'text-embedding-004';
const DUPLICATE_THRESHOLD = 0.85;
const GOVERNANCE_CATEGORY = 'THINK_TANK';
const GOVERNANCE_KEY = 'GOVERNANCE_OVERRIDE';

const CATEGORY_EXPERTISE: Record<ThinkTankIdeaCategory, string[]> = {
    PUBLICATION: ['publication', 'editorial', 'journal', 'content'],
    MARKETING: ['marketing', 'campaign', 'brand', 'communication'],
    SALES: ['sales', 'business', 'customer', 'crm'],
    ELEARNING: ['learning', 'course', 'education', 'elearning'],
    CHEMICAL: ['chemical', 'lab', 'quality', 'production'],
    SFT_APPS: ['software', 'app', 'engineering', 'it', 'tech'],
    GLOBAL: ['global', 'international', 'strategy'],
    OTHER: ['general', 'operations'],
    ACCOUNTS: ['accounts', 'finance', 'billing'],
};

const VOTE_VALUES: Record<ThinkTankVoteState, number> = {
    LIKE: 1,
    UNLIKE: -1,
    NEUTRAL: 0,
};

export const THINK_TANK_CATEGORY_OPTIONS: { value: ThinkTankIdeaCategory; label: string }[] = [
    { value: 'PUBLICATION', label: 'Publication' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'SALES', label: 'Sales' },
    { value: 'ELEARNING', label: 'Elearning' },
    { value: 'CHEMICAL', label: 'Chemical' },
    { value: 'SFT_APPS', label: 'Sft & Apps' },
    { value: 'GLOBAL', label: 'Global' },
    { value: 'OTHER', label: 'Other' },
    { value: 'ACCOUNTS', label: 'Accounts' },
];

export type ThinkTankUser = {
    id: string;
    role: string;
    companyId?: string | null;
    name?: string | null;
    email?: string | null;
};

export type GovernanceState = {
    now: Date;
    submissionOpen: boolean;
    votingOpen: boolean;
    locked: boolean;
    revealWindow: boolean;
    label: string;
    mode?: 'SCHEDULED' | 'SUBMISSIONS_OPEN' | 'VOTING_OPEN' | 'LOCKED' | 'REVEAL_READY';
    overrideActive?: boolean;
    overrideReason?: string | null;
    overrideUpdatedAt?: string | null;
};

export type GovernanceOverrideMode = 'SCHEDULED' | 'SUBMISSIONS_OPEN' | 'VOTING_OPEN' | 'LOCKED' | 'REVEAL_READY';

type GovernanceOverrideRecord = {
    mode: GovernanceOverrideMode;
    reason?: string | null;
    updatedBy?: string | null;
    updatedAt?: string | null;
};

export const thinkTankIdeaInclude = {
    cycle: true,
    visibleAuthor: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    attachments: {
        include: {
            fileRecord: true,
        },
        orderBy: {
            createdAt: 'asc' as const,
        },
    },
    partners: {
        include: {
            visibleUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    },
    teamMembers: {
        include: {
            visibleUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    },
    votes: true,
    decisionBy: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
    comments: {
        include: {
            author: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc' as const,
        },
    },
    duplicateMatches: {
        include: {
            matchedIdea: {
                select: {
                    id: true,
                    topic: true,
                    category: true,
                    status: true,
                    weightedScore: true,
                    voteCount: true,
                },
            },
        },
        orderBy: {
            similarityScore: 'desc' as const,
        },
    },
} satisfies Prisma.ThinkTankIdeaInclude;

const ALLOWED_INTERNAL_ROLES = new Set<string>([
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'TEAM_LEADER',
    'EXECUTIVE',
    'EMPLOYEE',
    'HR_MANAGER',
    'HR',
    'FINANCE_ADMIN',
    'IT_MANAGER',
    'IT_ADMIN',
    'IT_SUPPORT',
]);

const getIstParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: IST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'short',
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }

    const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
        second: Number(map.second),
        weekday: weekdayMap[map.weekday],
    };
};

const makeIstDate = (year: number, month: number, day: number, time = '00:00:00') => {
    return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}+05:30`);
};

const hashIdentity = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const getKey = () => crypto.scryptSync(THINK_TANK_KEY, 'think-tank-salt', 32);
const getConfigKey = () => crypto.scryptSync(CONFIG_ENCRYPTION_KEY, 'salt', 32);

export const encryptThinkTankIdentity = (plainText: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptThinkTankIdentity = (encryptedText: string) => {
    const [ivHex, payloadHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const payload = Buffer.from(payloadHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
    return decrypted.toString('utf8');
};

const encryptConfigValue = (plainText: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', getConfigKey(), iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

const decryptConfigValue = (cipherText: string) => {
    const parts = cipherText.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getConfigKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

export const ensureThinkTankAccess = (user: ThinkTankUser) => {
    if (!user?.id) {
        throw new Error('Unauthorized');
    }
    if (!user.companyId) {
        throw new Error('Think Tank is available only for company-linked staff.');
    }
    if (!ALLOWED_INTERNAL_ROLES.has(user.role)) {
        throw new Error('Think Tank is available only for internal staff.');
    }
};

export const canManageThinkTankReview = (role?: string | null) => {
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role || '');
};

export const notifyThinkTankReviewers = async (companyId: string, title: string, message: string, link: string) => {
    const reviewers = await prisma.user.findMany({
        where: {
            companyId,
            isActive: true,
            role: {
                in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'] as UserRole[],
            },
        },
        select: { id: true },
    });

    await Promise.all(reviewers.map((reviewer) => createNotification({
        userId: reviewer.id,
        title,
        message,
        type: 'INFO',
        link,
        channels: ['IN_APP'],
    })));
};

export const notifyThinkTankIdeaParticipants = async (ideaId: string, title: string, message: string, link: string) => {
    const idea = await prisma.thinkTankIdea.findUnique({
        where: { id: ideaId },
        select: {
            plannerEncrypted: true,
            partners: { select: { userEncrypted: true } },
            teamMembers: { select: { userEncrypted: true } },
        },
    });

    if (!idea) return;

    const ids = new Set<string>();
    ids.add(decryptThinkTankIdentity(idea.plannerEncrypted));
    for (const partner of idea.partners) ids.add(decryptThinkTankIdentity(partner.userEncrypted));
    for (const member of idea.teamMembers) ids.add(decryptThinkTankIdentity(member.userEncrypted));

    await Promise.all([...ids].map((userId) => createNotification({
        userId,
        title,
        message,
        type: 'INFO',
        link,
        channels: ['IN_APP'],
    })));
};

export const getScheduledGovernanceState = (date = new Date()): GovernanceState => {
    const parts = getIstParts(date);
    const minutes = parts.hour * 60 + parts.minute;
    const submissionOpen = minutes >= 570 && minutes < 780;
    const standardVotingWindow = minutes < 570 || (minutes >= 780 && minutes < 900) || minutes >= 1020;
    const locked = minutes >= 900 && minutes < 1020;
    const isSaturday = parts.weekday === 6;
    const isRevealSaturday = isSaturday && ((parts.day >= 1 && parts.day <= 7) || (parts.day >= 15 && parts.day <= 21));
    const revealWindow = isRevealSaturday && minutes >= 900;
    const votingOpen = !revealWindow && standardVotingWindow;

    let label = 'Closed';
    if (revealWindow) label = 'Reveal window';
    else if (submissionOpen) label = 'Open for submissions';
    else if (votingOpen) label = 'Open for voting';
    else if (locked) label = 'Locked for tallying and review';

    return {
        now: date,
        submissionOpen,
        votingOpen,
        locked,
        revealWindow,
        label,
        mode: 'SCHEDULED',
        overrideActive: false,
        overrideReason: null,
        overrideUpdatedAt: null,
    };
};

export const getGovernanceOverride = async (companyId: string) => {
    const config = await prisma.appConfiguration.findFirst({
        where: {
            companyId,
            category: GOVERNANCE_CATEGORY,
            key: GOVERNANCE_KEY,
            isActive: true,
        },
    });

    if (!config) return null;

    try {
        const parsed = JSON.parse(decryptConfigValue(config.value)) as GovernanceOverrideRecord;
        if (!parsed?.mode || parsed.mode === 'SCHEDULED') return null;
        return parsed;
    } catch {
        return null;
    }
};

export const setGovernanceOverride = async (params: {
    companyId: string;
    mode: GovernanceOverrideMode;
    reason?: string | null;
    userId: string;
}) => {
    const value = encryptConfigValue(JSON.stringify({
        mode: params.mode,
        reason: params.reason || null,
        updatedBy: params.userId,
        updatedAt: new Date().toISOString(),
    }));

    return prisma.appConfiguration.upsert({
        where: {
            companyId_category_key: {
                companyId: params.companyId,
                category: GOVERNANCE_CATEGORY,
                key: GOVERNANCE_KEY,
            },
        },
        create: {
            companyId: params.companyId,
            category: GOVERNANCE_CATEGORY,
            key: GOVERNANCE_KEY,
            value,
            isActive: true,
            description: 'Think Tank governance override',
            createdBy: params.userId,
        },
        update: {
            value,
            isActive: true,
            description: 'Think Tank governance override',
            createdBy: params.userId,
        },
    });
};

export const clearGovernanceOverride = async (companyId: string, userId: string) => {
    const value = encryptConfigValue(JSON.stringify({
        mode: 'SCHEDULED',
        reason: null,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
    }));

    return prisma.appConfiguration.upsert({
        where: {
            companyId_category_key: {
                companyId,
                category: GOVERNANCE_CATEGORY,
                key: GOVERNANCE_KEY,
            },
        },
        create: {
            companyId,
            category: GOVERNANCE_CATEGORY,
            key: GOVERNANCE_KEY,
            value,
            isActive: true,
            description: 'Think Tank governance override',
            createdBy: userId,
        },
        update: {
            value,
            isActive: true,
            description: 'Think Tank governance override',
            createdBy: userId,
        },
    });
};

export const getGovernanceState = async (companyId?: string | null, date = new Date()): Promise<GovernanceState> => {
    const scheduled = getScheduledGovernanceState(date);
    if (!companyId) return scheduled;

    const override = await getGovernanceOverride(companyId);
    if (!override) return scheduled;

    const base: GovernanceState = {
        ...scheduled,
        mode: override.mode,
        overrideActive: true,
        overrideReason: override.reason || null,
        overrideUpdatedAt: override.updatedAt || null,
    };

    switch (override.mode) {
        case 'SUBMISSIONS_OPEN':
            return {
                ...base,
                submissionOpen: true,
                votingOpen: true,
                locked: false,
                revealWindow: false,
                label: 'Manual override: submissions and voting open',
            };
        case 'VOTING_OPEN':
            return {
                ...base,
                submissionOpen: false,
                votingOpen: true,
                locked: false,
                revealWindow: false,
                label: 'Manual override: voting open',
            };
        case 'LOCKED':
            return {
                ...base,
                submissionOpen: false,
                votingOpen: false,
                locked: true,
                revealWindow: false,
                label: 'Manual override: locked',
            };
        case 'REVEAL_READY':
            return {
                ...base,
                submissionOpen: false,
                votingOpen: false,
                locked: false,
                revealWindow: true,
                label: 'Manual override: reveal ready',
            };
        default:
            return scheduled;
    }
};

export const getCurrentCycleWindow = (date = new Date()) => {
    const { year, month, day } = getIstParts(date);
    const isSecondHalf = day >= 15;
    const windowStart = makeIstDate(year, month, isSecondHalf ? 15 : 1, '09:30:00');
    const windowEnd = makeIstDate(year, month, isSecondHalf ? 21 : 7, '15:00:00');

    let revealDay = isSecondHalf ? 15 : 1;
    while (makeIstDate(year, month, revealDay, '15:00:00').getUTCDay() !== 6) {
        revealDay += 1;
    }
    const revealAt = makeIstDate(year, month, revealDay, '15:00:00');

    return { windowStart, windowEnd, revealAt };
};

export const getOrCreateCurrentCycle = async (companyId: string, date = new Date()) => {
    const { windowStart, windowEnd, revealAt } = getCurrentCycleWindow(date);
    const existing = await prisma.thinkTankIdeaCycle.findFirst({
        where: {
            companyId,
            windowStart,
            windowEnd,
        },
    });

    if (existing) return existing;

    return prisma.thinkTankIdeaCycle.create({
        data: {
            companyId,
            windowStart,
            windowEnd,
            revealAt,
        },
    });
};

export const getVoteWeight = (designation?: string | null, role?: string | null) => {
    const normalizedDesignation = (designation || '').trim().toLowerCase();
    const normalizedRole = (role || '').trim().toUpperCase();

    if (normalizedDesignation.includes('senior associate')) return 50;
    if (normalizedDesignation.includes('manager') || normalizedRole === 'ADMIN') return 20;
    if (normalizedDesignation.includes('team lead') || normalizedRole === 'TEAM_LEADER') return 10;
    if (normalizedDesignation.includes('executive') || normalizedRole === 'EXECUTIVE') return 5;
    if (normalizedRole === 'MANAGER') return 20;
    return 5;
};

export const normalizeThinkTankText = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

const tokenize = (text: string) => {
    return new Set(
        normalizeThinkTankText(text)
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length > 2)
    );
};

const jaccardSimilarity = (a: string, b: string) => {
    const setA = tokenize(a);
    const setB = tokenize(b);
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
};

const cosineSimilarity = (a: number[], b: number[]) => {
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getEmbedding = async (text: string): Promise<number[] | null> => {
    if (!GEMINI_API_KEY) return null;

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
        const result = await model.embedContent(text);
        return result.embedding.values ?? null;
    } catch {
        return null;
    }
};

export const computeIdeaSimilarity = async (left: string, right: string) => {
    const [leftEmbedding, rightEmbedding] = await Promise.all([getEmbedding(left), getEmbedding(right)]);
    if (leftEmbedding && rightEmbedding) {
        return cosineSimilarity(leftEmbedding, rightEmbedding);
    }
    return jaccardSimilarity(left, right);
};

export const findPotentialDuplicates = async (params: {
    companyId: string;
    cycleId: string;
    category: ThinkTankIdeaCategory;
    description: string;
}) => {
    const existingIdeas = await prisma.thinkTankIdea.findMany({
        where: {
            companyId: params.companyId,
            cycleId: params.cycleId,
            category: params.category,
            status: {
                in: ['ACTIVE', 'LOCKED', 'REVEALED'],
            },
        },
        select: {
            id: true,
            topic: true,
            description: true,
            category: true,
            weightedScore: true,
            voteCount: true,
        },
        take: 50,
    });

    const candidates = await Promise.all(existingIdeas.map(async (idea) => ({
        ...idea,
        similarityScore: await computeIdeaSimilarity(params.description, idea.description),
    })));

    return candidates
        .filter((candidate) => candidate.similarityScore >= DUPLICATE_THRESHOLD)
        .sort((a, b) => b.similarityScore - a.similarityScore);
};

export const scrubThinkTankAttachment = async (file: File) => {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'application/octet-stream';
    let scrubbed: Buffer = bytes;
    let scrubStatus = 'SCRUBBED';

    if (mimeType === 'image/jpeg') {
        scrubbed = stripJpegExif(bytes);
    } else if (mimeType === 'image/png') {
        scrubbed = stripPngMetadata(bytes);
    } else if (!mimeType.startsWith('image/')) {
        scrubStatus = 'UNVERIFIED';
    }

    return {
        buffer: scrubbed,
        scrubStatus,
        mimeType,
    };
};

const stripJpegExif = (buffer: Buffer) => {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
    const chunks: Buffer[] = [buffer.subarray(0, 2)];
    let offset = 2;

    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xda || marker === 0xd9) {
            chunks.push(buffer.subarray(offset));
            break;
        }

        const segmentLength = buffer.readUInt16BE(offset + 2);
        const end = offset + 2 + segmentLength;
        const isExif = marker === 0xe1;
        if (!isExif) {
            chunks.push(buffer.subarray(offset, end));
        }
        offset = end;
    }

    return Buffer.concat(chunks);
};

const crc32 = (buffer: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let i = 0; i < 8; i += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
};

const stripPngMetadata = (buffer: Buffer) => {
    const signature = buffer.subarray(0, 8);
    if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return buffer;

    const keptChunks: Buffer[] = [signature];
    let offset = 8;

    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        const next = offset + 12 + length;
        const keep = !['tEXt', 'iTXt', 'zTXt', 'eXIf'].includes(type);

        if (keep) {
            const chunk = Buffer.alloc(12 + length);
            chunk.writeUInt32BE(length, 0);
            chunk.write(type, 4, 4, 'ascii');
            data.copy(chunk, 8);
            chunk.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + length);
            keptChunks.push(chunk);
        }
        offset = next;
    }

    return Buffer.concat(keptChunks);
};

export const saveThinkTankAttachment = async (params: {
    file: File;
    uploadedById: string;
    context?: string;
}) => {
    const scrubbed = await scrubThinkTankAttachment(params.file);
    const result = await StorageService.saveFileWithRecord(
        scrubbed.buffer,
        params.file.name,
        'think_tank',
        {
            uploadedById: params.uploadedById,
            context: params.context,
        }
    );

    return {
        fileRecordId: result.record.id,
        url: result.url,
        filename: params.file.name,
        mimeType: scrubbed.mimeType || result.record.mimeType,
        size: scrubbed.buffer.length,
        scrubStatus: scrubbed.scrubStatus,
    };
};

export const logThinkTankAudit = async (params: {
    ideaId?: string | null;
    actorUserId?: string | null;
    action: string;
    outcome: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
}) => {
    await prisma.thinkTankIdeaAuditEvent.create({
        data: {
            ideaId: params.ideaId ?? null,
            actorUserId: params.actorUserId ?? null,
            action: params.action,
            outcome: params.outcome,
            entityId: params.entityId ?? null,
            metadata: params.metadata,
        },
    });
};

export const pickCoOptedMembers = async (params: {
    companyId: string;
    ideaId: string;
    category: ThinkTankIdeaCategory;
    excludeUserIds: string[];
}) => {
    const keywords = CATEGORY_EXPERTISE[params.category] || CATEGORY_EXPERTISE.OTHER;
    const candidates = await prisma.user.findMany({
        where: {
            companyId: params.companyId,
            isActive: true,
            id: { notIn: params.excludeUserIds },
            role: { in: [...ALLOWED_INTERNAL_ROLES] as UserRole[] },
        },
        select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
            employeeProfile: { select: { designation: true, expertise: true, skills: true } },
        },
    });

    const scored = candidates
        .map((candidate) => {
            const haystack = [
                candidate.department?.name,
                candidate.employeeProfile?.designation,
                ...(candidate.employeeProfile?.expertise || []),
                ...(candidate.employeeProfile?.skills || []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const matchScore = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 1 : 0), 0);
            return { candidate, matchScore };
        })
        .filter((entry) => entry.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore || a.candidate.id.localeCompare(b.candidate.id));

    const selected = scored.slice(0, 2).map((entry) => entry.candidate);

    if (!selected.length) return [];

    await prisma.thinkTankIdeaTeamMember.createMany({
        data: selected.map((candidate) => ({
            ideaId: params.ideaId,
            userEncrypted: encryptThinkTankIdentity(candidate.id),
            userHash: hashIdentity(candidate.id),
            roleType: 'CO_OPTED',
            sourceCategory: params.category,
        })),
        skipDuplicates: true,
    });

    return selected;
};

export const recalculateIdeaScore = async (ideaId: string) => {
    const votes = await prisma.thinkTankIdeaVote.findMany({
        where: { ideaId },
        select: { weightedValue: true },
    });

    const weightedScore = votes.reduce((sum, vote) => sum + vote.weightedValue, 0);

    return prisma.thinkTankIdea.update({
        where: { id: ideaId },
        data: {
            weightedScore,
            voteCount: votes.length,
        },
    });
};

export const getThinkTankAnalytics = async (companyId: string) => {
    const [ideas, votes, cycles] = await Promise.all([
        prisma.thinkTankIdea.findMany({
            where: { companyId },
            select: {
                id: true,
                category: true,
                reviewStage: true,
                implementationStatus: true,
                weightedScore: true,
                voteCount: true,
                createdAt: true,
                cycleId: true,
            },
        }),
        prisma.thinkTankIdeaVote.findMany({
            where: { companyId },
            select: {
                id: true,
                ideaId: true,
                vote: true,
                weight: true,
                createdAt: true,
            },
        }),
        prisma.thinkTankIdeaCycle.findMany({
            where: { companyId },
            select: {
                id: true,
                revealAt: true,
                status: true,
            },
            orderBy: { revealAt: 'desc' },
            take: 12,
        }),
    ]);

    const ideasByCategory = ideas.reduce<Record<string, number>>((acc, idea) => {
        acc[idea.category] = (acc[idea.category] || 0) + 1;
        return acc;
    }, {});

    const ideasByStage = ideas.reduce<Record<string, number>>((acc, idea) => {
        acc[idea.reviewStage] = (acc[idea.reviewStage] || 0) + 1;
        return acc;
    }, {});

    const implementationByStatus = ideas.reduce<Record<string, number>>((acc, idea) => {
        acc[idea.implementationStatus] = (acc[idea.implementationStatus] || 0) + 1;
        return acc;
    }, {});

    const latestIdeas = [...ideas]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

    const topIdeas = [...ideas]
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 5);

    const participationByCycle = cycles.map((cycle) => ({
        cycleId: cycle.id,
        revealAt: cycle.revealAt,
        status: cycle.status,
        ideaCount: ideas.filter((idea) => idea.cycleId === cycle.id).length,
        voteCount: votes.filter((vote) => ideas.some((idea) => idea.id === vote.ideaId && idea.cycleId === cycle.id)).length,
    }));

    return {
        totals: {
            ideas: ideas.length,
            votes: votes.length,
            implemented: ideas.filter((idea) => idea.implementationStatus === 'COMPLETED').length,
            shortlisted: ideas.filter((idea) => idea.reviewStage === 'SHORTLISTED').length,
        },
        ideasByCategory,
        ideasByStage,
        implementationByStatus,
        latestIdeas,
        topIdeas,
        participationByCycle,
    };
};

export const convertThinkTankIdeaToExecution = async (params: {
    ideaId: string;
    companyId: string;
    convertedById: string;
    mode: 'PROJECT' | 'TASK';
    title?: string;
    description?: string;
    ownerUserId?: string | null;
    memberIds?: string[];
    startDate?: string | null;
    endDate?: string | null;
    dueDate?: string | null;
    priority?: string | null;
}) => {
    const idea = await prisma.thinkTankIdea.findFirst({
        where: {
            id: params.ideaId,
            companyId: params.companyId,
        },
    });

    if (!idea) {
        throw new Error('Idea not found.');
    }

    if (!['APPROVED', 'IMPLEMENTED'].includes(idea.reviewStage)) {
        throw new Error('Only approved ideas can be converted into projects or tasks.');
    }

    const executionTitle = params.title?.trim() || idea.topic;
    const executionDescription = params.description?.trim() || idea.description;
    const priority = params.priority || 'MEDIUM';
    const ownerUserId = params.ownerUserId || params.convertedById;
    const existingMetadata = (idea.metadata as Record<string, any> | null) || {};

    if (params.mode === 'PROJECT') {
        const project = await prisma.project.create({
            data: {
                companyId: params.companyId,
                title: executionTitle,
                description: executionDescription,
                status: 'PLANNED',
                priority,
                startDate: params.startDate ? new Date(params.startDate) : new Date(),
                endDate: params.endDate ? new Date(params.endDate) : undefined,
                managerId: params.convertedById,
                leadId: ownerUserId,
                members: {
                    create: Array.from(new Set([ownerUserId, ...(params.memberIds || [])])).map((id) => ({
                        userId: id,
                        role: id === ownerUserId ? 'OWNER' : 'MEMBER',
                    })),
                },
            },
        });

        const updatedIdea = await prisma.thinkTankIdea.update({
            where: { id: idea.id },
            data: {
                implementationStatus: 'PLANNED',
                metadata: {
                    ...existingMetadata,
                    executionLink: {
                        type: 'PROJECT',
                        id: project.id,
                        title: project.title,
                        convertedAt: new Date().toISOString(),
                        convertedById: params.convertedById,
                    },
                },
            },
            include: thinkTankIdeaInclude,
        });

        await logThinkTankAudit({
            ideaId: idea.id,
            actorUserId: params.convertedById,
            action: 'IDEA_CONVERTED_TO_PROJECT',
            outcome: 'SUCCESS',
            entityId: project.id,
        });

        await notifyThinkTankIdeaParticipants(
            idea.id,
            'Think Tank idea moved to execution',
            `"${idea.topic}" has been converted into project "${project.title}".`,
            '/dashboard/projects'
        );

        return { type: 'PROJECT' as const, entity: project, idea: updatedIdea };
    }

    const task = await prisma.task.create({
        data: {
            userId: ownerUserId,
            assignedById: params.convertedById,
            companyId: params.companyId,
            title: executionTitle,
            description: executionDescription,
            dueDate: params.dueDate ? new Date(params.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            priority: priority as any,
            status: 'PENDING',
        },
    });

    const updatedIdea = await prisma.thinkTankIdea.update({
        where: { id: idea.id },
        data: {
            implementationStatus: 'PLANNED',
            metadata: {
                ...existingMetadata,
                executionLink: {
                    type: 'TASK',
                    id: task.id,
                    title: task.title,
                    convertedAt: new Date().toISOString(),
                    convertedById: params.convertedById,
                },
            },
        },
        include: thinkTankIdeaInclude,
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: params.convertedById,
        action: 'IDEA_CONVERTED_TO_TASK',
        outcome: 'SUCCESS',
        entityId: task.id,
    });

    await notifyThinkTankIdeaParticipants(
        idea.id,
        'Think Tank idea moved to execution',
        `"${idea.topic}" has been converted into task "${task.title}".`,
        '/dashboard/tasks'
    );

    return { type: 'TASK' as const, entity: task, idea: updatedIdea };
};

export const revealCycleIdeas = async (cycleId: string) => {
    const ideas = await prisma.thinkTankIdea.findMany({
        where: { cycleId },
        include: {
            partners: true,
            teamMembers: true,
        },
    });

    for (const idea of ideas) {
        const plannerId = decryptThinkTankIdentity(idea.plannerEncrypted);
        await prisma.thinkTankIdea.update({
            where: { id: idea.id },
            data: {
                status: 'REVEALED',
                visibleAuthorId: plannerId,
                revealedAt: new Date(),
            },
        });

        for (const partner of idea.partners) {
            const visibleUserId = decryptThinkTankIdentity(partner.userEncrypted);
            await prisma.thinkTankIdeaPartner.update({
                where: { id: partner.id },
                data: { visibleUserId },
            });
        }

        for (const member of idea.teamMembers) {
            const visibleUserId = decryptThinkTankIdentity(member.userEncrypted);
            await prisma.thinkTankIdeaTeamMember.update({
                where: { id: member.id },
                data: { visibleUserId },
            });
        }
    }

    await prisma.thinkTankIdeaCycle.update({
        where: { id: cycleId },
        data: {
            status: 'REVEALED',
            revealedAt: new Date(),
        },
    });
};

export const serializeThinkTankIdea = (idea: Prisma.ThinkTankIdeaGetPayload<{ include: typeof thinkTankIdeaInclude }>, options?: {
    reveal?: boolean;
    includeDuplicates?: boolean;
}) => {
    const reveal = options?.reveal || idea.status === 'REVEALED';
    const metadata = (idea.metadata as Record<string, any> | null) || {};
    const voteBreakdown = {
        like: idea.votes.filter((vote) => vote.vote === 'LIKE').length,
        unlike: idea.votes.filter((vote) => vote.vote === 'UNLIKE').length,
        neutral: idea.votes.filter((vote) => vote.vote === 'NEUTRAL').length,
    };

    return {
        id: idea.id,
        topic: idea.topic,
        description: idea.description,
        category: idea.category,
        status: idea.status,
        reviewStage: idea.reviewStage,
        implementationStatus: idea.implementationStatus,
        decisionNotes: idea.decisionNotes,
        weightedScore: idea.weightedScore,
        voteCount: idea.voteCount,
        createdAt: idea.createdAt,
        updatedAt: idea.updatedAt,
        revealedAt: idea.revealedAt,
        executionLink: metadata.executionLink || null,
        cycle: idea.cycle,
        author: reveal ? idea.visibleAuthor : null,
        decisionBy: idea.decisionBy,
        attachments: idea.attachments.map((attachment) => ({
            id: attachment.id,
            url: attachment.url,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
            scrubStatus: attachment.scrubStatus,
        })),
        partners: reveal
            ? idea.partners.map((partner) => ({
                id: partner.id,
                roleType: partner.roleType,
                user: partner.visibleUser,
            }))
            : [],
        teamMembers: reveal
            ? idea.teamMembers.map((member) => ({
                id: member.id,
                roleType: member.roleType,
                user: member.visibleUser,
            }))
            : [],
        analytics: idea.voteCount < 5
            ? {
                voteCount: idea.voteCount,
                weightedScore: idea.weightedScore,
            }
            : {
                voteCount: idea.voteCount,
                weightedScore: idea.weightedScore,
                voteBreakdown,
            },
        duplicateMatches: options?.includeDuplicates
            ? idea.duplicateMatches.map((match) => ({
                id: match.id,
                similarityScore: match.similarityScore,
                decision: match.decision,
                matchedIdea: match.matchedIdea,
            }))
            : undefined,
        comments: idea.comments.map((comment) => ({
            id: comment.id,
            content: comment.content,
            isInternal: comment.isInternal,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            author: comment.author,
        })),
    };
};

export const createIdeaWithParticipants = async (params: {
    user: ThinkTankUser;
    topic: string;
    description: string;
    category: ThinkTankIdeaCategory;
    partnerIds: string[];
    attachments: Array<{
        fileRecordId?: string | null;
        url: string;
        filename: string;
        mimeType: string;
        size: number;
        scrubStatus?: string | null;
    }>;
    duplicateDecision?: ThinkTankDuplicateDecision | null;
}) => {
    ensureThinkTankAccess(params.user);
    const cycle = await getOrCreateCurrentCycle(params.user.companyId!);
    const governance = await getGovernanceState(params.user.companyId);
    if (!governance.submissionOpen) {
        throw new Error('Think Tank submissions are currently locked by governance schedule.');
    }

    const partnerIds = Array.from(new Set(params.partnerIds.filter((id) => id && id !== params.user.id))).slice(0, 3);
    const duplicates = await findPotentialDuplicates({
        companyId: params.user.companyId!,
        cycleId: cycle.id,
        category: params.category,
        description: params.description,
    });

    const idea = await prisma.thinkTankIdea.create({
        data: {
            companyId: params.user.companyId!,
            cycleId: cycle.id,
            topic: params.topic.trim(),
            description: params.description.trim(),
            category: params.category,
            status: 'ACTIVE',
            reviewStage: 'SUBMITTED',
            plannerEncrypted: encryptThinkTankIdentity(params.user.id),
            plannerHash: hashIdentity(params.user.id),
            duplicateDecision: params.duplicateDecision ?? (duplicates.length > 0 ? 'PROCEED_AS_UNIQUE' : null),
            attachments: {
                create: params.attachments.map((attachment) => ({
                    fileRecordId: attachment.fileRecordId ?? null,
                    url: attachment.url,
                    filename: attachment.filename,
                    mimeType: attachment.mimeType,
                    size: attachment.size,
                    scrubStatus: attachment.scrubStatus ?? 'SCRUBBED',
                })),
            },
            partners: {
                create: [
                    {
                        userEncrypted: encryptThinkTankIdentity(params.user.id),
                        userHash: hashIdentity(params.user.id),
                        roleType: 'PLANNER',
                    },
                    ...partnerIds.map((partnerId) => ({
                        userEncrypted: encryptThinkTankIdentity(partnerId),
                        userHash: hashIdentity(partnerId),
                        roleType: 'SELF_OPTED' as ThinkTankParticipantRole,
                    })),
                ],
            },
        },
        include: thinkTankIdeaInclude,
    });

    if (duplicates.length > 0) {
        await prisma.thinkTankIdeaDuplicateMatch.createMany({
            data: duplicates.map((match) => ({
                ideaId: idea.id,
                matchedIdeaId: match.id,
                similarityScore: match.similarityScore,
                decision: params.duplicateDecision ?? 'PROCEED_AS_UNIQUE',
            })),
        });
    }

    await pickCoOptedMembers({
        companyId: params.user.companyId!,
        ideaId: idea.id,
        category: params.category,
        excludeUserIds: [params.user.id, ...partnerIds],
    });

    await logThinkTankAudit({
        ideaId: idea.id,
        actorUserId: params.user.id,
        action: 'IDEA_CREATED',
        outcome: 'SUCCESS',
        metadata: {
            category: params.category,
            duplicateCandidates: duplicates.length,
        },
    });

    return prisma.thinkTankIdea.findUniqueOrThrow({
        where: { id: idea.id },
        include: thinkTankIdeaInclude,
    });
};
