/**
 * ims2 MCP server — read-only tools over the IMS database.
 *
 * Exposes a handful of Model Context Protocol tools so an MCP client (Claude
 * Desktop, Claude Code, Cursor, …) can answer questions about the business
 * directly from the live schema:
 *
 *   - list_employees       find people by name / email / department
 *   - employee_kra_goals   an employee's KRA/KPI goals for a period
 *   - attendance_summary   present / late / absent day counts for a period
 *   - performance_index    the derived PerformanceIndex score for a period
 *   - kra_rollup           TEAM / DEPARTMENT / COMPANY roll-ups for a period
 *
 * Every tool is READ-ONLY (no writes, ever) and speaks JSON-RPC over stdio.
 *
 * Runtime contract:
 *   - the ONLY required env var is DATABASE_URL (same string the app uses);
 *     no app secrets are needed, so this server never imports env-validation.
 *   - run with:  DATABASE_URL=... npm run mcp:server
 *
 * The IST date windows and attendance folding reuse the app's own pure
 * helpers, so the numbers match what the dashboards show.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import {
    getISTDateRangeForPeriod,
    normalizePeriod,
    formatToISTDate,
    type Period,
} from '../src/lib/date-utils';
import {
    summarizeAttendance,
    PRESENT_STATUSES,
    ABSENT_STATUSES,
} from '../src/lib/dashboard/attendance-summary';

// --- Prisma (self-contained, DATABASE_URL only) --------------------------

function makePrisma(): PrismaClient {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is not set — the ims2 MCP server needs it to reach the database.');
    }
    let pool: Pool;
    try {
        const parsed = new URL(url);
        pool = new Pool({
            user: parsed.username,
            password: decodeURIComponent(parsed.password),
            host: parsed.hostname,
            port: parseInt(parsed.port || '5432', 10),
            database: parsed.pathname.slice(1).split('?')[0],
            ssl: url.includes('sslmode=require') || url.includes('ssl=true') ? { rejectUnauthorized: false } : false,
        });
    } catch {
        pool = new Pool({ connectionString: url });
    }
    return new PrismaClient({ adapter: new PrismaPg(pool), log: ['error'] });
}

const prisma = makePrisma();

// --- shared helpers ------------------------------------------------------

/** Period label used by PerformanceIndex / KraRollup ("2026-06" | "2026-Q2" | "2026"). */
function periodLabel(period: Period, baseDate = new Date()): string {
    const { start } = getISTDateRangeForPeriod(period, baseDate);
    // Read the IST wall-clock month from the window start (which is an IST boundary).
    const [y, m] = formatToISTDate(start).split('-'); // formatToISTDate -> YYYY-MM-DD
    const year = y;
    const month = parseInt(m, 10);
    if (period === 'YEARLY') return year;
    if (period === 'QUARTERLY') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
    return `${year}-${String(month).padStart(2, '0')}`; // MONTHLY / DAILY -> month bucket
}

/** Resolve a free-text employee reference to a profile + user. */
async function resolveEmployee(ref: string) {
    const needle = ref.trim();
    if (!needle) return null;

    // Try exact ids first (profile id, employeeId code, user id).
    const byId = await prisma.employeeProfile.findFirst({
        where: {
            OR: [
                { id: needle },
                { employeeId: needle },
                { userId: needle },
                { user: { email: { equals: needle, mode: 'insensitive' } } },
            ],
        },
        include: { user: { include: { department: true } } },
    });
    if (byId) return byId;

    // Fall back to fuzzy name / email match.
    return prisma.employeeProfile.findFirst({
        where: {
            user: {
                OR: [
                    { name: { contains: needle, mode: 'insensitive' } },
                    { email: { contains: needle, mode: 'insensitive' } },
                ],
            },
        },
        include: { user: { include: { department: true } } },
        orderBy: { createdAt: 'asc' },
    });
}

function employeeIdentity(profile: {
    id: string;
    employeeId: string | null;
    designation: string | null;
    user: { name: string | null; email: string; department: { name: string } | null };
}) {
    return {
        profileId: profile.id,
        employeeCode: profile.employeeId,
        name: profile.user.name,
        email: profile.user.email,
        designation: profile.designation,
        department: profile.user.department?.name ?? null,
    };
}

