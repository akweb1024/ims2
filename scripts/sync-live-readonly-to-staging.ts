import 'dotenv/config';
import { Pool } from 'pg';

type SyncGroup = 'core' | 'hr' | 'crm' | 'finance' | 'all';

type Args = {
    apply: boolean;
    help: boolean;
    limit?: number;
    since?: string;
    tables?: string[];
    groups: SyncGroup[];
};

const APPLY_CONFIRMATION = 'SYNC_LIVE_READONLY_TO_STAGING';

const TABLE_GROUPS: Record<Exclude<SyncGroup, 'all'>, string[]> = {
    core: [
        'Company',
        'Department',
        'Designation',
        'User',
        'EmployeeProfile',
        'EmployeeCompanyDesignation',
    ],
    hr: [
        'Attendance',
        'WorkReport',
        'WorkReportComment',
        'LeaveRequest',
        'LeaveLedger',
        'SalarySlip',
        'EmployeeDocument',
        'PerformanceReview',
    ],
    crm: [
        'CustomerProfile',
        'Institution',
        'AgencyDetails',
        'InstitutionDetails',
        'Subscription',
        'SubscriptionItem',
        'Invoice',
        'Payment',
        'DispatchOrder',
    ],
    finance: [
        'Account',
        'JournalEntry',
        'JournalEntryLine',
        'FinancialRecord',
        'RevenueTransaction',
        'CommissionPayout',
    ],
};

const DEFAULT_GROUPS: SyncGroup[] = ['core', 'hr', 'crm'];
const WRITE_PRIVILEGES = new Set(['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']);

const usage = () => `
Safe live-readonly to staging sync

Required env:
  LIVE_READONLY_DATABASE_URL      Read-only source database URL
  STAGING_DATABASE_URL            Staging/local target database URL
  DATABASE_URL                    Fallback target if STAGING_DATABASE_URL is not set

Optional env:
  SYNC_APPLY_CONFIRM=${APPLY_CONFIRMATION}
  ALLOW_WRITABLE_LIVE_SOURCE=false

Examples:
  npm run db:sync:live:dry-run
  npm run db:sync:live:dry-run -- --group=hr --limit=100
  npm run db:sync:live:apply -- --group=core --group=hr
  tsx scripts/sync-live-readonly-to-staging.ts --tables=Company,User,EmployeeProfile --since=2026-01-01T00:00:00.000Z

Safety:
  - Dry-run by default.
  - Never deletes or truncates target data.
  - Refuses source and target URLs that normalize to the same database.
  - Refuses a live source user with table write grants unless ALLOW_WRITABLE_LIVE_SOURCE=true.
  - --apply additionally requires SYNC_APPLY_CONFIRM=${APPLY_CONFIRMATION}.
`;

