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

## Design notes

- **Read-only by construction** — there are no write tools; every handler only
  issues `findMany` / `findFirst`.
- **Self-contained** — it builds its own Prisma client from `DATABASE_URL` and
  deliberately does *not* import the app's `env-validation`, so it runs without
  the full app secret set.
- **Single source of truth** — IST windows (`getISTDateRangeForPeriod`) and
  attendance folding (`summarizeAttendance`) are imported from `src/lib`, so the
  server can't drift from the dashboards.
- **No credentials in code** — the connection string is read from the
  environment; nothing is hard-coded.