function toRatio(n: number) {
    return Math.round(n * 10) / 10;
}

function ok(payload: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true };
}

// --- tool definitions ----------------------------------------------------

const PERIOD_ENUM = ['DAILY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

const TOOLS: Tool[] = [
    {
        name: 'list_employees',
        description:
            'Search active employees by name, email, or department. Returns identity cards (profile id, code, name, email, designation, department). Use the returned name/email/profileId with the other tools.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Free text matched against employee name or email (case-insensitive). Omit to list everyone.' },
                department: { type: 'string', description: 'Filter by department name (case-insensitive contains).' },
                limit: { type: 'number', description: 'Max rows to return (default 25, max 100).' },
            },
        },
    },
    {
        name: 'employee_kra_goals',
        description:
            "An employee's goals for a period, with target vs current/verified value, achievement %, weight, KRA flag, and verification status. Defaults to KRA-only goals for the current month.",
        inputSchema: {
            type: 'object',
            properties: {
                employee: { type: 'string', description: 'Employee name, email, profile id, or employee code.' },
                period: { type: 'string', enum: PERIOD_ENUM, description: 'Window to overlap goals against (default MONTHLY).' },
                kraOnly: { type: 'boolean', description: 'Only goals that count toward the weighted KRA score (default true).' },
            },
            required: ['employee'],
        },
    },
    {
        name: 'attendance_summary',
        description:
            'Present / late / absent person-day counts for one employee over a period, folded with the same status rules the dashboard uses. Also returns a per-status breakdown.',
        inputSchema: {
            type: 'object',
            properties: {
                employee: { type: 'string', description: 'Employee name, email, profile id, or employee code.' },
                period: { type: 'string', enum: PERIOD_ENUM, description: 'Window to summarize (default MONTHLY).' },
                month: { type: 'string', description: 'Specific IST month as YYYY-MM (overrides period; summarizes that whole month).' },
            },
            required: ['employee'],
        },
    },
    {
        name: 'performance_index',
        description:
            "An employee's derived PerformanceIndex for a period: achievement, attendance, manager-rating and focus sub-scores, overall index, grade and letter rating. This is cron-computed, not live.",
        inputSchema: {
            type: 'object',
            properties: {
                employee: { type: 'string', description: 'Employee name, email, profile id, or employee code.' },
                period: { type: 'string', enum: PERIOD_ENUM, description: 'Period type (default MONTHLY).' },
                periodLabel: { type: 'string', description: 'Explicit label like "2026-06" / "2026-Q2" / "2026" (overrides period).' },
            },
            required: ['employee'],
        },
    },
    {
        name: 'kra_rollup',
        description:
            'KRA roll-ups above the employee level for a period: TEAM (per manager), DEPARTMENT, or COMPANY. Returns employee/goal counts, average achievement, average index, grade counts and dimension averages.',
        inputSchema: {
            type: 'object',
            properties: {
                level: { type: 'string', enum: ['TEAM', 'DEPARTMENT', 'COMPANY'], description: 'Aggregation level (default COMPANY).' },
                period: { type: 'string', enum: PERIOD_ENUM, description: 'Period type (default MONTHLY).' },
                periodLabel: { type: 'string', description: 'Explicit label like "2026-06" (overrides period).' },
                subject: { type: 'string', description: 'Filter by subject name (contains, case-insensitive) — e.g. a manager, department, or company name.' },
            },
        },
    },
];

// --- tool handlers -------------------------------------------------------

async function handleListEmployees(args: Record<string, unknown>) {
    const query = typeof args.query === 'string' ? args.query.trim() : '';
    const department = typeof args.department === 'string' ? args.department.trim() : '';
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100);

    const profiles = await prisma.employeeProfile.findMany({
        where: {
            user: {
                isActive: true,
                ...(query
                    ? {
                          OR: [
                              { name: { contains: query, mode: 'insensitive' } },
                              { email: { contains: query, mode: 'insensitive' } },
                          ],
                      }
                    : {}),
                ...(department ? { department: { name: { contains: department, mode: 'insensitive' } } } : {}),
            },
        },
        include: { user: { include: { department: true } } },
        orderBy: { user: { name: 'asc' } },
        take: limit,
    });

    return ok({ count: profiles.length, employees: profiles.map(employeeIdentity) });
}

