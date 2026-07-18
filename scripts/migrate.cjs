#!/usr/bin/env node
/*
 * Minimal migration tool for the SLIM production image.
 *
 * The production Docker image ships the generated Prisma client and the `pg`
 * driver, but NOT the Prisma CLI (and no tsx / dotenv). So `prisma migrate
 * deploy` cannot run there — which is why migrations have been applied by hand
 * with raw psql, and why `_prisma_migrations` has drifted behind the schema.
 *
 * This script reconciles the migration folders baked into the image
 * (prisma/migrations/*) against Prisma's own `_prisma_migrations` bookkeeping
 * table using nothing but `pg`. It records rows exactly the way Prisma does
 * (sha256 checksum of migration.sql), so a real `prisma migrate` from a full
 * environment still recognises the history.
 *
 * Subcommands:
 *   status              List applied vs pending migrations.
 *                       Exit 0 = none pending · 3 = pending · 1 = error.
 *   deploy              Apply every pending migration (each in its own
 *                       transaction) and record it. Exit 0 on success
 *                       (including "nothing to do"), 1 on failure.
 *   resolve <name...>   Mark migrations as applied WITHOUT running their SQL
 *                       (like `prisma migrate resolve --applied`). Use to
 *                       reconcile schema that was already applied out-of-band.
 *                       ONLY use on migrations you have confirmed are live.
 *
 * Run as:  node scripts/migrate.cjs <command>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

const out = (msg) => process.stdout.write(`[migrate] ${msg}\n`);
const err = (msg) => process.stderr.write(`[migrate] ${msg}\n`);

/**
 * Migration folder names (those with a migration.sql), sorted lexicographically.
 * The timestamp prefix makes lexicographic order == chronological apply order,
 * matching Prisma.
 */
function localMigrations() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return [];
    return fs
        .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, 'migration.sql')))
        .sort();
}

const readSql = (name) => fs.readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
const checksum = (sql) => crypto.createHash('sha256').update(sql, 'utf8').digest('hex');

function newClient() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    // Mirror the SSL handling in src/lib/prisma.ts.
    const ssl =
        url.includes('sslmode=require') || url.includes('ssl=true')
            ? { rejectUnauthorized: false }
            : false;
    return new Client({ connectionString: url, ssl });
}

async function withClient(fn) {
    const client = newClient();
    await client.connect();
    try {
        return await fn(client);
    } finally {
        await client.end().catch(() => {});
    }
}

/** Set of migration names recorded as fully applied (finished, not rolled back). */
async function appliedSet(client) {
    try {
        const { rows } = await client.query(
            `SELECT migration_name FROM "_prisma_migrations"
              WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
        );
        return new Set(rows.map((r) => r.migration_name));
    } catch (e) {
        if (e && e.code === '42P01') return new Set(); // undefined_table — fresh DB
        throw e;
    }
}

/** Existing bookkeeping rows for one migration name (0, 1, or several). */
async function existingRows(client, name) {
    const { rows } = await client.query(
        `SELECT id, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1`,
        [name]
    );
    return rows;
}

/** Prisma's own DDL for the bookkeeping table — no-op if it already exists. */
async function ensureTable(client) {
    await client.query(
        `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
            "id" varchar(36) NOT NULL,
            "checksum" varchar(64) NOT NULL,
            "finished_at" timestamptz,
            "migration_name" varchar(255) NOT NULL,
            "logs" text,
            "rolled_back_at" timestamptz,
            "started_at" timestamptz NOT NULL DEFAULT now(),
            "applied_steps_count" integer NOT NULL DEFAULT 0,
            CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
        )`
    );
}

/**
 * Record a migration as applied. If a dangling unfinished row exists (a prior
 * failed/partial attempt), finish it in place; otherwise insert a fresh row.
 * `ran` distinguishes "we executed the SQL" (deploy) from "already present,
 * just recording" (resolve) via applied_steps_count, matching Prisma.
 */
async function markApplied(client, name, ran) {
    const upd = await client.query(
        `UPDATE "_prisma_migrations"
            SET finished_at = now(), rolled_back_at = NULL,
                applied_steps_count = GREATEST(applied_steps_count, $2)
          WHERE migration_name = $1 AND finished_at IS NULL`,
        [name, ran ? 1 : 0]
    );
    if (upd.rowCount > 0) return;
    await client.query(
        `INSERT INTO "_prisma_migrations"
            (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), now(), $4)`,
        [crypto.randomUUID(), checksum(readSql(name)), name, ran ? 1 : 0]
    );
}

async function cmdStatus() {
    return withClient(async (client) => {
        const local = localMigrations();
        const applied = await appliedSet(client);
        const pending = local.filter((n) => !applied.has(n));
        const ahead = [...applied].filter((n) => !local.includes(n)).sort();

        out(`${local.length} migration(s) in image · ${applied.size} recorded applied.`);
        if (ahead.length) {
            err(
                `WARNING: ${ahead.length} migration(s) recorded in the DB but absent from this image ` +
                    `(DB ahead of code): ${ahead.join(', ')}`
            );
        }
        if (!pending.length) {
            out('OK — no pending migrations.');
            return 0;
        }
        err('');
        err(`PENDING (${pending.length}) — present in the image but NOT applied to the database:`);
        for (const n of pending) err(`    • ${n}`);
        err('');
        return 3;
    });
}

async function cmdDeploy() {
    return withClient(async (client) => {
        await ensureTable(client);
        const applied = await appliedSet(client);
        const pending = localMigrations().filter((n) => !applied.has(n));
        if (!pending.length) {
            out('deploy: nothing to apply.');
            return 0;
        }
        out(`deploy: applying ${pending.length} pending migration(s)...`);
        for (const name of pending) {
            const rows = await existingRows(client, name);
            const dangling = rows.some((r) => !r.finished_at && !r.rolled_back_at);
            if (dangling) {
                err(
                    `deploy: ${name} has a dangling unfinished record — a prior attempt may have ` +
                        `partially applied it. Resolve it manually before retrying.`
                );
                return 1;
            }
            out(`  → ${name}`);
            try {
                await client.query('BEGIN');
                await client.query(readSql(name));
                await markApplied(client, name, true);
                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK').catch(() => {});
                err(`deploy: FAILED on ${name}: ${e.message}`);
                return 1;
            }
        }
        out('deploy: done.');
        return 0;
    });
}

async function cmdResolve(names) {
    if (!names.length) {
        err('resolve: pass one or more migration folder names.');
        return 1;
    }
    return withClient(async (client) => {
        await ensureTable(client);
        const local = new Set(localMigrations());
        const applied = await appliedSet(client);
        for (const name of names) {
            if (!local.has(name)) {
                err(`resolve: "${name}" is not a known migration folder — aborting.`);
                return 1;
            }
            if (applied.has(name)) {
                out(`resolve: ${name} already recorded — skipping.`);
                continue;
            }
            await markApplied(client, name, false);
            out(`resolve: recorded ${name} as applied (schema assumed already present).`);
        }
        return 0;
    });
}

async function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    switch (cmd) {
        case 'status':
            return cmdStatus();
        case 'deploy':
            return cmdDeploy();
        case 'resolve':
            return cmdResolve(rest.filter((a) => a !== '--applied'));
        default:
            err(`Unknown command "${cmd || ''}". Use: status | deploy | resolve <name...>`);
            return 1;
    }
}

main()
    .then((code) => process.exit(typeof code === 'number' ? code : 0))
    .catch((e) => {
        err(`error: ${e && e.message ? e.message : e}`);
        process.exit(1);
    });
