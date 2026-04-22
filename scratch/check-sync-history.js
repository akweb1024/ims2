const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching sync history...');
    try {
        const syncs = await prisma.razorpaySync.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log('Recent Razorpay Syncs:');
        console.table(syncs.map(s => ({
            id: s.id,
            status: s.status,
            syncedCount: s.syncedCount,
            lastSyncAt: s.lastSyncAt,
            createdAt: s.createdAt,
            error: s.error ? s.error.substring(0, 50) + '...' : null
        })));
        
        const configs = await prisma.appConfiguration.findMany({
            where: { category: 'PAYMENT_GATEWAY' }
        });
        console.log('\nPayment Gateway Configs:');
        console.table(configs.map(c => ({
            companyId: c.companyId,
            key: c.key,
            value: c.value ? c.value.substring(0, 10) + '...' : null,
            isActive: c.isActive
        })));

    } catch (e) {
        console.error('Query Failed:', e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
