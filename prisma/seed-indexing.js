const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Master Indexing Data...');

    // Web of Science
    const wos = await prisma.journalIndexing.upsert({
        where: { code: 'WOS' },
        update: {},
        create: {
            id: 'wos-123',
            name: 'Web of Science (WoS)',
            code: 'WOS'
        }
    });

    // Scopus
    const scopus = await prisma.journalIndexing.upsert({
        where: { code: 'SCOPUS' },
        update: {},
        create: {
            id: 'scopus-456',
            name: 'Scopus',
            code: 'SCOPUS'
        }
    });

    console.log('Seeding Complete:', { wos, scopus });
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