async function handleEmployeeKraGoals(args: Record<string, unknown>) {
    const ref = String(args.employee ?? '');
    const period = normalizePeriod(typeof args.period === 'string' ? args.period : 'MONTHLY');
    const kraOnly = args.kraOnly === undefined ? true : Boolean(args.kraOnly);

    const profile = await resolveEmployee(ref);
    if (!profile) return fail(`No employee matched "${ref}".`);

    const { start, end } = getISTDateRangeForPeriod(period);
    const goals = await prisma.employeeGoal.findMany({
        where: {
            employeeId: profile.id,
            ...(kraOnly ? { isKra: true } : {}),
            // goals whose active window overlaps the requested period
            startDate: { lte: end },
            endDate: { gte: start },
        },
        orderBy: [{ weight: 'desc' }, { title: 'asc' }],
    });

    const items = goals.map((g) => ({
        id: g.id,
        title: g.title,
        kra: g.kra,
        unit: g.unit,
        targetValue: g.targetValue,
        currentValue: g.currentValue,
        verifiedValue: g.verifiedValue,
        achievementPercentage: toRatio(g.achievementPercentage),
        weight: g.weight,
        isKra: g.isKra,
        dimension: g.dimension,
        status: g.status,
        window: { start: g.startDate.toISOString(), end: g.endDate.toISOString() },
    }));

    // Weighted achievement across KRA goals (matches the console's headline number).
    const kraGoals = items.filter((g) => g.isKra);
    const totalWeight = kraGoals.reduce((s, g) => s + (g.weight || 0), 0);
    const weightedAchievement = totalWeight
        ? toRatio(kraGoals.reduce((s, g) => s + g.achievementPercentage * (g.weight || 0), 0) / totalWeight)
        : null;

    return ok({
        employee: employeeIdentity(profile),
        period,
        window: { start: start.toISOString(), end: end.toISOString() },
        goalCount: items.length,
        weightedKraAchievement: weightedAchievement,
        goals: items,
    });
}

async function handleAttendanceSummary(args: Record<string, unknown>) {
    const ref = String(args.employee ?? '');
    const profile = await resolveEmployee(ref);
    if (!profile) return fail(`No employee matched "${ref}".`);

    let start: Date;
    let end: Date;
    let label: string;
    const month = typeof args.month === 'string' ? args.month.trim() : '';
    if (/^\d{4}-\d{2}$/.test(month)) {
        // Base a MONTHLY window on the first day of the requested IST month.
        const base = new Date(`${month}-01T00:00:00+05:30`);
        ({ start, end } = getISTDateRangeForPeriod('MONTHLY', base));
        label = month;
    } else {
        const period = normalizePeriod(typeof args.period === 'string' ? args.period : 'MONTHLY');
        ({ start, end } = getISTDateRangeForPeriod(period));
        label = period;
    }

    const records = await prisma.attendance.findMany({
        where: { employeeId: profile.id, date: { gte: start, lte: end } },
        select: { status: true, isLate: true },
    });

    const summary = summarizeAttendance(records.map((r) => ({ status: r.status, isLate: r.isLate })));

    const byStatus: Record<string, number> = {};
    for (const r of records) {
        const s = (r.status || 'UNKNOWN').toUpperCase();
        byStatus[s] = (byStatus[s] || 0) + 1;
    }

    return ok({
        employee: employeeIdentity(profile),
        period: label,
        window: { start: start.toISOString(), end: end.toISOString() },
        recordedDays: records.length,
        ...summary,
        byStatus,
        legend: {
            presentStatuses: [...PRESENT_STATUSES],
            absentStatuses: [...ABSENT_STATUSES],
            note: 'LEAVE / HOLIDAY / WEEKOFF are sanctioned days — neither present nor absent.',
        },
    });
}

