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
 * The query logic itself lives in src/lib/insights/queries.ts — the SAME module
 * the in-app Insights UI uses — so this server and the dashboard can never drift.
 *
 * Runtime contract:
 *   - the ONLY required env var is DATABASE_URL (same string the app uses);
 *     no app secrets are needed, so this server never imports env-validation.
 *   - run with:  DATABASE_URL=... npm run mcp:server
 *
 * Unlike the app routes, the server passes no companyId, so it queries across
 * every tenant the connection can reach — scope the DATABASE_URL accordingly.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import {
    listEmployees,
    employeeKraGoals,
    attendanceSummary,
    performanceIndex,
    kraRollup,
} from '../src/lib/insights/queries';

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
    // No Prisma logging: with `log: ['error']` Prisma writes error lines to
    // stdout, which for a stdio MCP server is the JSON-RPC channel and must stay
    // pure JSON — a stray "prisma:error" line corrupts the protocol. Errors are
    // already surfaced to the client via each tool's response and to stderr by
    // the fatal handler, so we keep stdout clean here.
    return new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
}

const prisma = makePrisma();

// --- response helpers ----------------------------------------------------

function ok(payload: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }], isError: true };
}

/** Turn a lib result into a tool response, mapping the {notFound} shape to an error. */
function respond(result: { notFound?: boolean; ref?: string } & Record<string, unknown>) {
    if (result.notFound) return fail(`No employee matched "${result.ref}".`);
    return ok(result);
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

// --- handlers (thin adapters over the shared query lib) ------------------

const HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<ReturnType<typeof ok>>> = {
    list_employees: async (a) =>
        ok(await listEmployees(prisma, { query: a.query as string, department: a.department as string, limit: a.limit as number })),
    employee_kra_goals: async (a) =>
        respond(await employeeKraGoals(prisma, { employee: String(a.employee ?? ''), period: a.period as string, kraOnly: a.kraOnly as boolean })),
    attendance_summary: async (a) =>
        respond(await attendanceSummary(prisma, { employee: String(a.employee ?? ''), period: a.period as string, month: a.month as string })),
    performance_index: async (a) =>
        respond(await performanceIndex(prisma, { employee: String(a.employee ?? ''), period: a.period as string, periodLabel: a.periodLabel as string })),
    kra_rollup: async (a) =>
        ok(await kraRollup(prisma, { level: a.level as string, period: a.period as string, periodLabel: a.periodLabel as string, subject: a.subject as string })),
};

// --- server wiring -------------------------------------------------------

const server = new Server({ name: 'ims2', version: '0.1.0' }, { capabilities: { tools: {} } });

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
