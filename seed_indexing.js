
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking JournalIndexing records...');
    const indexings = await prisma.journalIndexing.findMany();
    console.log('Found:', indexings);

    if (indexings.length === 0) {
        console.log('Seeding default indexings...');
        await prisma.journalIndexing.createMany({
            data: [
                { id: 'wos-123', name: 'Web of Science (WoS)', code: 'WOS', tier: 'High' },
                { id: 'scopus-456', name: 'Scopus', code: 'SCOPUS', tier: 'High' }
            ]
        });
        console.log('Seeded WOS and SCOPUS.');
    } else {
        const wos = await prisma.journalIndexing.findUnique({ where: { id: 'wos-123' } });
        if (!wos) {
            console.log('Seeding wos-123 specifically...');
            await prisma.journalIndexing.create({
                data: { id: 'wos-123', name: 'Web of Science (Code)', code: 'WOS-FIX', tier: 'High' }
            }).catch(e => console.log('Might exist with different code:', e.message));
        } else {
            console.log('wos-123 already exists.');
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