async function handlePerformanceIndex(args: Record<string, unknown>) {
    const ref = String(args.employee ?? '');
    const profile = await resolveEmployee(ref);
    if (!profile) return fail(`No employee matched "${ref}".`);

    const period = normalizePeriod(typeof args.period === 'string' ? args.period : 'MONTHLY');
    const periodType = period === 'DAILY' ? 'MONTHLY' : period; // PerformanceIndex has no DAILY bucket
    const label = typeof args.periodLabel === 'string' && args.periodLabel.trim()
        ? args.periodLabel.trim()
        : periodLabel(periodType as Period);

    const idx = await prisma.performanceIndex.findFirst({
        where: { employeeId: profile.id, periodType: periodType as never, period: label },
    });

    if (!idx) {
        return ok({
            employee: employeeIdentity(profile),
            period: label,
            periodType,
            found: false,
            note: 'No PerformanceIndex row yet — the kra-snapshot cron computes these; it may not have run for this period.',
        });
    }

    return ok({
        employee: employeeIdentity(profile),
        period: label,
        periodType,
        found: true,
        scores: {
            achievement: toRatio(idx.achievementScore),
            attendance: toRatio(idx.attendanceScore),
            managerRating: toRatio(idx.managerRatingScore),
            focus: toRatio(idx.focusScore),
            overallIndex: toRatio(idx.overallIndex),
        },
        grade: idx.grade,
        letterRating: idx.letterRating,
        ratingStatus: idx.ratingStatus,
        computedAt: idx.computedAt.toISOString(),
    });
}

async function handleKraRollup(args: Record<string, unknown>) {
    const level = typeof args.level === 'string' && ['TEAM', 'DEPARTMENT', 'COMPANY'].includes(args.level.toUpperCase())
        ? args.level.toUpperCase()
        : 'COMPANY';
    const period = normalizePeriod(typeof args.period === 'string' ? args.period : 'MONTHLY');
    const periodType = period === 'DAILY' ? 'MONTHLY' : period;
    const label = typeof args.periodLabel === 'string' && args.periodLabel.trim()
        ? args.periodLabel.trim()
        : periodLabel(periodType as Period);
    const subject = typeof args.subject === 'string' ? args.subject.trim() : '';

    const rows = await prisma.kraRollup.findMany({
        where: {
            level,
            periodType: periodType as never,
            period: label,
            ...(subject ? { subjectName: { contains: subject, mode: 'insensitive' } } : {}),
        },
        orderBy: { avgIndex: 'desc' },
    });

    return ok({
        level,
        period: label,
        periodType,
        count: rows.length,
        rollups: rows.map((r) => ({
            subjectName: r.subjectName,
            subjectId: r.subjectId,
            employeeCount: r.employeeCount,
            goalCount: r.goalCount,
            avgAchievement: toRatio(r.avgAchievement),
            avgIndex: toRatio(r.avgIndex),
            gradeCounts: r.gradeCounts,
            dimensionAvgs: r.dimensionAvgs,
            computedAt: r.computedAt.toISOString(),
        })),
        note: rows.length
            ? undefined
            : 'No roll-up rows for this period — computeKraRollupsForCompany runs in the kra-snapshot cron.',
    });
}

const HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<ReturnType<typeof ok>>> = {
    list_employees: handleListEmployees,
    employee_kra_goals: handleEmployeeKraGoals,
    attendance_summary: handleAttendanceSummary,
    performance_index: handlePerformanceIndex,
    kra_rollup: handleKraRollup,
};

// --- server wiring -------------------------------------------------------

const server = new Server(
    { name: 'ims2', version: '0.1.0' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const handler = HANDLERS[req.params.name];
    if (!handler) return fail(`Unknown tool: ${req.params.name}`);
    try {
        return await handler((req.params.arguments ?? {}) as Record<string, unknown>);
    } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // stderr only — stdout is the JSON-RPC channel and must stay clean.
    console.error('[ims2-mcp] ready — 5 read-only tools over DATABASE_URL.');
}

main().catch((err) => {
    console.error('[ims2-mcp] fatal:', err);
    process.exit(1);
});
