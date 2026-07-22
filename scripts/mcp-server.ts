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
 *     no app secrets are needed, so the read-only server never imports
 *     env-validation.
 *   - run with:  DATABASE_URL=... npm run mcp:server
 *
 * WRITE MODE (opt-in): setting DATABASE_URL_RW + MCP_ADMIN_EMAIL additionally
 * registers the KRA-assignment write tools (propose_kra_goals /
 * approve_proposal / reject_proposal / list_mcp_proposals). Writes are
 * two-layer gated: propose only records a PENDING McpProposal + preview;
 * approve_proposal is the sole execution path and requires the admin's
 * explicit go-ahead (see src/lib/kra/mcp-proposals.ts). Read tools stay on the
 * read-only DATABASE_URL; only the write module uses the RW connection.
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

const RO_URL = process.env.DATABASE_URL;
const RW_URL = process.env.DATABASE_URL_RW;
const WRITE_MODE = Boolean(RW_URL);

function makePrisma(url: string | undefined): PrismaClient {
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

const prisma = makePrisma(RO_URL);

// Write module, loaded lazily in main() only when WRITE_MODE is on. It pulls
// the app's prisma singleton, which must bind to the RW url — see main().
type ProposalsModule = typeof import('../src/lib/kra/mcp-proposals');
let proposals: ProposalsModule | null = null;

function writeMod(): ProposalsModule {
    if (!proposals) {
        throw new Error('Write tools are disabled: set DATABASE_URL_RW and MCP_ADMIN_EMAIL to enable them.');
    }
    return proposals;
}

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

const WRITE_TOOLS: Tool[] = [
    {
        name: 'propose_kra_goals',
        description:
            'STEP 1 of assigning KRA/KPI goals. Resolves the metric + employees, validates targets, and records a PENDING proposal — it creates NOTHING. Returns a preview and a proposalId. You MUST show the preview to the admin and wait for their explicit yes before calling approve_proposal. The metric must already exist (this server never creates metrics).',
        inputSchema: {
            type: 'object',
            properties: {
                instruction: { type: 'string', description: "The admin's instruction, verbatim — stored in the audit trail." },
                metric: { type: 'string', description: 'Existing metric: id or exact name (case-insensitive).' },
                employees: {
                    type: 'array',
                    description: 'Employees to assign the goal to.',
                    items: {
                        type: 'object',
                        properties: {
                            employee: { type: 'string', description: 'Employee name, email, profile id, or employee code.' },
                            target: { type: 'number', description: 'Per-employee target (overrides the proposal-level target).' },
                            dailyTarget: { type: 'number', description: 'Optional per-day pace target.' },
                        },
                        required: ['employee'],
                    },
                },
                target: { type: 'number', description: 'Default target for every employee without an override.' },
                period: {
                    type: 'string',
                    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'],
                    description: 'Goal period (default MONTHLY; window = the current period).',
                },
                title: { type: 'string', description: 'Goal title (defaults to the metric name).' },
                isKra: { type: 'boolean', description: 'Counts toward the weighted KRA score (default true).' },
                weight: { type: 'number', description: 'Weight in the KRA score (default 1).' },
                reviewer: { type: 'string', description: 'Optional reviewer (same reference forms as employees).' },
            },
            required: ['instruction', 'metric', 'employees'],
        },
    },
    {
        name: 'approve_proposal',
        description:
            'STEP 2 — executes a PENDING proposal (creates/updates the goals) and marks it EXECUTED. ONLY call this after the human admin has explicitly approved the exact preview shown to them; never infer approval. confirm must be the literal string "APPROVE".',
        inputSchema: {
            type: 'object',
            properties: {
                proposalId: { type: 'string', description: 'The id returned by propose_kra_goals.' },
                confirm: { type: 'string', description: 'Must be exactly "APPROVE".' },
            },
            required: ['proposalId', 'confirm'],
        },
    },
    {
        name: 'reject_proposal',
        description: 'Marks a PENDING proposal REJECTED (audit-trail entry, nothing executed). Use when the admin declines or changes their mind.',
        inputSchema: {
            type: 'object',
            properties: {
                proposalId: { type: 'string' },
                reason: { type: 'string', description: "The admin's reason, if given." },
            },
            required: ['proposalId'],
        },
    },
    {
        name: 'list_mcp_proposals',
        description: 'Recent MCP proposals with status (PENDING / EXECUTED / REJECTED / FAILED), previews and execution results — the audit trail.',
        inputSchema: {
            type: 'object',
            properties: { limit: { type: 'number', description: 'Max rows (default 20, max 100).' } },
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
    propose_kra_goals: async (a) => {
        const mod = writeMod();
        const actor = await mod.requireMcpAdmin(process.env.MCP_ADMIN_EMAIL);
        return ok(await mod.proposeAssignGoals(actor, a as never));
    },
    approve_proposal: async (a) => {
        const mod = writeMod();
        const actor = await mod.requireMcpAdmin(process.env.MCP_ADMIN_EMAIL);
        return ok(await mod.approveProposal(actor, String(a.proposalId ?? ''), String(a.confirm ?? '')));
    },
    reject_proposal: async (a) => {
        const mod = writeMod();
        const actor = await mod.requireMcpAdmin(process.env.MCP_ADMIN_EMAIL);
        return ok(await mod.rejectProposal(actor, String(a.proposalId ?? ''), a.reason as string | undefined));
    },
    list_mcp_proposals: async (a) => ok(await writeMod().listProposals(a.limit as number | undefined)),
};

// --- server wiring -------------------------------------------------------

const server = new Server({ name: 'ims2', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: WRITE_MODE ? [...TOOLS, ...WRITE_TOOLS] : TOOLS,
}));

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
    if (WRITE_MODE) {
        // The write module reuses the app's goal service, which binds the app
        // prisma singleton to process.env.DATABASE_URL at import time — point
        // it at the RW role before the dynamic import. The read tools above
        // keep their own client on the read-only url. env-validation needs a
        // JWT_SECRET to exist; nothing in this process signs tokens, and the
        // singleton must stay silent on stdout (JSON-RPC channel).
        process.env.DATABASE_URL = RW_URL;
        process.env.JWT_SECRET ||= 'mcp-server-local-unused';
        process.env.PRISMA_LOG_SILENT = '1';
        proposals = await import('../src/lib/kra/mcp-proposals');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    // stderr only — stdout is the JSON-RPC channel and must stay clean.
    console.error(
        WRITE_MODE
            ? `[ims2-mcp] ready — ${TOOLS.length} read tools + ${WRITE_TOOLS.length} write tools (two-layer approval) as ${process.env.MCP_ADMIN_EMAIL ?? 'UNSET ADMIN'}.`
            : `[ims2-mcp] ready — ${TOOLS.length} read-only tools over DATABASE_URL.`,
    );
}

main().catch((err) => {
    console.error('[ims2-mcp] fatal:', err);
    process.exit(1);
});
