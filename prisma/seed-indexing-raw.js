const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.split('?')[0] + '?sslmode=disable'
});

async function main() {
    console.log('Seeding via raw PG...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Upsert WOS
        await client.query(`
            INSERT INTO "JournalIndexing" ("id", "name", "code", "createdAt", "updatedAt")
            VALUES ('wos-123', 'Web of Science (WoS)', 'WOS', NOW(), NOW())
            ON CONFLICT ("code") DO NOTHING;
        `);

        // Upsert SCOPUS
        await client.query(`
            INSERT INTO "JournalIndexing" ("id", "name", "code", "createdAt", "updatedAt")
            VALUES ('scopus-456', 'Scopus', 'SCOPUS', NOW(), NOW())
            ON CONFLICT ("code") DO NOTHING;
        `);

        await client.query('COMMIT');
        console.log('Seeding Complete.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