function parseArgs(argv: string[]): Args {
    const args: Args = {
        apply: false,
        help: false,
        groups: [],
    };

    for (const arg of argv) {
        if (arg === '--apply') args.apply = true;
        else if (arg === '--dry-run') args.apply = false;
        else if (arg === '--help' || arg === '-h') args.help = true;
        else if (arg.startsWith('--limit=')) {
            const value = Number(arg.slice('--limit='.length));
            if (!Number.isInteger(value) || value <= 0) {
                throw new Error('--limit must be a positive integer');
            }
            args.limit = value;
        } else if (arg.startsWith('--since=')) {
            const since = arg.slice('--since='.length);
            if (Number.isNaN(new Date(since).getTime())) {
                throw new Error('--since must be a valid date string');
            }
            args.since = since;
        } else if (arg.startsWith('--tables=')) {
            args.tables = arg
                .slice('--tables='.length)
                .split(',')
                .map((table) => table.trim())
                .filter(Boolean);
        } else if (arg.startsWith('--group=')) {
            const group = arg.slice('--group='.length) as SyncGroup;
            if (!['core', 'hr', 'crm', 'finance', 'all'].includes(group)) {
                throw new Error(`Unsupported group: ${group}`);
            }
            args.groups.push(group);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

function normalizeDatabaseUrl(value: string) {
    const url = new URL(value);
    url.search = '';
    return `${url.protocol}//${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`;
}

function quoteIdent(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteTable(table: string) {
    return quoteIdent(table);
}

function getTargetUrl() {
    return process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
}

function getRequestedTables(args: Args) {
    if (args.tables?.length) return [...new Set(args.tables)];

    const groups = args.groups.length ? args.groups : DEFAULT_GROUPS;
    const expandedGroups = groups.includes('all')
        ? (Object.keys(TABLE_GROUPS) as Exclude<SyncGroup, 'all'>[])
        : groups as Exclude<SyncGroup, 'all'>[];

    return [
        ...new Set(
            expandedGroups.flatMap((group) => TABLE_GROUPS[group] || []),
        ),
    ];
}

async function getExistingTables(pool: Pool) {
    const result = await pool.query<{ table_name: string }>(
        `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
        `,
    );
    return new Set(result.rows.map((row) => row.table_name));
}

async function getColumns(pool: Pool, table: string) {
    const result = await pool.query<{ column_name: string }>(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position
        `,
        [table],
    );
    return result.rows.map((row) => row.column_name);
}

async function getPrimaryKeyColumns(pool: Pool, table: string) {
    const result = await pool.query<{ column_name: string }>(
        `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
        `,
        [table],
    );
    return result.rows.map((row) => row.column_name);
}

async function assertSourceLooksReadOnly(pool: Pool, tables: string[]) {
    if (process.env.ALLOW_WRITABLE_LIVE_SOURCE === 'true') {
        console.warn('Warning: ALLOW_WRITABLE_LIVE_SOURCE=true, skipping source write-grant refusal.');
        return;
    }

    const result = await pool.query<{ table_name: string; privilege_type: string }>(
        `
        SELECT table_name, privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee = current_user
          AND table_name = ANY($1)
        `,
        [tables],
    );

    const writeGrants = result.rows.filter((row) => WRITE_PRIVILEGES.has(row.privilege_type));
    if (writeGrants.length > 0) {
        const summary = writeGrants
            .slice(0, 10)
            .map((row) => `${row.table_name}:${row.privilege_type}`)
            .join(', ');
        throw new Error(
            `Live source user has write grants on requested tables (${summary}). Use a real read-only DB user or set ALLOW_WRITABLE_LIVE_SOURCE=true after confirming this is not production.`,
        );
    }
}

function buildSelectSql(table: string, columns: string[], args: Args) {
    const params: unknown[] = [];
    const whereParts: string[] = [];

    if (args.since) {
        const dateColumn = ['updatedAt', 'createdAt', 'date'].find((column) => columns.includes(column));
        if (dateColumn) {
            params.push(new Date(args.since));
            whereParts.push(`${quoteIdent(dateColumn)} >= $${params.length}`);
        }
    }

    const orderColumn = ['updatedAt', 'createdAt', 'id'].find((column) => columns.includes(column));
    const sql = [
        `SELECT ${columns.map(quoteIdent).join(', ')}`,
        `FROM ${quoteTable(table)}`,
        whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '',
        orderColumn ? `ORDER BY ${quoteIdent(orderColumn)} ASC` : '',
        args.limit ? `LIMIT ${args.limit}` : '',
    ].filter(Boolean).join(' ');

    return { sql, params };
}

function buildUpsertSql(table: string, columns: string[], primaryKeyColumns: string[]) {
    const insertColumns = columns.map(quoteIdent).join(', ');
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const conflictColumns = primaryKeyColumns.map(quoteIdent).join(', ');
    const updateColumns = columns.filter((column) => !primaryKeyColumns.includes(column));

    if (updateColumns.length === 0) {
        return `
            INSERT INTO ${quoteTable(table)} (${insertColumns})
            VALUES (${placeholders})
            ON CONFLICT (${conflictColumns}) DO NOTHING
        `;
    }

    const updateSet = updateColumns
        .map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`)
        .join(', ');

    return `
        INSERT INTO ${quoteTable(table)} (${insertColumns})
        VALUES (${placeholders})
        ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateSet}
    `;
}

async function syncTable(source: Pool, target: Pool, table: string, args: Args) {
    const columns = await getColumns(source, table);
    const primaryKeyColumns = await getPrimaryKeyColumns(source, table);

    if (columns.length === 0) {
        return { table, selected: 0, written: 0, skipped: true, reason: 'no columns' };
    }

    if (primaryKeyColumns.length === 0) {
        return { table, selected: 0, written: 0, skipped: true, reason: 'no primary key' };
    }

    const { sql, params } = buildSelectSql(table, columns, args);
    const sourceRows = await source.query(sql, params);

    if (!args.apply) {
        return {
            table,
            selected: sourceRows.rowCount || 0,
            written: 0,
            skipped: false,
            reason: 'dry-run',
        };
    }

    const upsertSql = buildUpsertSql(table, columns, primaryKeyColumns);
    let written = 0;

    await target.query('BEGIN');
    try {
        for (const row of sourceRows.rows) {
            const values = columns.map((column) => row[column]);
            await target.query(upsertSql, values);
            written += 1;
        }
        await target.query('COMMIT');
    } catch (error) {
        await target.query('ROLLBACK');
        throw error;
    }

    return {
        table,
        selected: sourceRows.rowCount || 0,
        written,
        skipped: false,
        reason: 'applied',
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(usage());
        return;
    }

    const sourceUrl = process.env.LIVE_READONLY_DATABASE_URL;
    const targetUrl = getTargetUrl();

    if (!sourceUrl) throw new Error('LIVE_READONLY_DATABASE_URL is required');
    if (!targetUrl) throw new Error('STAGING_DATABASE_URL or DATABASE_URL is required for the target');
    if (normalizeDatabaseUrl(sourceUrl) === normalizeDatabaseUrl(targetUrl)) {
        throw new Error('Source and target database URLs point to the same database. Refusing to continue.');
    }

    if (args.apply && process.env.SYNC_APPLY_CONFIRM !== APPLY_CONFIRMATION) {
        throw new Error(`Apply aborted: set SYNC_APPLY_CONFIRM=${APPLY_CONFIRMATION}`);
    }

    const source = new Pool({ connectionString: sourceUrl });
    const target = new Pool({ connectionString: targetUrl });

    try {
        const requestedTables = getRequestedTables(args);
        const [sourceTables, targetTables] = await Promise.all([
            getExistingTables(source),
            getExistingTables(target),
        ]);
        const tables = requestedTables.filter((table) => sourceTables.has(table) && targetTables.has(table));
        const missing = requestedTables.filter((table) => !sourceTables.has(table) || !targetTables.has(table));

        if (missing.length > 0) {
            console.warn(`Skipping missing table(s): ${missing.join(', ')}`);
        }

        await assertSourceLooksReadOnly(source, tables);

        console.log(args.apply ? 'Applying live read-only sync into staging target...' : 'Dry-run live read-only sync...');
        console.log(`Tables: ${tables.join(', ')}`);

        const results = [];
        for (const table of tables) {
            const result = await syncTable(source, target, table, args);
            results.push(result);
            const status = result.skipped ? `skipped (${result.reason})` : `${result.selected} selected, ${result.written} written`;
            console.log(`- ${table}: ${status}`);
        }

        const selected = results.reduce((sum, result) => sum + result.selected, 0);
        const written = results.reduce((sum, result) => sum + result.written, 0);
        console.log(`Done. ${selected} row(s) selected, ${written} row(s) written.`);
    } finally {
        await Promise.allSettled([source.end(), target.end()]);
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
