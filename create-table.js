#!/usr/bin/env node

/**
 * Simple script to create DailyTaskCompletion table
 * Run with: node create-table.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function createTable() {
    // Parse DATABASE_URL from .env
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found in environment');
        process.exit(1);
    }

    const client = new Client({
        connectionString: databaseUrl,
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!');

        console.log('\n📊 Creating DailyTaskCompletion table...');

        // Create table
        await client.query(`
            CREATE TABLE IF NOT EXISTS "DailyTaskCompletion" (
                "id" TEXT NOT NULL,
                "employeeId" TEXT NOT NULL,
                "taskId" TEXT NOT NULL,
                "quantity" DOUBLE PRECISION,
                "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "DailyTaskCompletion_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ Table created');

        // Create indexes
        console.log('\n📑 Creating indexes...');

        await client.query(`
            CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_employeeId_idx" 
            ON "DailyTaskCompletion"("employeeId");
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_taskId_idx" 
            ON "DailyTaskCompletion"("taskId");
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_completedAt_idx" 
            ON "DailyTaskCompletion"("completedAt");
        `);

        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "DailyTaskCompletion_employeeId_taskId_completedAt_key" 
            ON "DailyTaskCompletion"("employeeId", "taskId", "completedAt");
        `);

        console.log('✅ Indexes created');

        // Add foreign keys
        console.log('\n🔗 Adding foreign key constraints...');

        try {
            await client.query(`
                ALTER TABLE "DailyTaskCompletion" 
                ADD CONSTRAINT "DailyTaskCompletion_employeeId_fkey" 
                FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") 
                ON DELETE CASCADE ON UPDATE CASCADE;
            `);
            console.log('✅ Employee foreign key added');
        } catch (e) {
            if (e.code === '42710') {
                console.log('ℹ️  Employee foreign key already exists');
            } else {
                throw e;
            }
        }

        try {
            await client.query(`
                ALTER TABLE "DailyTaskCompletion" 
                ADD CONSTRAINT "DailyTaskCompletion_taskId_fkey" 
                FOREIGN KEY ("taskId") REFERENCES "EmployeeTaskTemplate"("id") 
                ON DELETE CASCADE ON UPDATE CASCADE;
            `);
            console.log('✅ Task foreign key added');
        } catch (e) {
            if (e.code === '42710') {
                console.log('ℹ️  Task foreign key already exists');
            } else {
                throw e;
            }
        }

        // Verify table
        console.log('\n🔍 Verifying table...');
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'DailyTaskCompletion'
            ORDER BY ordinal_position;
        `);

        console.log('\n✅ Table structure:');
        result.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n🎉 DailyTaskCompletion table is ready!');
        console.log('✅ You can now use the Daily Task Tracker feature');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code) {
            console.error(`   Error code: ${error.code}`);
        }
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n👋 Database connection closed');
    }
}

createTable();
