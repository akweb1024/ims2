const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('🔄 Running DailyTaskCompletion table migration...');

        const sqlPath = path.join(__dirname, 'create_daily_task_table.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.substring(0, 50) + '...');
                await prisma.$executeRawUnsafe(statement + ';');
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('📊 Verifying table creation...');

        // Verify table exists
        const result = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'DailyTaskCompletion'
        `;

        if (result && result.length > 0) {
            console.log('✅ DailyTaskCompletion table created and verified!');
        } else {
            console.log('⚠️  Table verification failed');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

runMigration()
    .then(() => {
        console.log('\n🎉 Database is ready for Daily Task Tracker!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration error:', error);
        process.exit(1);
    });
