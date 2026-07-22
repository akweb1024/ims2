# ims2 MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes **read-only** views of the IMS database as tools an AI client (Claude
Desktop, Claude Code, Cursor, …) can call.

Source: [`scripts/mcp-server.ts`](./mcp-server.ts). It speaks JSON-RPC over
stdio and never writes to the database.

## Tools

| Tool | What it answers |
| --- | --- |
| `list_employees` | Find people by name / email / department. Returns identity cards (profile id, code, name, email, designation, department). |
| `employee_kra_goals` | An employee's goals for a period — target vs current/verified value, achievement %, weight, KRA flag, verification status, plus the weighted KRA achievement. |
| `attendance_summary` | Present / late / absent person-day counts for one employee over a period, folded with the same status rules the dashboard uses, plus a per-status breakdown. |
| `performance_index` | The cron-computed `PerformanceIndex` for a period — achievement / attendance / manager-rating / focus sub-scores, overall index, grade, letter rating. |
| `kra_rollup` | TEAM / DEPARTMENT / COMPANY roll-ups for a period — employee & goal counts, average achievement, average index, grade counts, dimension averages. |

All date windows are computed in **IST** using the app's own helpers, so the
numbers line up with what the dashboards show. `PerformanceIndex` and
`KraRollup` are produced by the `kra-snapshot` cron, so those tools report
`found: false` / an empty list until that job has run for the period.

## Running it

The only required environment variable is `DATABASE_URL` (the same connection
string the app uses). No app secrets are needed.

```bash
DATABASE_URL='postgresql://user:pass@host:5432/db' npm run mcp:server
```

The process talks JSON-RPC on stdout, so run it *from* an MCP client rather than
by hand. Logs go to stderr.

## Wiring it into a client

### Claude Code — project config (checked in)

A project-scoped [`.mcp.json`](../.mcp.json) is committed at the repo root, so
Claude Code auto-detects the server when run from the project. It reads the
connection string from your shell's `DATABASE_URL` (`${DATABASE_URL}`) — nothing
is hard-coded. Just export it and open Claude Code in the repo:

```bash
export DATABASE_URL='postgresql://user:pass@host:5432/db'
claude   # approve the `ims2` server on first use
```

### Claude Desktop / Claude Code (manual `mcp.json` / `claude_desktop_config.json`)

```jsonc
{
  "mcpServers": {
    "ims2": {
      "command": "npx",
      "args": ["tsx", "scripts/mcp-server.ts"],
      "cwd": "/absolute/path/to/ims2",
      "env": {
        "DATABASE_URL": "postgresql://user:pass@host:5432/db"
      }
    }
  }
}
```

(Or point `command` at `npm` with `args: ["run", "mcp:server"]`.)

### Example prompts once connected

- "List the employees in the Publication department."
- "What are Priya's KRA goals this month and how is she tracking?"
- "Give me the attendance summary for amit@conwiz.in for 2026-06."
- "Show the COMPANY KRA roll-up for this quarter."

## Write mode (opt-in): KRA assignment with two-layer approval

By default the server is read-only. Setting **both** of these enables four
additional tools:

```bash
DATABASE_URL=...        # read-only connection (as before)
DATABASE_URL_RW=...     # separate connection with DML rights — enables write mode
MCP_ADMIN_EMAIL=...     # the acting admin; must be an ADMIN/SUPER_ADMIN/HR/HR_MANAGER user
```

| Tool | What it does |
| --- | --- |
| `propose_kra_goals` | Resolves metric + employees, validates targets, stores a **PENDING `McpProposal`** and returns a preview. Creates nothing. |
| `approve_proposal` | The **only** execution path. Requires the id from propose plus the literal `confirm: "APPROVE"`, then creates/updates the goals via `upsertGoal()` (same dedupe/carry-forward/notify as the Assign UI) and marks the proposal EXECUTED. |
| `reject_proposal` | Marks a PENDING proposal REJECTED (audit entry, nothing executed). |
| `list_mcp_proposals` | The audit trail — recent proposals with status and results. |

Approval is two-layer:

1. **Chat** — the assistant must show the preview and wait for the admin's
   explicit yes before calling `approve_proposal`. A proposal whose period
   window has already ended is refused as stale.
2. **App** — every proposal row is visible to admins at
   `/dashboard/hr-management/kra/mcp-log` (linked from the KRA console), with
   preview, decision time and per-employee outcome.

Notes:

- The metric must already exist — the server never creates metric definitions.
- `proposedBy`/`assignedById` are stamped with the `MCP_ADMIN_EMAIL` user, so
  provenance matches a manual assignment by that admin.
- Point `DATABASE_URL_RW` at a **dedicated DML-only role** (no DDL); keep the
  plain `DATABASE_URL` on a read-only role so the read tools stay physically
  read-only.

## Design notes

- **Read-only by construction** (without `DATABASE_URL_RW`) — the base five
  handlers only issue `findMany` / `findFirst`.
- **Self-contained** — it builds its own Prisma client from `DATABASE_URL` and
  deliberately does *not* import the app's `env-validation`, so it runs without
  the full app secret set.
- **Single source of truth** — IST windows (`getISTDateRangeForPeriod`) and
  attendance folding (`summarizeAttendance`) are imported from `src/lib`, so the
  server can't drift from the dashboards.
- **No credentials in code** — the connection string is read from the
  environment; nothing is hard-coded.
